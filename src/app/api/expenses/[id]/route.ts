import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "../../../../server/config/db";
import { Expense } from "../../../../server/models/Expense";
import { getSuiteBalances } from "../../../../server/services/balanceService";
import {
  computeEqualSplits,
  computeExactSplits,
  computeItemizedSplits,
  computePercentageSplits,
  validateExactSplits,
  validatePercentageSplits,
} from "../../../../lib/finance/calculations";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDatabase();

  const { id } = await context.params;
  const body = await request.json();
  const current = (await Expense.findById(id).lean()) as any;
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const amount = body.amount ?? current.amount;
  const participants = body.participants ?? current.participants.map(String);
  const splitMethod = body.splitMethod ?? current.splitMethod ?? "equal";
  const splits = body.splits;
  const items = body.items ?? current.items;

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
      paidBy: body.paidBy ?? current.paidBy,
      participants,
      splitMethod,
      splits: computedSplits,
      items,
      date: body.date ? new Date(body.date) : current.date,
    },
    { new: true }
  ).lean();

  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const balanceData = await getSuiteBalances(String((expense as any).suiteId));
  return NextResponse.json({ expense, ...balanceData });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDatabase();

  const { id } = await context.params;
  const expense = (await Expense.findByIdAndDelete(id).lean()) as any;
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const balanceData = await getSuiteBalances(String(expense.suiteId));
  return NextResponse.json(balanceData);
}
