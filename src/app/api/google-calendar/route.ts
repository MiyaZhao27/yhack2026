import { NextResponse } from "next/server";

import { connectDatabase } from "../../../server/config/db";
import { Task } from "../../../server/models/Task";
import { listUpcomingGoogleTasks } from "../../../server/services/googleTasksService";
import { getSessionUserContext } from "../../../server/utils/sessionUser";
import { userHasSuiteAccess } from "../../../server/utils/suiteMembership";

export async function GET(request: Request) {
  try {
    await connectDatabase();

    const currentUser = await getSessionUserContext();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedSuiteId = searchParams.get("suiteId");
    const suiteId = requestedSuiteId ?? currentUser.suiteId;

    if (!suiteId || !userHasSuiteAccess(currentUser, suiteId)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const [googleTasks, suiteTasks] = await Promise.all([
      listUpcomingGoogleTasks(currentUser.userId),
      Task.find({ suiteId, googleTaskId: { $ne: null } }).select("googleTaskId").lean(),
    ]);

    const allowedGoogleTaskIds = new Set(
      (suiteTasks as any[])
        .map((task) => String(task.googleTaskId || ""))
        .filter(Boolean)
    );

    return NextResponse.json(
      googleTasks.filter((task) => allowedGoogleTaskIds.has(String(task.id)))
    );
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
