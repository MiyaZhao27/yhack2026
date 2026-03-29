import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "../../../server/config/db";
import { Settlement } from "../../../server/models/Settlement";
import { getSuiteBalances } from "../../../server/services/balanceService";
import { createSettlement, recomputeNetting } from "../../../server/services/settlementService";

export async function GET(request: NextRequest) {
  await connectDatabase();
  const suiteId = request.nextUrl.searchParams.get("suiteId");
  const settlements = await Settlement.find(suiteId ? { suiteId, type: "payment" } : { type: "payment" })
    .sort({ date: -1 })
    .lean();
  return NextResponse.json(settlements);
}

export async function POST(request: NextRequest) {
  await connectDatabase();
  const body = await request.json();
  const { suiteId, payerId, receiverId, amount, date, note } = body;

  if (!suiteId || !payerId || !receiverId || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (payerId === receiverId) {
    return NextResponse.json({ error: "Payer and receiver must be different" }, { status: 400 });
  }
  if (Number(amount) <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }

  let settlement;
  try {
    settlement = await createSettlement({
      suiteId,
      payerId,
      receiverId,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      note: note ?? undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to record payment" }, { status: 400 });
  }

  await recomputeNetting(suiteId);
  const balanceData = await getSuiteBalances(suiteId);
  return NextResponse.json({ settlement, ...balanceData }, { status: 201 });
}
