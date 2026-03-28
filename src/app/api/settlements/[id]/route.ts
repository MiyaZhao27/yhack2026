import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "../../../../server/config/db";
import { Settlement } from "../../../../server/models/Settlement";
import { getSuiteBalances } from "../../../../server/services/balanceService";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDatabase();
  const { id } = await context.params;
  const settlement = (await Settlement.findByIdAndDelete(id).lean()) as any;
  if (!settlement) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const balanceData = await getSuiteBalances(String(settlement.suiteId));
  return NextResponse.json(balanceData);
}
