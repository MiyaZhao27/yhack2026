import { NextResponse } from "next/server";

import { connectDatabase } from "../../../../server/config/db";
import { Suite } from "../../../../server/models/Suite";
import { User } from "../../../../server/models/User";
import { getSessionUserContext } from "../../../../server/utils/sessionUser";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await connectDatabase();

  const currentUser = await getSessionUserContext();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (id !== currentUser.suiteId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const suite = (await Suite.findById(id).lean()) as any;

  if (!suite) {
    return NextResponse.json({ message: "Suite not found" }, { status: 404 });
  }

  const members = (await User.find({ suiteId: suite._id }).lean()) as any[];
  return NextResponse.json({
    ...suite,
    _id: String(suite._id),
    memberIds: (suite.memberIds || []).map((memberId: any) => String(memberId)),
    inviteCode: suite.inviteCode,
    members: members.map((member) => ({
      ...member,
      _id: String(member._id),
      suiteId: member.suiteId ? String(member.suiteId) : member.suiteId,
    })),
  });
}
