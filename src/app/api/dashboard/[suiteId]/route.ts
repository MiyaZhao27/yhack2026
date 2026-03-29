import { NextResponse } from "next/server";

import { connectDatabase } from "../../../../server/config/db";
import { Expense } from "../../../../server/models/Expense";
import { Task } from "../../../../server/models/Task";
import { getFairnessSummary, getSuiteBalances } from "../../../../server/services/balanceService";
import { getSessionUserContext } from "../../../../server/utils/sessionUser";
import { isSameDay, normalizeTaskStatus } from "../../../../server/utils/date";
import { userHasSuiteAccess } from "../../../../server/utils/suiteMembership";

export async function GET(_request: Request, context: { params: Promise<{ suiteId: string }> }) {
  await connectDatabase();

  const currentUser = await getSessionUserContext();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { suiteId } = await context.params;
  if (!userHasSuiteAccess(currentUser, suiteId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [tasks, expenses, balanceData, fairness] = await Promise.all([
    Task.find({ suiteId }).sort({ dueDate: 1 }).lean(),
    Expense.find({
      suiteId,
      $or: [{ paidBy: currentUser.userId }, { participants: currentUser.userId }],
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    getSuiteBalances(suiteId, currentUser.userId),
    getFairnessSummary(suiteId),
  ]);
  const typedTasks = tasks as any[];
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
    recentExpenses: typedExpenses,
    balances: balanceData.balances,
    settleUps: balanceData.settleUps,
    fairness,
  });
}
