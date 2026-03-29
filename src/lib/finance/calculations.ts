import { ExpenseItem, ExpenseSplit } from "../../types";

export function computeEqualSplits(totalAmount: number, participantIds: string[]): ExpenseSplit[] {
  if (participantIds.length === 0) return [];
  const share = totalAmount / participantIds.length;
  return participantIds.map((id) => ({
    participantId: id,
    owedAmount: Number(share.toFixed(2)),
  }));
}

export function computeExactSplits(
  entries: { participantId: string; owedAmount: number }[]
): ExpenseSplit[] {
  return entries.map((e) => ({
    participantId: e.participantId,
    owedAmount: Number(e.owedAmount.toFixed(2)),
  }));
}

export function computePercentageSplits(
  totalAmount: number,
  entries: { participantId: string; percentage: number }[]
): ExpenseSplit[] {
  return entries.map((e) => ({
    participantId: e.participantId,
    owedAmount: Number(((e.percentage / 100) * totalAmount).toFixed(2)),
    percentage: e.percentage,
  }));
}

export function computeItemizedSplits(items: ExpenseItem[]): ExpenseSplit[] {
  const owedMap = new Map<string, number>();
  for (const item of items) {
    const assigned = item.assignedParticipants;
    if (assigned.length === 0) continue;
    const share = item.amount / assigned.length;
    for (const id of assigned) {
      owedMap.set(id, (owedMap.get(id) || 0) + share);
    }
  }
  return Array.from(owedMap.entries()).map(([participantId, owedAmount]) => ({
    participantId,
    owedAmount: Number(owedAmount.toFixed(2)),
  }));
}

export function applyProportionalFees(splits: ExpenseSplit[], feesAmount: number): ExpenseSplit[] {
  if (!feesAmount || splits.length === 0) return splits;
  const subtotal = splits.reduce((sum, s) => sum + s.owedAmount, 0);
  if (subtotal === 0) return splits;
  return splits.map((s) => ({
    ...s,
    owedAmount: Number((s.owedAmount + (s.owedAmount / subtotal) * feesAmount).toFixed(2)),
  }));
}

export function validateExactSplits(
  splits: { owedAmount: number }[],
  totalAmount: number
): { valid: boolean; error?: string } {
  const sum = splits.reduce((acc, s) => acc + s.owedAmount, 0);
  if (Math.abs(sum - totalAmount) > 0.02) {
    return {
      valid: false,
      error: `Amounts sum to ${sum.toFixed(2)}, expected ${totalAmount.toFixed(2)}`,
    };
  }
  return { valid: true };
}

export function validatePercentageSplits(
  splits: { percentage: number }[]
): { valid: boolean; error?: string } {
  const sum = splits.reduce((acc, s) => acc + s.percentage, 0);
  if (Math.abs(sum - 100) > 0.1) {
    return {
      valid: false,
      error: `Percentages sum to ${sum.toFixed(1)}%, must equal 100%`,
    };
  }
  return { valid: true };
}
