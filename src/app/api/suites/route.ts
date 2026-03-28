import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "../../../server/config/db";
import { Suite } from "../../../server/models/Suite";
import { User } from "../../../server/models/User";

export async function GET() {
  await connectDatabase();
  const suites = (await Suite.find().lean()) as any[];
  return NextResponse.json(suites);
}

export async function POST(request: NextRequest) {
  await connectDatabase();

  const { name, members } = (await request.json()) as { name: string; members: string[] };

  const suite = await Suite.create({ name, memberIds: [] });
  const createdMembers = await User.insertMany(
    members
      .filter(Boolean)
      .map((memberName) => ({
        name: memberName.trim(),
        suiteId: suite._id,
      }))
  );

  suite.memberIds = createdMembers.map((member) => String(member._id));
  await suite.save();

  return NextResponse.json(
    {
      ...suite.toObject(),
      members: createdMembers,
    },
    { status: 201 }
  );
}
