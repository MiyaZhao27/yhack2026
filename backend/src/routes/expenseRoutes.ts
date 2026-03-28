import { Router } from "express";

import { createExpense, getBalances, getExpenses } from "../controllers/expenseController";

const router = Router();

router.get("/", getExpenses);
router.get("/balances/:suiteId", getBalances);
router.post("/", createExpense);

export default router;
