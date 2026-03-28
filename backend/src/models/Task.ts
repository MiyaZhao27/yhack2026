import { Schema, Types, model } from "mongoose";

export type TaskStatus = "pending" | "done" | "overdue";
export type TaskRecurrence = "none" | "daily" | "weekly";

export interface TaskDocument {
  suiteId: Types.ObjectId | string;
  title: string;
  assigneeId: Types.ObjectId | string;
  dueDate: Date;
  status: TaskStatus;
  recurrence: TaskRecurrence;
  completedAt?: Date | null;
}

const taskSchema = new Schema<TaskDocument>(
  {
    suiteId: { type: Schema.Types.ObjectId, ref: "Suite", required: true },
    title: { type: String, required: true, trim: true },
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
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Task = model<TaskDocument>("Task", taskSchema);
