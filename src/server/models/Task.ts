import { Schema, Types, model, models } from "mongoose";

export type TaskStatus = "pending" | "done" | "overdue";
export type TaskRecurrence = "none" | "daily" | "weekly";

export interface TaskDocument {
  suiteId: Types.ObjectId | string;
  title: string;
  notes?: string | null;
  assigneeId: Types.ObjectId | string;
  dueDate: Date;
  status: TaskStatus;
  recurrence: TaskRecurrence;
  googleTaskId?: string | null;
  googleTaskSyncedAt?: Date | null;
  completedAt?: Date | null;
}

const taskSchema = new Schema<TaskDocument>(
  {
    suiteId: { type: Schema.Types.ObjectId, ref: "Suite", required: true },
    title: { type: String, required: true, trim: true },
    notes: { type: String, default: null, trim: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "done", "overdue"],
      default: "pending",
    },
    recurrence: {
      type: String,
      enum: ["none", "daily", "weekly"],
      default: "none",
    },
    googleTaskId: { type: String, default: null },
    googleTaskSyncedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Task = models.Task || model<TaskDocument>("Task", taskSchema);
