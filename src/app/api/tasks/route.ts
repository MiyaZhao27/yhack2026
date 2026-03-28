import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "../../../server/config/db";
import { Task } from "../../../server/models/Task";
import { normalizeTaskStatus } from "../../../server/utils/date";

export async function GET(request: NextRequest) {
  await connectDatabase();

  const suiteId = request.nextUrl.searchParams.get("suiteId");
  const tasks = (await Task.find(suiteId ? { suiteId } : {})
    .sort({ dueDate: 1 })
    .lean()) as any[];

  return NextResponse.json(
    tasks.map((task: any) => ({
      ...task,
      status: normalizeTaskStatus(new Date(task.dueDate), task.status),
    }))
  );
}

export async function POST(request: NextRequest) {
  await connectDatabase();

  const payload = await request.json();
  const task = await Task.create({
    ...payload,
    status: normalizeTaskStatus(new Date(payload.dueDate), payload.status || "pending"),
    completedAt: payload.status === "done" ? new Date() : null,
  });

  return NextResponse.json(task, { status: 201 });
}
