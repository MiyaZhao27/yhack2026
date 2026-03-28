import { Expense } from "../models/Expense";
import { ShoppingItem } from "../models/ShoppingItem";
import { Task } from "../models/Task";
import { User } from "../models/User";

interface BalanceMember {
  userId: string;
  name: string;
  net: number;
  paid: number;
  owed: number;
}

export async function getSuiteBalances(suiteId: string) {
  const [members, expenses] = (await Promise.all([
    User.find({ suiteId }).lean(),
    Expense.find({ suiteId }).lean(),
  ])) as [any[], any[]];

  const balances = new Map<string, BalanceMember>();

  members.forEach((member: any) => {
    balances.set(String(member._id), {
      userId: String(member._id),
      name: member.name,
      net: 0,
      paid: 0,
      owed: 0,
    });
  });

  expenses.forEach((expense: any) => {
    const paidById = String(expense.paidBy);
    const share = expense.participants.length ? expense.amount / expense.participants.length : 0;

    const payer = balances.get(paidById);
    if (payer) {
      payer.paid += expense.amount;
      payer.net += expense.amount;
    }

    expense.participants.forEach((participantId: any) => {
      const member = balances.get(String(participantId));
      if (member) {
        member.owed += share;
        member.net -= share;
      }
    });
  });

  const creditors = [...balances.values()]
    .filter((member: BalanceMember) => member.net > 0.01)
    .map((member: BalanceMember) => ({ ...member }));
  const debtors = [...balances.values()]
    .filter((member: BalanceMember) => member.net < -0.01)
    .map((member: BalanceMember) => ({ ...member, net: Math.abs(member.net) }));

  const settleUps: { from: string; to: string; amount: number }[] = [];
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

    if (creditor.net <= 0.01) creditorIndex += 1;
    if (debtor.net <= 0.01) debtorIndex += 1;
  }

  return {
    balances: [...balances.values()].map((member: BalanceMember) => ({
      ...member,
      net: Number(member.net.toFixed(2)),
      paid: Number(member.paid.toFixed(2)),
      owed: Number(member.owed.toFixed(2)),
    })),
    settleUps,
  };
}

export async function getFairnessSummary(suiteId: string) {
  const [members, tasks, shoppingItems, expenses] = (await Promise.all([
    User.find({ suiteId }).lean(),
    Task.find({ suiteId, status: "done" }).lean(),
    ShoppingItem.find({ suiteId, status: "bought" }).lean(),
    Expense.find({ suiteId }).lean(),
  ])) as [any[], any[], any[], any[]];

  const taskCounts = new Map<string, number>();
  const shoppingCounts = new Map<string, number>();
  const expensePaid = new Map<string, number>();

  members.forEach((member: any) => {
    taskCounts.set(String(member._id), 0);
    shoppingCounts.set(String(member._id), 0);
    expensePaid.set(String(member._id), 0);
  });

  tasks.forEach((task: any) => {
    const key = String(task.assigneeId);
    taskCounts.set(key, (taskCounts.get(key) || 0) + 1);
  });

  shoppingItems.forEach((item: any) => {
    if (item.boughtBy) {
      const key = String(item.boughtBy);
      shoppingCounts.set(key, (shoppingCounts.get(key) || 0) + 1);
    }
  });

  expenses.forEach((expense: any) => {
    const key = String(expense.paidBy);
    expensePaid.set(key, Number(((expensePaid.get(key) || 0) + expense.amount).toFixed(2)));
  });

  return members.map((member: any) => ({
    userId: String(member._id),
    name: member.name,
    tasksCompleted: taskCounts.get(String(member._id)) || 0,
    shoppingBought: shoppingCounts.get(String(member._id)) || 0,
    expensesPaid: expensePaid.get(String(member._id)) || 0,
  }));
}
