import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "../../../auth";
import { connectDatabase } from "../../../server/config/db";
import { Expense } from "../../../server/models/Expense";
import { getSuiteBalances } from "../../../server/services/balanceService";
import { recomputeNetting } from "../../../server/services/settlementService";
import {
  computeEqualSplits,
  computeExactSplits,
  computeItemizedSplits,
  computePercentageSplits,
  validateExactSplits,
  validatePercentageSplits,
} from "../../../lib/finance/calculations";

async function getCurrentUserContext() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ? String(session.user.id) : "";
  const suiteId = session?.user?.suiteId ? String(session.user.suiteId) : "";

  if (!userId || !suiteId) return null;
  return { userId, suiteId };
}

export async function GET(request: NextRequest) {
  await connectDatabase();

  const current = await getCurrentUserContext();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestedSuiteId = request.nextUrl.searchParams.get("suiteId");
  if (requestedSuiteId && requestedSuiteId !== current.suiteId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const suiteId = requestedSuiteId ?? current.suiteId;
  const expenses = (await Expense.find({
    suiteId,
    $or: [{ paidBy: current.userId }, { participants: current.userId }],
  })
    .sort({ createdAt: -1 })
    .lean()) as any[];

  return NextResponse.json(expenses);
}

export async function POST(request: NextRequest) {
  await connectDatabase();

  const body = await request.json();
  const { suiteId, title, amount, paidBy, participants, splitMethod, splits, items, date } = body;

  const current = await getCurrentUserContext();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const participantIds = (participants ?? []).map((id: unknown) => String(id));
  if (suiteId !== current.suiteId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (String(paidBy) !== current.userId && !participantIds.includes(current.userId)) {
    return NextResponse.json(
      { error: "You can only create expenses that involve you." },
      { status: 403 }
    );
  }

  let computedSplits;
  if (splitMethod === "equal") {
    computedSplits = computeEqualSplits(amount, participantIds);
  } else if (splitMethod === "exact") {
    const validation = validateExactSplits(splits, amount);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    computedSplits = computeExactSplits(splits);
  } else if (splitMethod === "percentage") {
    const validation = validatePercentageSplits(splits);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    computedSplits = computePercentageSplits(amount, splits);
  } else if (splitMethod === "itemized") {
    computedSplits = computeItemizedSplits(items);
  } else {
    computedSplits = computeEqualSplits(amount, participantIds);
  }

  const expense = await Expense.create({
    suiteId,
    title,
    amount,
    paidBy,
    participants: participantIds,
    splitMethod: splitMethod ?? "equal",
    splits: computedSplits,
    items: items ?? [],
    date: date ? new Date(date) : new Date(),
  });

  await recomputeNetting(String(expense.suiteId));
  const balanceData = await getSuiteBalances(String(expense.suiteId), current.userId);
  return NextResponse.json({ expense, ...balanceData }, { status: 201 });
}
