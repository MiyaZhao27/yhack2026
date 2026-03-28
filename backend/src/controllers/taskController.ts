import { Request, Response } from "express";

import { Task } from "../models/Task";
import { normalizeTaskStatus } from "../utils/date";

export async function getTasks(req: Request, res: Response) {
  const { suiteId } = req.query;
  const tasks = await Task.find(suiteId ? { suiteId } : {}).sort({ dueDate: 1 }).lean();
  res.json(
    tasks.map((task) => ({
      ...task,
      status: normalizeTaskStatus(new Date(task.dueDate), task.status),
    }))
  );
}

export async function createTask(req: Request, res: Response) {
  const payload = req.body;
  const task = await Task.create({
    ...payload,
    status: normalizeTaskStatus(new Date(payload.dueDate), payload.status || "pending"),
    completedAt: payload.status === "done" ? new Date() : null,
  });
  res.status(201).json(task);
}

export async function updateTask(req: Request, res: Response) {
  const payload = req.body;
  const status = normalizeTaskStatus(new Date(payload.dueDate), payload.status);
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    {
      ...payload,
      status,
      completedAt: status === "done" ? new Date() : null,
    },
    { new: true }
  );
  res.json(task);
}
