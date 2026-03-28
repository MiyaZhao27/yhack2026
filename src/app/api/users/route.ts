import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "../../../server/config/db";
import { Suite } from "../../../server/models/Suite";
import { User } from "../../../server/models/User";

export async function GET(request: NextRequest) {
  await connectDatabase();

  const suiteId = request.nextUrl.searchParams.get("suiteId");
  const filter = suiteId ? { suiteId } : {};
  const users = (await User.find(filter).lean()) as any[];
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  await connectDatabase();

  const { name, suiteId } = await request.json();
  const user = await User.create({ name, suiteId });
  await Suite.findByIdAndUpdate(suiteId, { $addToSet: { memberIds: user._id } });
  return NextResponse.json(user, { status: 201 });
}
