import { Expense } from "../models/Expense";
import { Settlement } from "../models/Settlement";
import { Task } from "../models/Task";
import { User } from "../models/User";

interface BalanceMember {
  userId: string;
  name: string;
  paid: number;
  owed: number;
  net: number;
  settledOut: number;
  settledIn: number;
  outstanding: number;
  outstandingNet: number;
}

export async function getSuiteBalances(suiteId: string, userId?: string) {
  const [members, expenses, settlements] = (await Promise.all([
    User.find({ suiteId }).lean(),
    Expense.find({ suiteId }).lean(),
    Settlement.find({ suiteId, type: "payment" }).lean(),
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

  // rawObligation[debtorId][creditorId] = total owed from expenses
  const rawObligation = new Map<string, Map<string, number>>();

  for (const expense of expenses) {
    const creditorId = String(expense.paidBy);
    const payer = balances.get(creditorId);

    if (payer) {
      payer.paid += expense.amount;
      payer.net += expense.amount;
    }

    if (expense.splits?.length > 0) {
      for (const split of expense.splits) {
        const debtorId = String(split.participantId);
        const owedAmount = Number((split.owedAmount ?? 0).toFixed(2));
        const member = balances.get(debtorId);
        if (!member) continue;

        member.owed += owedAmount;
        member.net -= owedAmount;

        // payer's own share is not a debt to themselves
        if (debtorId === creditorId) continue;
        if (owedAmount <= 0.005) continue;

        if (!rawObligation.has(debtorId)) rawObligation.set(debtorId, new Map());
        const debtorMap = rawObligation.get(debtorId)!;
        debtorMap.set(
          creditorId,
          Number(((debtorMap.get(creditorId) ?? 0) + owedAmount).toFixed(2))
        );
      }
    } else {
      const share = expense.participants?.length
        ? Number((expense.amount / expense.participants.length).toFixed(2))
        : 0;

      for (const pid of expense.participants ?? []) {
        const debtorId = String(pid);
        const member = balances.get(debtorId);
        if (!member) continue;

        member.owed += share;
        member.net -= share;

        if (debtorId === creditorId) continue;
        if (share <= 0.005) continue;

        if (!rawObligation.has(debtorId)) rawObligation.set(debtorId, new Map());
        const debtorMap = rawObligation.get(debtorId)!;
        debtorMap.set(
          creditorId,
          Number(((debtorMap.get(creditorId) ?? 0) + share).toFixed(2))
        );
      }
    }
  }

  // appliedAlloc[debtorId][creditorId] = total direct payment allocations applied
  const appliedAlloc = new Map<string, Map<string, number>>();

  for (const s of settlements) {
    const payerId = String(s.payerId);
    const receiverId = String(s.receiverId);

    const payer = balances.get(payerId);
    const receiver = balances.get(receiverId);

    if (payer) payer.settledOut += Number((s.amount ?? 0).toFixed(2));
    if (receiver) receiver.settledIn += Number((s.amount ?? 0).toFixed(2));

    for (const a of s.allocations ?? []) {
      const debtorId = String(a.debtorId);
      const creditorId = String(a.creditorId);
      const amount = Number((a.amount ?? 0).toFixed(2));
      if (amount <= 0.005) continue;

      if (!appliedAlloc.has(debtorId)) appliedAlloc.set(debtorId, new Map());
      const debtorMap = appliedAlloc.get(debtorId)!;
      debtorMap.set(
        creditorId,
        Number(((debtorMap.get(creditorId) ?? 0) + amount).toFixed(2))
      );
    }
  }

  // remaining[debtorId][creditorId] = still open after direct payment allocations
  const remaining = new Map<string, Map<string, number>>();

  for (const [debtorId, credMap] of rawObligation) {
    for (const [creditorId, rawAmt] of credMap) {
      const applied = appliedAlloc.get(debtorId)?.get(creditorId) ?? 0;
      const rem = Number(Math.max(0, rawAmt - applied).toFixed(2));

      if (rem > 0.005) {
        if (!remaining.has(debtorId)) remaining.set(debtorId, new Map());
        remaining.get(debtorId)!.set(creditorId, rem);
      }
    }
  }

  // Per-member outstanding positions from direct remaining obligations
  for (const [memberId, member] of balances) {
    let outstandingOwed = 0;
    for (const [, amt] of remaining.get(memberId) ?? new Map()) {
      outstandingOwed += amt;
    }

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

  // Build settle-ups directly from remaining pairwise obligations.
  // No third-party simplification. No extra balance-layer netting.
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

  const filteredSettleUps = userId
    ? settleUps.filter((s) => s.fromId === userId || s.toId === userId)
    : settleUps;

  return { balances: balanceRows, settleUps: filteredSettleUps };
}

export async function getFairnessSummary(suiteId: string) {
  const [members, tasks, expenses] = (await Promise.all([
    User.find({ suiteId }).lean(),
    Task.find({ suiteId, status: "done" }).lean(),
    Expense.find({ suiteId }).lean(),
  ])) as [any[], any[], any[]];

  const taskCounts = new Map<string, number>();
  const expensePaid = new Map<string, number>();

  members.forEach((member: any) => {
    taskCounts.set(String(member._id), 0);
    expensePaid.set(String(member._id), 0);
  });

  tasks.forEach((task: any) => {
    const key = String(task.assigneeId);
    taskCounts.set(key, (taskCounts.get(key) ?? 0) + 1);
  });

  expenses.forEach((expense: any) => {
    const key = String(expense.paidBy);
    expensePaid.set(key, Number(((expensePaid.get(key) ?? 0) + expense.amount).toFixed(2)));
  });

  return members.map((member: any) => ({
    userId: String(member._id),
    name: member.name,
    tasksCompleted: taskCounts.get(String(member._id)) ?? 0,
    expensesPaid: expensePaid.get(String(member._id)) ?? 0,
  }));
}
