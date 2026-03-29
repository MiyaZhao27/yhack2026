import { Expense } from "../models/Expense";
import { Settlement } from "../models/Settlement";

interface AllocationEntry {
  expenseId: string;
  debtorId: string;
  creditorId: string;
  amount: number;
  allocationRole?: "settled" | "offset" | null;
}

/**
 * Records an actual payment from payerId -> receiverId.
 * This only reduces obligations from this payer to this receiver.
 * No third-party simplification is ever involved.
 * FIFO by oldest unpaid obligation.
 */
export async function createSettlement(input: {
  suiteId: string;
  payerId: string;
  receiverId: string;
  amount: number;
  date: Date;
  note?: string;
}) {
  const expenses = (await Expense.find({
    suiteId: input.suiteId,
    paidBy: input.receiverId,
  })
    .sort({ date: 1, _id: 1 })
    .lean()) as any[];

  // Count prior payment allocations already applied for this exact debtor -> creditor pair.
  const allSettlements = (await Settlement.find({
    suiteId: input.suiteId,
    type: "payment",
  }).lean()) as any[];

  const priorAllocated = new Map<string, number>(); // expenseId -> amount already covered
  for (const s of allSettlements) {
    for (const a of s.allocations ?? []) {
      if (
        String(a.debtorId) === input.payerId &&
        String(a.creditorId) === input.receiverId
      ) {
        const expenseId = String(a.expenseId);
        priorAllocated.set(expenseId, (priorAllocated.get(expenseId) ?? 0) + a.amount);
      }
    }
  }

  // Build open obligations only for payerId -> receiverId
  const obligations: { expenseId: string; remaining: number }[] = [];

  for (const expense of expenses) {
    let owedAmount = 0;

    if (expense.splits?.length > 0) {
      const split = expense.splits.find(
        (s: any) => String(s.participantId) === input.payerId
      );
      owedAmount = split?.owedAmount ?? 0;
    } else {
      const isParticipant = (expense.participants ?? []).some(
        (p: any) => String(p) === input.payerId
      );
      if (isParticipant) {
        owedAmount = expense.amount / (expense.participants?.length || 1);
      }
    }

    if (owedAmount <= 0.005) continue;

    const covered = priorAllocated.get(String(expense._id)) ?? 0;
    const remaining = Number((owedAmount - covered).toFixed(2));
    if (remaining > 0.005) {
      obligations.push({
        expenseId: String(expense._id),
        remaining,
      });
    }
  }

  const totalOpen = Number(
    obligations.reduce((sum, o) => sum + o.remaining, 0).toFixed(2)
  );

  if (input.amount > totalOpen + 0.005) {
    throw new Error(
      `Payment of $${input.amount.toFixed(
        2
      )} exceeds open obligations of $${totalOpen.toFixed(
        2
      )} from this payer to this receiver`
    );
  }

  const allocations: AllocationEntry[] = [];
  let remainingPayment = Number(input.amount.toFixed(2));

  for (const obligation of obligations) {
    if (remainingPayment <= 0.005) break;

    const allocated = Number(
      Math.min(remainingPayment, obligation.remaining).toFixed(2)
    );

    allocations.push({
      expenseId: obligation.expenseId,
      debtorId: input.payerId,
      creditorId: input.receiverId,
      amount: allocated,
    });

    remainingPayment = Number((remainingPayment - allocated).toFixed(2));
  }

  return Settlement.create({
    suiteId: input.suiteId,
    payerId: input.payerId,
    receiverId: input.receiverId,
    amount: Number(input.amount.toFixed(2)),
    date: input.date,
    note: input.note ?? "",
    status: "confirmed",
    type: "payment",
    allocations,
  });
}

/**
 * Legacy compatibility hook.
 * We keep this function because callers invoke it after expense/settlement updates.
 * The desired behavior is direct payer -> payee debt only, so netting records are removed.
 */
export async function recomputeNetting(suiteId: string) {
  // Keep debt and balances strictly tied to direct payer -> payee records.
  // Existing netting docs are cleaned up, and no new netting records are generated.
  await Settlement.deleteMany({ suiteId, type: "netting" });
}
