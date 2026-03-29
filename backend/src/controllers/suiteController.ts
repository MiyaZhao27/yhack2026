import { Request, Response } from "express";

import { Suite } from "../models/Suite";
import { User } from "../models/User";

export async function getSuites(_req: Request, res: Response) {
  const suites = await Suite.find().lean();
  res.json(suites);
}

export async function getSuiteById(req: Request, res: Response) {
  const suite = await Suite.findById(req.params.id).lean();
  if (!suite) {
    return res.status(404).json({ message: "Suite not found" });
  }

  const members = await User.find({ suiteId: suite._id }).lean();
  return res.json({ ...suite, members });
}

export async function createSuite(req: Request, res: Response) {
  const { name, members } = req.body as { name: string; members: string[] };

  const suite = await Suite.create({ name, memberIds: [] });
  const createdMembers = await User.insertMany(
    members
      .filter(Boolean)
      .map((memberName) => ({
        name: memberName.trim(),
        suiteId: suite._id,
      }))
  );

  suite.memberIds = createdMembers.map((member) => String(member._id));
  await suite.save();

  res.status(201).json({
    ...suite.toObject(),
    members: createdMembers,
  });
}
