import { Request, Response } from "express";

import { Expense } from "../models/Expense";
import { ShoppingItem } from "../models/ShoppingItem";
import { Task } from "../models/Task";
import { getFairnessSummary, getSuiteBalances } from "../services/balanceService";
import { isSameDay, normalizeTaskStatus } from "../utils/date";

export async function getDashboard(req: Request, res: Response) {
  const suiteId = String(req.params.suiteId);

  const [tasks, shopping, expenses, balanceData, fairness] = await Promise.all([
    Task.find({ suiteId }).sort({ dueDate: 1 }).lean(),
    ShoppingItem.find({ suiteId }).sort({ createdAt: -1 }).lean(),
    Expense.find({ suiteId }).sort({ createdAt: -1 }).limit(5).lean(),
    getSuiteBalances(suiteId),
    getFairnessSummary(suiteId),
  ]);

  const today = new Date();
  const normalizedTasks = tasks.map((task) => ({
    ...task,
    status: normalizeTaskStatus(new Date(task.dueDate), task.status),
  }));

  res.json({
    dueToday: normalizedTasks.filter(
      (task) => task.status !== "done" && isSameDay(new Date(task.dueDate), today)
    ),
    overdue: normalizedTasks.filter((task) => task.status === "overdue"),
    shoppingNeeded: shopping.filter((item) => item.status === "needed"),
    recentExpenses: expenses,
    balances: balanceData.balances,
    settleUps: balanceData.settleUps,
    fairness,
  });
}
