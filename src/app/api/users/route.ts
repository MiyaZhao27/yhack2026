import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { authOptions } from "../../../auth";
import { connectDatabase } from "../../../server/config/db";
import { Suite } from "../../../server/models/Suite";
import { User } from "../../../server/models/User";
import { buildSuiteMembershipQuery, userHasSuiteAccess } from "../../../server/utils/suiteMembership";

export async function GET(request: NextRequest) {
  await connectDatabase();

  const suiteId = request.nextUrl.searchParams.get("suiteId");
  const filter = suiteId ? buildSuiteMembershipQuery(suiteId) : {};
  const users = (await User.find(filter).lean()) as any[];
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  await connectDatabase();

  const { name, suiteId } = await request.json();
  const user = await User.create({
    name,
    suiteId,
    activeSuiteId: suiteId,
    suiteIds: suiteId
      ? [Types.ObjectId.isValid(String(suiteId)) ? new Types.ObjectId(String(suiteId)) : suiteId]
      : [],
  });
  await Suite.findByIdAndUpdate(suiteId, { $addToSet: { memberIds: user._id } });
  return NextResponse.json(user, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  await connectDatabase();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { userId, venmoUsername, suiteId } = await request.json();
  if (!userId) {
    return NextResponse.json({ message: "User is required" }, { status: 400 });
  }

  if (suiteId && !userHasSuiteAccess(session.user as any, String(suiteId))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { venmoUsername: venmoUsername?.trim() || null } },
    { new: true }
  ).lean();

  if (!updatedUser) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json(updatedUser);
}
