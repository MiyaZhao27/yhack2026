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
  const status = normalizeTaskStatus(new Date(payload.dueDate), payload.status);
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
