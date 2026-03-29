import { Router } from "express";

import {
  createShoppingItem,
  getShoppingItems,
  updateShoppingItem,
} from "../controllers/shoppingController";

const router = Router();

router.get("/", getShoppingItems);
router.post("/", createShoppingItem);
router.patch("/:id", updateShoppingItem);

export default router;
