import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "../../../../server/config/db";
import { Expense } from "../../../../server/models/Expense";
import { getSuiteBalances } from "../../../../server/services/balanceService";
import { computeEqualSplits } from "../../../../lib/finance/calculations";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDatabase();

  const { id } = await context.params;
  const body = await request.json();
  const current = (await Expense.findById(id).lean()) as any;
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newAmount = body.amount !== undefined ? body.amount : current.amount;
  const splitMethod: string = current.splitMethod || "equal";
  const participants: string[] = current.participants.map(String);

  // Recompute splits when amount changes for equal/itemized
  let updatedSplits = current.splits;
  if (body.amount !== undefined && body.amount !== current.amount) {
    if (splitMethod === "equal") {
      updatedSplits = computeEqualSplits(newAmount, participants);
    } else if (splitMethod === "itemized" && current.items?.length) {
      const scaleFactor = newAmount / current.amount;
      updatedSplits = current.splits.map((s: any) => ({
        ...s,
        owedAmount: Number((s.owedAmount * scaleFactor).toFixed(2)),
      }));
    }
    // For exact/percentage, keep splits unchanged — user should delete + re-add
  }

  const expense = await Expense.findByIdAndUpdate(
    id,
    { ...body, splits: updatedSplits },
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
