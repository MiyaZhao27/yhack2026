import { Request, Response } from "express";

import { ShoppingItem } from "../models/ShoppingItem";

export async function getShoppingItems(req: Request, res: Response) {
  const { suiteId } = req.query;
  const items = await ShoppingItem.find(suiteId ? { suiteId } : {}).sort({ createdAt: -1 }).lean();
  res.json(items);
}

export async function createShoppingItem(req: Request, res: Response) {
  const item = await ShoppingItem.create(req.body);
  res.status(201).json(item);
}

export async function updateShoppingItem(req: Request, res: Response) {
  const item = await ShoppingItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(item);
}
