import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "../../../../server/config/db";
import { Task } from "../../../../server/models/Task";
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
