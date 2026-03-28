import { Schema, Types, model, models } from "mongoose";

export interface SuiteDocument {
  name: string;
  memberIds: Array<Types.ObjectId | string>;
  inviteCode?: string;
}

const suiteSchema = new Schema<SuiteDocument>(
  {
    name: { type: String, required: true, trim: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    inviteCode: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
  },
  { timestamps: true }
);

export const Suite = models.Suite || model<SuiteDocument>("Suite", suiteSchema);
