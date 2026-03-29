import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "../../../auth";
import { connectDatabase } from "../../../server/config/db";
import { Settlement } from "../../../server/models/Settlement";
import { getSuiteBalances } from "../../../server/services/balanceService";
import { createSettlement, recomputeNetting } from "../../../server/services/settlementService";

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
  const settlements = await Settlement.find({
    suiteId,
    type: "payment",
    $or: [{ payerId: current.userId }, { receiverId: current.userId }],
  })
    .sort({ date: -1 })
    .lean();
  return NextResponse.json(settlements);
}

export async function POST(request: NextRequest) {
  await connectDatabase();
  const body = await request.json();
  const { suiteId, payerId, receiverId, amount, note } = body;

  const current = await getCurrentUserContext();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!suiteId || !payerId || !receiverId || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (suiteId !== current.suiteId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (payerId !== current.userId && receiverId !== current.userId) {
    return NextResponse.json(
      { error: "You can only record settlements that involve you." },
      { status: 403 }
    );
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
      date: new Date(),
      note: note ?? undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to record payment" }, { status: 400 });
  }

  await recomputeNetting(suiteId);
  const balanceData = await getSuiteBalances(suiteId, current.userId);
  return NextResponse.json({ settlement, ...balanceData }, { status: 201 });
}
