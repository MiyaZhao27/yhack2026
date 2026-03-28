import { Schema, Types, model } from "mongoose";

export interface ExpenseDocument {
  suiteId: Types.ObjectId | string;
  title: string;
  amount: number;
  paidBy: Types.ObjectId | string;
  participants: Array<Types.ObjectId | string>;
  splitType: "equal";
  createdAt: Date;
}

const expenseSchema = new Schema<ExpenseDocument>(
  {
    suiteId: { type: Schema.Types.ObjectId, ref: "Suite", required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    splitType: { type: String, enum: ["equal"], default: "equal" },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false }
);

export const Expense = model<ExpenseDocument>("Expense", expenseSchema);
