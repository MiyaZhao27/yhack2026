import { NextResponse } from "next/server";

import { connectDatabase } from "../../../../../server/config/db";
import { getSuiteBalances } from "../../../../../server/services/balanceService";

export async function GET(_request: Request, context: { params: Promise<{ suiteId: string }> }) {
  await connectDatabase();

  const { suiteId } = await context.params;
  const data = await getSuiteBalances(suiteId);
  return NextResponse.json(data);
}
