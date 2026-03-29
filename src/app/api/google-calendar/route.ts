import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "../../../auth";
import { connectDatabase } from "../../../server/config/db";
import { listUpcomingGoogleTasks } from "../../../server/services/googleTasksService";

export async function GET() {
  try {
    await connectDatabase();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tasks = await listUpcomingGoogleTasks(session.user.id);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("google tasks fetch failed", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to load Google Tasks",
      },
      { status: 500 }
    );
  }
}
