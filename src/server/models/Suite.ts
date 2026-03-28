import { Schema, Types, model, models } from "mongoose";

export interface SuiteDocument {
  name: string;
  memberIds: Array<Types.ObjectId | string>;
<<<<<<< HEAD
=======
  inviteCode?: string;
>>>>>>> origin/lauren/tasks
}

const suiteSchema = new Schema<SuiteDocument>(
  {
    name: { type: String, required: true, trim: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
<<<<<<< HEAD
=======
    inviteCode: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
>>>>>>> origin/lauren/tasks
  },
  { timestamps: true }
);

export const Suite = models.Suite || model<SuiteDocument>("Suite", suiteSchema);
