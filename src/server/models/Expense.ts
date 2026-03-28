import { Schema, Types, model, models } from "mongoose";

export interface ExpenseDocument {
  suiteId: Types.ObjectId | string;
  title: string;
  amount: number;
  paidBy: Types.ObjectId | string;
<<<<<<< HEAD
  date: Date;
  participants: Array<Types.ObjectId | string>;
  splitMethod: "equal" | "exact" | "percentage" | "itemized";
  splits: Array<{
    participantId: Types.ObjectId | string;
    owedAmount: number;
    percentage?: number;
  }>;
  items: Array<{
    name: string;
    amount: number;
    assignedParticipants: Array<Types.ObjectId | string>;
  }>;
  createdAt: Date;
}

const expenseSplitSchema = new Schema(
  {
    participantId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    owedAmount: { type: Number, required: true },
    percentage: { type: Number },
    paidAt: { type: Date, default: null },
  },
  { _id: false }
);

const expenseItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    assignedParticipants: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { _id: false }
);

=======
  participants: Array<Types.ObjectId | string>;
  splitType: "equal";
  createdAt: Date;
}

>>>>>>> origin/lauren/tasks
const expenseSchema = new Schema<ExpenseDocument>(
  {
    suiteId: { type: Schema.Types.ObjectId, ref: "Suite", required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
<<<<<<< HEAD
    date: { type: Date, default: Date.now },
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    splitMethod: {
      type: String,
      enum: ["equal", "exact", "percentage", "itemized"],
      default: "equal",
    },
    splits: [expenseSplitSchema],
    items: [expenseItemSchema],
=======
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    splitType: { type: String, enum: ["equal"], default: "equal" },
    createdAt: { type: Date, default: Date.now },
>>>>>>> origin/lauren/tasks
  },
  { timestamps: true, versionKey: false }
);

export const Expense = models.Expense || model<ExpenseDocument>("Expense", expenseSchema);
