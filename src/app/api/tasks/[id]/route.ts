import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "../../../../auth";
import { connectDatabase } from "../../../../server/config/db";
import { Task } from "../../../../server/models/Task";
import { createGoogleTaskForTask } from "../../../../server/services/googleTasksService";
import { normalizeTaskStatus } from "../../../../server/utils/date";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDatabase();

  const { id } = await context.params;
  const payload = await request.json();
  const existing = await Task.findById(id).lean();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dueDate = payload.dueDate ? new Date(payload.dueDate) : (existing as any).dueDate;
  const status = normalizeTaskStatus(dueDate, payload.status ?? (existing as any).status);
  const task = await Task.findByIdAndUpdate(
    id,
    {
      ...payload,
      status,
      completedAt: status === "done" ? new Date() : null,
    },
    { new: true }
  );

  return NextResponse.json(task);
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDatabase();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const task: any = await Task.findById(id);

  if (!task) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  if (String(task.assigneeId) !== session.user.id) {
    return NextResponse.json({ message: "Only the assignee can add this task to Google Tasks" }, { status: 403 });
  }

  if (task.googleTaskId) {
    return NextResponse.json({ message: "Task is already in Google Tasks" }, { status: 400 });
  }

  try {
    const googleTask = await createGoogleTaskForTask(session.user.id, {
      title: task.title,
      dueDate: new Date(task.dueDate).toISOString().slice(0, 10),
      notes: task.notes,
      recurrence: task.recurrence,
    });

    task.googleTaskId = googleTask.id;
    task.googleTaskSyncedAt = new Date();
    await task.save();

    return NextResponse.json({
      task,
      googleTask,
    });
  } catch (error) {
    console.error("manual google tasks sync failed", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to add task to Google Tasks" },
      { status: 500 }
    );
  }
}
