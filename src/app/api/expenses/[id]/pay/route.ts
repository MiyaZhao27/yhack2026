import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "../../../../../server/config/db";
import { Expense } from "../../../../../server/models/Expense";
import { getSuiteBalances } from "../../../../../server/services/balanceService";

// POST /api/expenses/:id/pay  { participantId }
// Toggles paidAt on the matching split. Payer's own split cannot be toggled.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDatabase();

  const { id } = await context.params;
  const { participantId } = await request.json();

  const expense = await Expense.findById(id);
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const paidById = String(expense.paidBy);
  if (participantId === paidById) {
    return NextResponse.json(
      { error: "Cannot toggle payment for the payer's own split" },
      { status: 400 }
    );
  }

  const split = expense.splits.find((s: any) => String(s.participantId) === participantId);
  if (!split) return NextResponse.json({ error: "Split not found" }, { status: 404 });

  // Toggle: null → now, date → null
  (split as any).paidAt = split.paidAt ? null : new Date();
  await expense.save();

  const updatedExpense = await Expense.findById(id).lean();
  const balanceData = await getSuiteBalances(String(expense.suiteId));
  return NextResponse.json({ expense: updatedExpense, ...balanceData });
}
