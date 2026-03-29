import { NextResponse } from "next/server";

import { connectDatabase } from "../../../server/config/db";
import { listUpcomingGoogleTasks } from "../../../server/services/googleTasksService";
import { getSessionUserContext } from "../../../server/utils/sessionUser";

export async function GET() {
  try {
    await connectDatabase();

    const currentUser = await getSessionUserContext();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tasks = await listUpcomingGoogleTasks(currentUser.userId);
    return NextResponse.json(tasks);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Current user not found")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
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
