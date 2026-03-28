import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "../../../server/config/db";
import { Expense } from "../../../server/models/Expense";
import { getSuiteBalances } from "../../../server/services/balanceService";
<<<<<<< HEAD
import {
  computeEqualSplits,
  computeExactSplits,
  computeItemizedSplits,
  computePercentageSplits,
  validateExactSplits,
  validatePercentageSplits,
} from "../../../lib/finance/calculations";
=======
>>>>>>> origin/lauren/tasks

export async function GET(request: NextRequest) {
  await connectDatabase();

  const suiteId = request.nextUrl.searchParams.get("suiteId");
  const expenses = (await Expense.find(suiteId ? { suiteId } : {})
    .sort({ createdAt: -1 })
    .lean()) as any[];

  return NextResponse.json(expenses);
}

export async function POST(request: NextRequest) {
  await connectDatabase();

<<<<<<< HEAD
  const body = await request.json();
  const { suiteId, title, amount, paidBy, participants, splitMethod, splits, items, date } = body;

  let computedSplits;
  if (splitMethod === "equal") {
    computedSplits = computeEqualSplits(amount, participants);
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
    computedSplits = computeEqualSplits(amount, participants);
  }

  const expense = await Expense.create({
    suiteId,
    title,
    amount,
    paidBy,
    participants,
    splitMethod: splitMethod ?? "equal",
    splits: computedSplits,
    items: items ?? [],
    date: date ? new Date(date) : new Date(),
  });

  const balanceData = await getSuiteBalances(String(expense.suiteId));
=======
  const expense = await Expense.create({
    ...(await request.json()),
    splitType: "equal",
  });
  const balanceData = await getSuiteBalances(String(expense.suiteId));

>>>>>>> origin/lauren/tasks
  return NextResponse.json({ expense, ...balanceData }, { status: 201 });
}
