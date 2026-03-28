import { Expense } from "../models/Expense";
<<<<<<< HEAD
import { Settlement } from "../models/Settlement";
=======
>>>>>>> origin/lauren/tasks
import { ShoppingItem } from "../models/ShoppingItem";
import { Task } from "../models/Task";
import { User } from "../models/User";

interface BalanceMember {
  userId: string;
  name: string;
<<<<<<< HEAD
  paid: number;        // total fronted as expense payer
  owed: number;        // gross sum of all expense splits
  net: number;         // paid - owed (theoretical)
  settledOut: number;  // total paid via recorded settlements
  settledIn: number;   // total received via recorded settlements
  outstanding: number;    // what this person still owes to others (after settlements)
  outstandingNet: number; // outstandingReceivable - outstanding
}


export async function getSuiteBalances(suiteId: string) {
  const [members, expenses, settlements] = (await Promise.all([
    User.find({ suiteId }).lean(),
    Expense.find({ suiteId }).lean(),
    Settlement.find({ suiteId }).lean(),
  ])) as [any[], any[], any[]];

  const balances = new Map<string, BalanceMember>();
  members.forEach((m: any) => {
    balances.set(String(m._id), {
      userId: String(m._id),
      name: m.name,
      paid: 0,
      owed: 0,
      net: 0,
      settledOut: 0,
      settledIn: 0,
      outstanding: 0,
      outstandingNet: 0,
    });
  });

  // Raw obligations from expenses: rawObligation[debtorId][creditorId] = amount
  // debtor = non-payer participant, creditor = expense payer
  const rawObligation = new Map<string, Map<string, number>>();

  expenses.forEach((expense: any) => {
    const creditorId = String(expense.paidBy);
    const payer = balances.get(creditorId);
=======
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
>>>>>>> origin/lauren/tasks
    if (payer) {
      payer.paid += expense.amount;
      payer.net += expense.amount;
    }

<<<<<<< HEAD
    if (expense.splits?.length > 0) {
      expense.splits.forEach((split: any) => {
        const debtorId = String(split.participantId);
        const member = balances.get(debtorId);
        if (!member) return;
        member.owed += split.owedAmount;
        member.net -= split.owedAmount;
        if (debtorId === creditorId) return; // payer's own share — not a real debt

        if (!rawObligation.has(debtorId)) rawObligation.set(debtorId, new Map());
        rawObligation
          .get(debtorId)!
          .set(creditorId, (rawObligation.get(debtorId)!.get(creditorId) ?? 0) + split.owedAmount);
      });
    } else {
      // Legacy: equal split fallback
      const share = expense.participants?.length
        ? expense.amount / expense.participants.length
        : 0;
      (expense.participants ?? []).forEach((pid: any) => {
        const debtorId = String(pid);
        const member = balances.get(debtorId);
        if (!member) return;
        member.owed += share;
        member.net -= share;
        if (debtorId === creditorId) return;

        if (!rawObligation.has(debtorId)) rawObligation.set(debtorId, new Map());
        rawObligation
          .get(debtorId)!
          .set(creditorId, (rawObligation.get(debtorId)!.get(creditorId) ?? 0) + share);
      });
    }
  });

  // Applied allocations from settlements: appliedAlloc[debtorId][creditorId] = total allocated
  const appliedAlloc = new Map<string, Map<string, number>>();

  settlements.forEach((s: any) => {
    const payerId = String(s.payerId);
    const receiverId = String(s.receiverId);
    const p = balances.get(payerId);
    const r = balances.get(receiverId);
    if (p) p.settledOut += s.amount;
    if (r) r.settledIn += s.amount;

    (s.allocations ?? []).forEach((a: any) => {
      const d = String(a.debtorId);
      const c = String(a.creditorId);
      if (!appliedAlloc.has(d)) appliedAlloc.set(d, new Map());
      appliedAlloc.get(d)!.set(c, (appliedAlloc.get(d)!.get(c) ?? 0) + a.amount);
    });
  });

  // Compute remaining obligations per (debtor, creditor) pair
  const remaining = new Map<string, Map<string, number>>();
  for (const [debtorId, credMap] of rawObligation) {
    for (const [creditorId, rawAmt] of credMap) {
      const applied = appliedAlloc.get(debtorId)?.get(creditorId) ?? 0;
      const rem = Math.max(0, rawAmt - applied);
      if (rem > 0.005) {
        if (!remaining.has(debtorId)) remaining.set(debtorId, new Map());
        remaining.get(debtorId)!.set(creditorId, rem);
      }
    }
  }

  // Compute per-member outstanding positions
  for (const [memberId, member] of balances) {
    let outstandingOwed = 0;
    for (const [, amt] of remaining.get(memberId) ?? new Map()) outstandingOwed += amt;

    let outstandingReceivable = 0;
    for (const [, credMap] of remaining) {
      outstandingReceivable += credMap.get(memberId) ?? 0;
    }

    member.outstanding = Number(outstandingOwed.toFixed(2));
    member.outstandingNet = Number((outstandingReceivable - outstandingOwed).toFixed(2));
  }

  const balanceRows = [...balances.values()].map((m) => ({
    userId: m.userId,
    name: m.name,
    paid: Number(m.paid.toFixed(2)),
    owed: Number(m.owed.toFixed(2)),
    net: Number(m.net.toFixed(2)),
    settledOut: Number(m.settledOut.toFixed(2)),
    settledIn: Number(m.settledIn.toFixed(2)),
    outstanding: Number(m.outstanding.toFixed(2)),
    outstandingNet: Number(m.outstandingNet.toFixed(2)),
  }));

  // Build settle-ups from actual pairwise remaining obligations (not net netting)
  // This ensures each suggestion corresponds to a real debt between two specific people.
  const settleUps: { from: string; fromId: string; to: string; toId: string; amount: number }[] = [];
  for (const [debtorId, credMap] of remaining) {
    const debtor = balances.get(debtorId);
    if (!debtor) continue;
    for (const [creditorId, amount] of credMap) {
      const creditor = balances.get(creditorId);
      if (!creditor) continue;
      settleUps.push({
        from: debtor.name,
        fromId: debtorId,
        to: creditor.name,
        toId: creditorId,
        amount: Number(amount.toFixed(2)),
      });
    }
  }

  return { balances: balanceRows, settleUps };
=======
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
>>>>>>> origin/lauren/tasks
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
<<<<<<< HEAD
    taskCounts.set(key, (taskCounts.get(key) ?? 0) + 1);
=======
    taskCounts.set(key, (taskCounts.get(key) || 0) + 1);
>>>>>>> origin/lauren/tasks
  });

  shoppingItems.forEach((item: any) => {
    if (item.boughtBy) {
      const key = String(item.boughtBy);
<<<<<<< HEAD
      shoppingCounts.set(key, (shoppingCounts.get(key) ?? 0) + 1);
=======
      shoppingCounts.set(key, (shoppingCounts.get(key) || 0) + 1);
>>>>>>> origin/lauren/tasks
    }
  });

  expenses.forEach((expense: any) => {
    const key = String(expense.paidBy);
<<<<<<< HEAD
    expensePaid.set(key, Number(((expensePaid.get(key) ?? 0) + expense.amount).toFixed(2)));
=======
    expensePaid.set(key, Number(((expensePaid.get(key) || 0) + expense.amount).toFixed(2)));
>>>>>>> origin/lauren/tasks
  });

  return members.map((member: any) => ({
    userId: String(member._id),
    name: member.name,
<<<<<<< HEAD
    tasksCompleted: taskCounts.get(String(member._id)) ?? 0,
    shoppingBought: shoppingCounts.get(String(member._id)) ?? 0,
    expensesPaid: expensePaid.get(String(member._id)) ?? 0,
=======
    tasksCompleted: taskCounts.get(String(member._id)) || 0,
    shoppingBought: shoppingCounts.get(String(member._id)) || 0,
    expensesPaid: expensePaid.get(String(member._id)) || 0,
>>>>>>> origin/lauren/tasks
  }));
}
