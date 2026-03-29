import { NextResponse } from "next/server";

import { connectDatabase } from "../../../../../server/config/db";
import { getSuiteBalances } from "../../../../../server/services/balanceService";
import { getSessionUserContext } from "../../../../../server/utils/sessionUser";
import { userHasSuiteAccess } from "../../../../../server/utils/suiteMembership";

export async function GET(_request: Request, context: { params: Promise<{ suiteId: string }> }) {
  await connectDatabase();

  const currentUser = await getSessionUserContext();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { suiteId } = await context.params;
  if (!userHasSuiteAccess(currentUser, suiteId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getSuiteBalances(suiteId, currentUser.userId);
  return NextResponse.json(data);
}
