import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { authOptions } from "../../../../auth";
import { connectDatabase } from "../../../../server/config/db";
import { Suite } from "../../../../server/models/Suite";
import { User } from "../../../../server/models/User";

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
      onboardingComplete: false,
    });
  }

  return currentUser;
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { inviteCode } = (await request.json()) as { inviteCode: string };
    const normalizedCode = inviteCode.trim().toUpperCase();

    if (!normalizedCode) {
      return NextResponse.json({ message: "Invite code is required" }, { status: 400 });
    }

    const currentUser = await getOrCreateCurrentUser(session);

    const suite = await Suite.findOne({ inviteCode: normalizedCode });
    if (!suite) {
      return NextResponse.json({ message: "Suite code not found" }, { status: 404 });
    }

    const previousSuiteId = currentUser.suiteId ? String(currentUser.suiteId) : null;
    const nextSuiteId = String(suite._id);

    if (
      previousSuiteId &&
      previousSuiteId !== nextSuiteId &&
      Types.ObjectId.isValid(previousSuiteId)
    ) {
      await Suite.findByIdAndUpdate(previousSuiteId, {
        $pull: { memberIds: currentUser._id },
      });
    }

    currentUser.suiteId = suite._id;
    currentUser.onboardingComplete = true;
    await currentUser.save();

    await Suite.findByIdAndUpdate(suite._id, {
      $addToSet: { memberIds: currentUser._id },
    });

    const refreshedSuite = await Suite.findById(suite._id).lean();
    const members = await User.find({ suiteId: suite._id }).lean();
    return NextResponse.json({
      ...(refreshedSuite as any),
      _id: String(suite._id),
      memberIds: (((refreshedSuite as any)?.memberIds || []) as any[]).map((memberId: any) =>
        String(memberId)
      ),
      inviteCode: (refreshedSuite as any)?.inviteCode,
      members: members.map((member: any) => ({
        ...member,
        _id: String(member._id),
        suiteId: member.suiteId ? String(member.suiteId) : member.suiteId,
      })),
    });
  } catch (error) {
    console.error("join suite failed", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to join suite" },
      { status: 500 }
    );
  }
}
