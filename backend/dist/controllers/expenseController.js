"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpenses = getExpenses;
exports.createExpense = createExpense;
exports.getBalances = getBalances;
const Expense_1 = require("../models/Expense");
const balanceService_1 = require("../services/balanceService");
async function getExpenses(req, res) {
    const { suiteId } = req.query;
    const expenses = await Expense_1.Expense.find(suiteId ? { suiteId } : {}).sort({ createdAt: -1 }).lean();
    res.json(expenses);
}
async function createExpense(req, res) {
    const expense = await Expense_1.Expense.create({
        ...req.body,
        splitType: "equal",
    });
    const balanceData = await (0, balanceService_1.getSuiteBalances)(String(expense.suiteId));
    res.status(201).json({ expense, ...balanceData });
}
async function getBalances(req, res) {
    const data = await (0, balanceService_1.getSuiteBalances)(String(req.params.suiteId));
    res.json(data);
}
