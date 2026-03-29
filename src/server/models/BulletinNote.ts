import { Schema, Types, model, models } from "mongoose";

export type BulletinNoteColor = "red" | "green" | "blue" | "yellow";

export interface BulletinNoteDocument {
  suiteId: Types.ObjectId | string;
  color: BulletinNoteColor;
  text: string;
  x: number;
  y: number;
  rotationDeg: number;
}

const bulletinNoteSchema = new Schema<BulletinNoteDocument>(
  {
    suiteId: { type: Schema.Types.ObjectId, ref: "Suite", required: true, index: true },
    color: {
      type: String,
      enum: ["red", "green", "blue", "yellow"],
      required: true,
    },
    text: { type: String, required: true, trim: true, default: "New note" },
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
    rotationDeg: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export const BulletinNote =
  models.BulletinNote || model<BulletinNoteDocument>("BulletinNote", bulletinNoteSchema);
