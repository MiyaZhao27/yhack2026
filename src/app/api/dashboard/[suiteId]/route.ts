import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "../../../../auth";
import { connectDatabase } from "../../../../server/config/db";
import { Expense } from "../../../../server/models/Expense";
import { ShoppingItem } from "../../../../server/models/ShoppingItem";
import { Task } from "../../../../server/models/Task";
import { getFairnessSummary, getSuiteBalances } from "../../../../server/services/balanceService";
import { isSameDay, normalizeTaskStatus } from "../../../../server/utils/date";

export async function GET(_request: Request, context: { params: Promise<{ suiteId: string }> }) {
  await connectDatabase();

  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id ? String(session.user.id) : "";
  const currentSuiteId = session?.user?.suiteId ? String(session.user.suiteId) : "";
  if (!currentUserId || !currentSuiteId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { suiteId } = await context.params;
  if (suiteId !== currentSuiteId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [tasks, shopping, expenses, balanceData, fairness] = await Promise.all([
    Task.find({ suiteId }).sort({ dueDate: 1 }).lean(),
    ShoppingItem.find({ suiteId }).sort({ createdAt: -1 }).lean(),
    Expense.find({
      suiteId,
      $or: [{ paidBy: currentUserId }, { participants: currentUserId }],
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    getSuiteBalances(suiteId, currentUserId),
    getFairnessSummary(suiteId),
  ]);
  const typedTasks = tasks as any[];
  const typedShopping = shopping as any[];
  const typedExpenses = expenses as any[];

  const today = new Date();
  const normalizedTasks = typedTasks.map((task: any) => ({
    ...task,
    status: normalizeTaskStatus(new Date(task.dueDate), task.status),
  }));

  return NextResponse.json({
    dueToday: normalizedTasks.filter(
      (task: any) => task.status !== "done" && isSameDay(new Date(task.dueDate), today)
    ),
    overdue: normalizedTasks.filter((task: any) => task.status === "overdue"),
    shoppingNeeded: typedShopping.filter((item: any) => item.status === "needed"),
    recentExpenses: typedExpenses,
    balances: balanceData.balances,
    settleUps: balanceData.settleUps,
    fairness,
  });
}
