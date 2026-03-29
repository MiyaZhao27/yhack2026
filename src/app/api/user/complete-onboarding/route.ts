import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "../../../../auth";
import { connectDatabase } from "../../../../server/config/db";
import { User } from "../../../../server/models/User";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDatabase();
  await User.findByIdAndUpdate(session.user.id, { onboardingComplete: true });

  return NextResponse.json({ ok: true });
}
