import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "../../../../auth";
import { connectDatabase } from "../../../../server/config/db";
import { Settlement } from "../../../../server/models/Settlement";
import { getSuiteBalances } from "../../../../server/services/balanceService";
import { recomputeNetting } from "../../../../server/services/settlementService";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDatabase();

  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id ? String(session.user.id) : "";
  const currentSuiteId = session?.user?.suiteId ? String(session.user.suiteId) : "";
  if (!currentUserId || !currentSuiteId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const settlement = (await Settlement.findById(id).lean()) as any;
  if (!settlement) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settlementSuiteId = String(settlement.suiteId);
  const payerId = String(settlement.payerId);
  const receiverId = String(settlement.receiverId);
  const isInvolved = payerId === currentUserId || receiverId === currentUserId;

  if (settlementSuiteId !== currentSuiteId || !isInvolved) {
    return NextResponse.json(
      { error: "You can only delete settlements that involve you." },
      { status: 403 }
    );
  }

  await Settlement.findByIdAndDelete(id);
  await recomputeNetting(settlementSuiteId);
  const balanceData = await getSuiteBalances(settlementSuiteId, currentUserId);
  return NextResponse.json(balanceData);
}
