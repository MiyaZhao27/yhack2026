import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "../../../auth";
import { connectDatabase } from "../../../server/config/db";
import { Task } from "../../../server/models/Task";
import { createGoogleTaskForTask } from "../../../server/services/googleTasksService";
import { normalizeTaskStatus, shouldShowTask } from "../../../server/utils/date";
import { getSessionUserContext } from "../../../server/utils/sessionUser";
import { userHasSuiteAccess } from "../../../server/utils/suiteMembership";

function taskOrder(task: { status: string }) {
  if (task.status === "overdue") return 0;
  if (task.status === "pending") return 1;
  return 2;
}

export async function GET(request: NextRequest) {
  await connectDatabase();

  const currentUser = await getSessionUserContext();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const requestedSuiteId = request.nextUrl.searchParams.get("suiteId");
  const suiteId = requestedSuiteId ?? currentUser.suiteId;
  if (!suiteId || !userHasSuiteAccess(currentUser, suiteId)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const tasks = (await Task.find({ suiteId })
    .sort({ dueDate: 1 })
    .lean()) as any[];

  return NextResponse.json(
    tasks
      .map((task: any) => ({
        ...task,
        status: normalizeTaskStatus(new Date(task.dueDate), task.status),
      }))
      .filter((task: any) => shouldShowTask(task, now))
      .sort((left: any, right: any) => {
        const statusDifference = taskOrder(left) - taskOrder(right);
        if (statusDifference !== 0) {
          return statusDifference;
        }

        return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
      })
  );
}

export async function POST(request: NextRequest) {
  await connectDatabase();

  const session = await getServerSession(authOptions);
  const currentUser = await getSessionUserContext();
  if (!session?.user?.id || !currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  if (!payload.suiteId || !userHasSuiteAccess(currentUser, String(payload.suiteId))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const task = await Task.create({
    ...payload,
    status: normalizeTaskStatus(new Date(payload.dueDate), payload.status || "pending"),
    googleTaskId: null,
    googleTaskSyncedAt: null,
    completedAt: payload.status === "done" ? new Date() : null,
  });

  let googleTask = null;
  let googleTaskSyncError: string | null = null;

  if (session?.user?.id && payload.assigneeId === session.user.id) {
    try {
      googleTask = await createGoogleTaskForTask(session.user.id, {
        title: payload.title,
        dueDate: payload.dueDate,
        notes: payload.notes,
        recurrence: payload.recurrence,
      });
      task.googleTaskId = googleTask.id;
      task.googleTaskSyncedAt = new Date();
      await task.save();
    } catch (error) {
      console.error("google tasks sync failed", error);
      googleTaskSyncError = error instanceof Error ? error.message : "Failed to sync Google Tasks";
    }
  }

  return NextResponse.json({ task, googleTask, googleTaskSyncError }, { status: 201 });
}
