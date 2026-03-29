import { Request, Response } from "express";

import { Suite } from "../models/Suite";
import { User } from "../models/User";

export async function getUsers(req: Request, res: Response) {
  const { suiteId } = req.query;
  const filter = suiteId ? { suiteId } : {};
  const users = await User.find(filter).lean();
  res.json(users);
}

export async function createUser(req: Request, res: Response) {
  const { name, suiteId } = req.body;
  const user = await User.create({ name, suiteId });
  await Suite.findByIdAndUpdate(suiteId, { $addToSet: { memberIds: user._id } });
  res.status(201).json(user);
}
