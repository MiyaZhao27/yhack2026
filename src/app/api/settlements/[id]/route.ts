import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "../../../../server/config/db";
import { Settlement } from "../../../../server/models/Settlement";
import { getSuiteBalances } from "../../../../server/services/balanceService";
import { recomputeNetting } from "../../../../server/services/settlementService";
import { getSessionUserContext } from "../../../../server/utils/sessionUser";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDatabase();

  const currentUser = await getSessionUserContext();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const settlement = (await Settlement.findById(id).lean()) as any;
  if (!settlement) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settlementSuiteId = String(settlement.suiteId);
  const payerId = String(settlement.payerId);
  const receiverId = String(settlement.receiverId);
  const isInvolved = payerId === currentUser.userId || receiverId === currentUser.userId;

  if (settlementSuiteId !== currentUser.suiteId || !isInvolved) {
    return NextResponse.json(
      { error: "You can only delete settlements that involve you." },
      { status: 403 }
    );
  }

  await Settlement.findByIdAndDelete(id);
  await recomputeNetting(settlementSuiteId);
  const balanceData = await getSuiteBalances(settlementSuiteId, currentUser.userId);
  return NextResponse.json(balanceData);
}
