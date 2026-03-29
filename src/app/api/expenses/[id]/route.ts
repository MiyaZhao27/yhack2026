import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "../../../../auth";
import { connectDatabase } from "../../../../server/config/db";
import { Expense } from "../../../../server/models/Expense";
import { getSuiteBalances } from "../../../../server/services/balanceService";
import { recomputeNetting } from "../../../../server/services/settlementService";
import {
  computeEqualSplits,
  computeExactSplits,
  computeItemizedSplits,
  computePercentageSplits,
  validateExactSplits,
  validatePercentageSplits,
} from "../../../../lib/finance/calculations";

async function getCurrentUserContext() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ? String(session.user.id) : "";
  const suiteId = session?.user?.suiteId ? String(session.user.suiteId) : "";

  if (!userId || !suiteId) return null;
  return { userId, suiteId };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDatabase();

  const currentUser = await getCurrentUserContext();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const current = (await Expense.findById(id).lean()) as any;
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentSuiteId = String(current.suiteId);
  const currentPaidBy = String(current.paidBy);
  const currentParticipants = (current.participants ?? []).map((pid: unknown) => String(pid));
  const isInvolvedInCurrent =
    currentPaidBy === currentUser.userId || currentParticipants.includes(currentUser.userId);

  if (currentSuiteId !== currentUser.suiteId || !isInvolvedInCurrent) {
    return NextResponse.json(
      { error: "You can only update expenses that involve you." },
      { status: 403 }
    );
  }

  const amount = body.amount ?? current.amount;
  const participants = (body.participants ?? current.participants).map((pid: unknown) =>
    String(pid)
  );
  const paidBy = String(body.paidBy ?? current.paidBy);
  const splitMethod = body.splitMethod ?? current.splitMethod ?? "equal";
  const splits = body.splits;
  const items = body.items ?? current.items;
  const isInvolvedInUpdated =
    paidBy === currentUser.userId || participants.includes(currentUser.userId);

  if (!isInvolvedInUpdated) {
    return NextResponse.json(
      { error: "You can only save expense changes if the expense still involves you." },
      { status: 403 }
    );
  }

  let computedSplits;
  if (splitMethod === "equal") {
    computedSplits = computeEqualSplits(amount, participants);
  } else if (splitMethod === "exact" && splits) {
    const validation = validateExactSplits(splits, amount);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });
    computedSplits = computeExactSplits(splits);
  } else if (splitMethod === "percentage" && splits) {
    const validation = validatePercentageSplits(splits);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });
    computedSplits = computePercentageSplits(amount, splits);
  } else if (splitMethod === "itemized") {
    computedSplits = computeItemizedSplits(items);
  } else {
    computedSplits = current.splits;
  }

  const expense = await Expense.findByIdAndUpdate(
    id,
    {
      title: body.title ?? current.title,
      amount,
      paidBy,
      participants,
      splitMethod,
      splits: computedSplits,
      items,
      date: body.date ? new Date(body.date) : current.date,
    },
    { new: true }
  ).lean();

  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await recomputeNetting(String((expense as any).suiteId));
  const balanceData = await getSuiteBalances(String((expense as any).suiteId), currentUser.userId);
  return NextResponse.json({ expense, ...balanceData });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDatabase();

  const currentUser = await getCurrentUserContext();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const expense = (await Expense.findById(id).lean()) as any;
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expenseSuiteId = String(expense.suiteId);
  const isInvolved =
    String(expense.paidBy) === currentUser.userId ||
    (expense.participants ?? []).some((pid: unknown) => String(pid) === currentUser.userId);

  if (expenseSuiteId !== currentUser.suiteId || !isInvolved) {
    return NextResponse.json(
      { error: "You can only delete expenses that involve you." },
      { status: 403 }
    );
  }

  await Expense.findByIdAndDelete(id);
  await recomputeNetting(expenseSuiteId);
  const balanceData = await getSuiteBalances(expenseSuiteId, currentUser.userId);
  return NextResponse.json(balanceData);
}
