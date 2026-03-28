"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuiteBalances = getSuiteBalances;
exports.getFairnessSummary = getFairnessSummary;
const Expense_1 = require("../models/Expense");
const ShoppingItem_1 = require("../models/ShoppingItem");
const Task_1 = require("../models/Task");
const User_1 = require("../models/User");
async function getSuiteBalances(suiteId) {
    const [members, expenses] = await Promise.all([
        User_1.User.find({ suiteId }).lean(),
        Expense_1.Expense.find({ suiteId }).lean(),
    ]);
    const balances = new Map();
    members.forEach((member) => {
        balances.set(String(member._id), {
            userId: String(member._id),
            name: member.name,
            net: 0,
            paid: 0,
            owed: 0,
        });
    });
    expenses.forEach((expense) => {
        const paidById = String(expense.paidBy);
        const share = expense.participants.length ? expense.amount / expense.participants.length : 0;
        const payer = balances.get(paidById);
        if (payer) {
            payer.paid += expense.amount;
            payer.net += expense.amount;
        }
        expense.participants.forEach((participantId) => {
            const member = balances.get(String(participantId));
            if (member) {
                member.owed += share;
                member.net -= share;
            }
        });
    });
    const creditors = [...balances.values()]
        .filter((member) => member.net > 0.01)
        .map((member) => ({ ...member }));
    const debtors = [...balances.values()]
        .filter((member) => member.net < -0.01)
        .map((member) => ({ ...member, net: Math.abs(member.net) }));
    const settleUps = [];
    let creditorIndex = 0;
    let debtorIndex = 0;
    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
        const creditor = creditors[creditorIndex];
        const debtor = debtors[debtorIndex];
        const amount = Math.min(creditor.net, debtor.net);
        settleUps.push({
            from: debtor.name,
            to: creditor.name,
            amount: Number(amount.toFixed(2)),
        });
        creditor.net -= amount;
        debtor.net -= amount;
        if (creditor.net <= 0.01)
            creditorIndex += 1;
        if (debtor.net <= 0.01)
            debtorIndex += 1;
    }
    return {
        balances: [...balances.values()].map((member) => ({
            ...member,
            net: Number(member.net.toFixed(2)),
            paid: Number(member.paid.toFixed(2)),
            owed: Number(member.owed.toFixed(2)),
        })),
        settleUps,
    };
}
async function getFairnessSummary(suiteId) {
    const [members, tasks, shoppingItems, expenses] = await Promise.all([
        User_1.User.find({ suiteId }).lean(),
        Task_1.Task.find({ suiteId, status: "done" }).lean(),
        ShoppingItem_1.ShoppingItem.find({ suiteId, status: "bought" }).lean(),
        Expense_1.Expense.find({ suiteId }).lean(),
    ]);
    const taskCounts = new Map();
    const shoppingCounts = new Map();
    const expensePaid = new Map();
    members.forEach((member) => {
        taskCounts.set(String(member._id), 0);
        shoppingCounts.set(String(member._id), 0);
        expensePaid.set(String(member._id), 0);
    });
    tasks.forEach((task) => {
        const key = String(task.assigneeId);
        taskCounts.set(key, (taskCounts.get(key) || 0) + 1);
    });
    shoppingItems.forEach((item) => {
        if (item.boughtBy) {
            const key = String(item.boughtBy);
            shoppingCounts.set(key, (shoppingCounts.get(key) || 0) + 1);
        }
    });
    expenses.forEach((expense) => {
        const key = String(expense.paidBy);
        expensePaid.set(key, Number(((expensePaid.get(key) || 0) + expense.amount).toFixed(2)));
    });
    return members.map((member) => ({
        userId: String(member._id),
        name: member.name,
        tasksCompleted: taskCounts.get(String(member._id)) || 0,
        shoppingBought: shoppingCounts.get(String(member._id)) || 0,
        expensesPaid: expensePaid.get(String(member._id)) || 0,
    }));
}
