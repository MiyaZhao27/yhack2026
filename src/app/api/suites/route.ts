import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { authOptions } from "../../../auth";
import { connectDatabase } from "../../../server/config/db";
import { Suite } from "../../../server/models/Suite";
import { User } from "../../../server/models/User";
import { generateInviteCode } from "../../../server/utils/inviteCode";
import {
  getResolvedActiveSuiteId,
  getSuiteMembershipIds,
  syncUserSuiteState,
  userHasSuiteAccess,
} from "../../../server/utils/suiteMembership";

function serializeMember(member: any) {
  return {
    ...member,
    _id: String(member._id),
    suiteId: member.suiteId ? String(member.suiteId) : member.suiteId,
    activeSuiteId: member.activeSuiteId ? String(member.activeSuiteId) : member.activeSuiteId,
    suiteIds: (member.suiteIds || []).map((suiteId: any) => String(suiteId)),
  };
}

function serializeSuite(suite: any) {
  return {
    ...suite,
    _id: String(suite._id),
    memberIds: (suite.memberIds || []).map((memberId: any) => String(memberId)),
    inviteCode: suite.inviteCode,
  };
}

async function getOrCreateCurrentUser(session: any) {
  let currentUser = await User.findById(session.user.id);

  if (!currentUser && session.user.email) {
    currentUser = await User.findOne({ email: session.user.email });
  }

  if (!currentUser) {
    currentUser = await User.create({
      name: session.user.name || "SuiteEase User",
      email: session.user.email || undefined,
      image: session.user.image || null,
      suiteIds: [],
      activeSuiteId: null,
      onboardingComplete: false,
    });
  }

  await syncUserSuiteState(currentUser);
  return currentUser;
}

export async function GET() {
  await connectDatabase();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await getOrCreateCurrentUser(session);
  const suiteIds = getSuiteMembershipIds(currentUser);
  const activeSuiteId = getResolvedActiveSuiteId(currentUser);

  const suites = suiteIds.length
    ? ((await Suite.find({ _id: { $in: suiteIds.filter((suiteId) => Types.ObjectId.isValid(suiteId)) } })
        .sort({ createdAt: 1 })
        .lean()) as any[])
    : [];

  return NextResponse.json({
    suites: suites.map(serializeSuite),
    activeSuiteId,
  });
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
    currentUser.suiteIds = [...new Set([...getSuiteMembershipIds(currentUser), String(suite._id)])].map(
      (suiteId) => (Types.ObjectId.isValid(suiteId) ? new Types.ObjectId(suiteId) : suiteId)
    );
    currentUser.activeSuiteId = suite._id;
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

export async function PATCH(request: NextRequest) {
  try {
    await connectDatabase();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { suiteId } = (await request.json()) as { suiteId?: string };
    if (!suiteId) {
      return NextResponse.json({ message: "Suite selection is required" }, { status: 400 });
    }

    const currentUser = await getOrCreateCurrentUser(session);
    if (!userHasSuiteAccess(currentUser, suiteId)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    currentUser.activeSuiteId = suiteId;
    currentUser.suiteId = suiteId;
    await currentUser.save();

    return NextResponse.json({
      activeSuiteId: suiteId,
      suiteIds: getSuiteMembershipIds(currentUser),
    });
  } catch (error) {
    console.error("set active suite failed", error);
    return NextResponse.json({ message: "Failed to set active suite" }, { status: 500 });
  }
}
