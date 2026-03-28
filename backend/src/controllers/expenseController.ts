import { Request, Response } from "express";

import { Expense } from "../models/Expense";
import { getSuiteBalances } from "../services/balanceService";

export async function getExpenses(req: Request, res: Response) {
  const { suiteId } = req.query;
  const expenses = await Expense.find(suiteId ? { suiteId } : {}).sort({ createdAt: -1 }).lean();
  res.json(expenses);
}

export async function createExpense(req: Request, res: Response) {
  const expense = await Expense.create({
    ...req.body,
    splitType: "equal",
  });
  const balanceData = await getSuiteBalances(String(expense.suiteId));
  res.status(201).json({ expense, ...balanceData });
}

export async function getBalances(req: Request, res: Response) {
  const data = await getSuiteBalances(String(req.params.suiteId));
  res.json(data);
}
