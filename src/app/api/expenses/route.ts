import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "../../../server/config/db";
import { Expense } from "../../../server/models/Expense";
import { getSuiteBalances } from "../../../server/services/balanceService";

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

  const expense = await Expense.create({
    ...(await request.json()),
    splitType: "equal",
  });
  const balanceData = await getSuiteBalances(String(expense.suiteId));

  return NextResponse.json({ expense, ...balanceData }, { status: 201 });
}
