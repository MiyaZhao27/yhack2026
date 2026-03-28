import { Schema, Types, model, models } from "mongoose";

export interface UserDocument {
  name: string;
  email?: string;
  image?: string | null;
  googleId?: string;
  suiteId?: Types.ObjectId | string | null;
  onboardingComplete: boolean;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    image: { type: String, default: null },
    googleId: { type: String, unique: true, sparse: true },
    suiteId: { type: Schema.Types.ObjectId, ref: "Suite", default: null },
    onboardingComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = models.User || model<UserDocument>("User", userSchema);
