import { Schema, Types, model, models } from "mongoose";

const allocationSchema = new Schema(
  {
    expenseId: { type: Schema.Types.ObjectId, ref: "Expense", required: true },
    debtorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    creditorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const settlementSchema = new Schema(
  {
    suiteId: { type: Schema.Types.ObjectId, ref: "Suite", required: true },
    payerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    note: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["confirmed"], default: "confirmed" },
    allocations: [allocationSchema],
  },
  { timestamps: true, versionKey: false }
);

export const Settlement = models.Settlement || model("Settlement", settlementSchema);
