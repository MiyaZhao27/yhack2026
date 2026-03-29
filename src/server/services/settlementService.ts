import { Expense } from "../models/Expense";
import { Settlement } from "../models/Settlement";

interface AllocationEntry {
  expenseId: string;
  debtorId: string;
  creditorId: string;
  amount: number;
}

/**
 * Records a net settlement payment from payerId → receiverId.
 * Automatically allocates the payment across payerId's outstanding obligations
 * to receiverId using FIFO (oldest expense first).
 */
export async function createSettlement(input: {
  suiteId: string;
  payerId: string;
  receiverId: string;
  amount: number;
  date: Date;
  note?: string;
}) {
  // All expenses where receiverId is the payer, sorted oldest first (FIFO)
  const expenses = (await Expense.find({
    suiteId: input.suiteId,
    paidBy: input.receiverId,
  })
    .sort({ date: 1 })
    .lean()) as any[];

  // Existing allocations from payerId → receiverId (to compute already-covered amounts)
  const priorSettlements = (await Settlement.find({
    suiteId: input.suiteId,
    payerId: input.payerId,
    receiverId: input.receiverId,
  }).lean()) as any[];

  const priorAllocated = new Map<string, number>(); // expenseId → amount already covered
  for (const s of priorSettlements) {
    for (const a of s.allocations ?? []) {
      const key = String(a.expenseId);
      priorAllocated.set(key, (priorAllocated.get(key) ?? 0) + a.amount);
    }
  }

  // Build obligation list: how much payerId still owes receiverId per expense
  const obligations: { expenseId: string; remaining: number }[] = [];
  for (const expense of expenses) {
    // Determine payerId's share in this expense
    let owedAmount = 0;
    if (expense.splits?.length > 0) {
      const split = expense.splits.find(
        (s: any) => String(s.participantId) === input.payerId
      );
      owedAmount = split?.owedAmount ?? 0;
    } else {
      // Legacy: equal split
      const isParticipant = (expense.participants ?? []).some(
        (p: any) => String(p) === input.payerId
      );
      if (isParticipant) {
        owedAmount = expense.amount / (expense.participants?.length || 1);
      }
    }

    if (owedAmount <= 0.005) continue;

    const covered = priorAllocated.get(String(expense._id)) ?? 0;
    const remaining = owedAmount - covered;
    if (remaining > 0.005) {
      obligations.push({ expenseId: String(expense._id), remaining });
    }
  }

  // FIFO allocation
  const allocations: AllocationEntry[] = [];
  let remainingPayment = input.amount;

  for (const obligation of obligations) {
    if (remainingPayment <= 0.005) break;
    const allocated = Math.min(remainingPayment, obligation.remaining);
    allocations.push({
      expenseId: obligation.expenseId,
      debtorId: input.payerId,
      creditorId: input.receiverId,
      amount: Number(allocated.toFixed(2)),
    });
    remainingPayment = Number((remainingPayment - allocated).toFixed(2));
  }

  const settlement = await Settlement.create({
    suiteId: input.suiteId,
    payerId: input.payerId,
    receiverId: input.receiverId,
    amount: input.amount,
    date: input.date,
    note: input.note ?? "",
    status: "confirmed",
    allocations,
  });

  return settlement;
}
