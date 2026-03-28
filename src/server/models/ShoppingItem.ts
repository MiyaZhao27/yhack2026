import { Schema, Types, model, models } from "mongoose";

export type ShoppingCategory = "groceries" | "cleaning" | "household";
export type ShoppingStatus = "needed" | "bought";

export interface ShoppingItemDocument {
  suiteId: Types.ObjectId | string;
  name: string;
  quantity: number;
  requestedBy: Types.ObjectId | string;
  category: ShoppingCategory;
  status: ShoppingStatus;
  boughtBy?: Types.ObjectId | string | null;
}

const shoppingItemSchema = new Schema<ShoppingItemDocument>(
  {
    suiteId: { type: Schema.Types.ObjectId, ref: "Suite", required: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: {
      type: String,
      enum: ["groceries", "cleaning", "household"],
      default: "groceries",
    },
    status: {
      type: String,
      enum: ["needed", "bought"],
      default: "needed",
    },
    boughtBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const ShoppingItem =
  models.ShoppingItem || model<ShoppingItemDocument>("ShoppingItem", shoppingItemSchema);
