import { Schema, Types, model, models } from "mongoose";

export interface UserDocument {
  name: string;
  email?: string;
  image?: string | null;
  venmoUsername?: string | null;
  googleId?: string;
  googleAccessToken?: string | null;
  googleRefreshToken?: string | null;
  googleTokenExpiresAt?: Date | null;
  googleTasksListId?: string | null;
  suiteId?: Types.ObjectId | string | null;
  suiteIds?: Array<Types.ObjectId | string>;
  activeSuiteId?: Types.ObjectId | string | null;
  onboardingComplete: boolean;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    image: { type: String, default: null },
    venmoUsername: { type: String, default: null, trim: true },
    googleId: { type: String, unique: true, sparse: true },
    googleAccessToken: { type: String, default: null },
    googleRefreshToken: { type: String, default: null },
    googleTokenExpiresAt: { type: Date, default: null },
    googleTasksListId: { type: String, default: null },
    suiteId: { type: Schema.Types.ObjectId, ref: "Suite", default: null },
    suiteIds: [{ type: Schema.Types.ObjectId, ref: "Suite", default: [] }],
    activeSuiteId: { type: Schema.Types.ObjectId, ref: "Suite", default: null },
    onboardingComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = models.User || model<UserDocument>("User", userSchema);
