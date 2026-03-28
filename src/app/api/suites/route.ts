import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "../../../auth";
import { connectDatabase } from "../../../server/config/db";
import { Suite } from "../../../server/models/Suite";
import { User } from "../../../server/models/User";
import { generateInviteCode } from "../../../server/utils/inviteCode";

function serializeMember(member: any) {
  return {
    ...member,
    _id: String(member._id),
    suiteId: member.suiteId ? String(member.suiteId) : member.suiteId,
  };
}

async function getOrCreateCurrentUser(session: any) {
  let currentUser = await User.findById(session.user.id);

  if (!currentUser && session.user.email) {
    currentUser = await User.findOne({ email: session.user.email });
  }

  if (!currentUser) {
    currentUser = await User.create({
      name: session.user.name || "LiveWell User",
      email: session.user.email || undefined,
      image: session.user.image || null,
      onboardingComplete: false,
    });
  }

  return currentUser;
}

export async function GET() {
  await connectDatabase();
  const suites = (await Suite.find().lean()) as any[];
  return NextResponse.json(
    suites.map((suite) => ({
      ...suite,
      _id: String(suite._id),
      memberIds: (suite.memberIds || []).map((memberId: any) => String(memberId)),
      inviteCode: suite.inviteCode,
    }))
  );
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name } = (await request.json()) as { name: string };

    const currentUser = await getOrCreateCurrentUser(session);

    const suite = await Suite.create({
      name,
      memberIds: [currentUser._id],
      inviteCode: generateInviteCode(),
    });
    currentUser.suiteId = suite._id;
    currentUser.onboardingComplete = true;
    await currentUser.save();
    suite.memberIds = [String(currentUser._id)];
    await suite.save();

    return NextResponse.json(
      {
        ...suite.toObject(),
        _id: String(suite._id),
        memberIds: [String(currentUser._id)],
        inviteCode: suite.inviteCode,
        members: [serializeMember(currentUser.toObject())],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("create suite failed", error);
    return NextResponse.json({ message: "Failed to create suite" }, { status: 500 });
  }
}
