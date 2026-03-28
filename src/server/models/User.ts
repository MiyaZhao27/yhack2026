import { Schema, Types, model, models } from "mongoose";

export interface UserDocument {
  name: string;
<<<<<<< HEAD
  suiteId: Types.ObjectId | string;
=======
  email?: string;
  image?: string | null;
  googleId?: string;
  suiteId?: Types.ObjectId | string | null;
  onboardingComplete: boolean;
>>>>>>> origin/lauren/tasks
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
<<<<<<< HEAD
    suiteId: { type: Schema.Types.ObjectId, ref: "Suite", required: true },
=======
    email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    image: { type: String, default: null },
    googleId: { type: String, unique: true, sparse: true },
    suiteId: { type: Schema.Types.ObjectId, ref: "Suite", default: null },
    onboardingComplete: { type: Boolean, default: false },
>>>>>>> origin/lauren/tasks
  },
  { timestamps: true }
);

export const User = models.User || model<UserDocument>("User", userSchema);
