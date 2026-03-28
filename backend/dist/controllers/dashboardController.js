"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = getDashboard;
const Expense_1 = require("../models/Expense");
const ShoppingItem_1 = require("../models/ShoppingItem");
const Task_1 = require("../models/Task");
const balanceService_1 = require("../services/balanceService");
const date_1 = require("../utils/date");
async function getDashboard(req, res) {
    const suiteId = String(req.params.suiteId);
    const [tasks, shopping, expenses, balanceData, fairness] = await Promise.all([
        Task_1.Task.find({ suiteId }).sort({ dueDate: 1 }).lean(),
        ShoppingItem_1.ShoppingItem.find({ suiteId }).sort({ createdAt: -1 }).lean(),
        Expense_1.Expense.find({ suiteId }).sort({ createdAt: -1 }).limit(5).lean(),
        (0, balanceService_1.getSuiteBalances)(suiteId),
        (0, balanceService_1.getFairnessSummary)(suiteId),
    ]);
    const today = new Date();
    const normalizedTasks = tasks.map((task) => ({
        ...task,
        status: (0, date_1.normalizeTaskStatus)(new Date(task.dueDate), task.status),
    }));
    res.json({
        dueToday: normalizedTasks.filter((task) => task.status !== "done" && (0, date_1.isSameDay)(new Date(task.dueDate), today)),
        overdue: normalizedTasks.filter((task) => task.status === "overdue"),
        shoppingNeeded: shopping.filter((item) => item.status === "needed"),
        recentExpenses: expenses,
        balances: balanceData.balances,
        settleUps: balanceData.settleUps,
        fairness,
    });
}
