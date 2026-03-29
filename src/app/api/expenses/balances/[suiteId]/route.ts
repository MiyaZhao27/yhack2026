import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "../../../../../auth";
import { connectDatabase } from "../../../../../server/config/db";
import { getSuiteBalances } from "../../../../../server/services/balanceService";

export async function GET(_request: Request, context: { params: Promise<{ suiteId: string }> }) {
  await connectDatabase();

  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id ? String(session.user.id) : "";
  const currentSuiteId = session?.user?.suiteId ? String(session.user.suiteId) : "";
  if (!currentUserId || !currentSuiteId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { suiteId } = await context.params;
  if (suiteId !== currentSuiteId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getSuiteBalances(suiteId, currentUserId);
  return NextResponse.json(data);
}
