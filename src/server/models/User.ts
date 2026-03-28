import { Schema, Types, model, models } from "mongoose";

export interface UserDocument {
  name: string;
  suiteId: Types.ObjectId | string;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    suiteId: { type: Schema.Types.ObjectId, ref: "Suite", required: true },
  },
  { timestamps: true }
);

export const User = models.User || model<UserDocument>("User", userSchema);
