import { NextResponse } from "next/server";

import { connectDatabase } from "../../../../server/config/db";
import { Suite } from "../../../../server/models/Suite";
import { User } from "../../../../server/models/User";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await connectDatabase();

  const { id } = await context.params;
  const suite = (await Suite.findById(id).lean()) as any;

  if (!suite) {
    return NextResponse.json({ message: "Suite not found" }, { status: 404 });
  }

  const members = (await User.find({ suiteId: suite._id }).lean()) as any[];
  return NextResponse.json({ ...suite, members });
}
