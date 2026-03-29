"use client";

import { FormEvent, useState } from "react";

import {
  applyProportionalFees,
  computeEqualSplits,
  computeExactSplits,
  computeItemizedSplits,
  computePercentageSplits,
  validateExactSplits,
  validatePercentageSplits,
} from "../../lib/finance/calculations";
import { formatCurrency } from "../../lib/ui/format";
import { ExpenseItem, ExpenseSplit, Member, SplitMethod } from "../../types";

export interface ManualExpenseData {
  title: string;
  amount: number;
  paidBy: string;
  date: string;
  participants: string[];
  splitMethod: SplitMethod;
  splits: ExpenseSplit[];
  items?: ExpenseItem[];
}

interface Props {
  members: Member[];
  initialData?: ManualExpenseData;
  onSubmit: (data: ManualExpenseData) => Promise<void>;
  submitting: boolean;
}

export function ManualExpenseForm({ members, initialData, onSubmit, submitting }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [amount, setAmount] = useState(initialData?.amount != null ? String(initialData.amount) : "");
  const [paidBy, setPaidBy] = useState(initialData?.paidBy ?? members[0]?._id ?? "");
  const [date, setDate] = useState(initialData?.date ?? today);
  const [participants, setParticipants] = useState<string[]>(initialData?.participants ?? members.map((m) => m._id));
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(initialData?.splitMethod ?? "equal");
  const [splitEntries, setSplitEntries] = useState<{ participantId: string; value: string }[]>(() => {
    if (!initialData?.splits?.length) return [];
    if (initialData.splitMethod === "exact") {
      return initialData.splits.map((s) => ({
        participantId: s.participantId,
        value: String(s.owedAmount),
      }));
    }
    if (initialData.splitMethod === "percentage") {
      return initialData.splits.map((s) => ({
        participantId: s.participantId,
        value: String(s.percentage ?? 0),
      }));
    }
    return [];
  });

  const allIds = members.map((m) => m._id);
  const [lineItems, setLineItems] = useState<{ name: string; amount: string; assignedParticipants: string[] }[]>(
    () =>
      initialData?.items?.map((item) => ({
        name: item.name,
        amount: String(item.amount),
        assignedParticipants: item.assignedParticipants,
      })) ?? []
  );
  const [fees, setFees] = useState("");

  const [error, setError] = useState("");

  const totalAmount = parseFloat(amount) || 0;
  const activeMembers = members.filter((m) => participants.includes(m._id));

  const toggleParticipant = (id: string) => {
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
    setSplitEntries([]);
  };

  const getEntryValue = (participantId: string) =>
    splitEntries.find((e) => e.participantId === participantId)?.value ?? "";

  const setEntryValue = (participantId: string, value: string) => {
    setSplitEntries((prev) => {
      const exists = prev.find((e) => e.participantId === participantId);
      if (exists) return prev.map((e) => (e.participantId === participantId ? { ...e, value } : e));
      return [...prev, { participantId, value }];
    });
  };

  const exactSum = activeMembers.reduce(
    (sum, m) => sum + (parseFloat(getEntryValue(m._id)) || 0),
    0
  );
  const percentSum = activeMembers.reduce(
    (sum, m) => sum + (parseFloat(getEntryValue(m._id)) || 0),
    0
  );

  const resolveSplits = (): { splits: ExpenseSplit[]; error: string } => {
    if (activeMembers.length === 0) return { splits: [], error: "Select at least one participant" };

    if (splitMethod === "equal") {
      return { splits: computeEqualSplits(totalAmount, activeMembers.map((m) => m._id)), error: "" };
    }

    if (splitMethod === "exact") {
      const entries = activeMembers.map((m) => ({
        participantId: m._id,
        owedAmount: parseFloat(getEntryValue(m._id)) || 0,
      }));
      const v = validateExactSplits(entries, totalAmount);
      if (!v.valid) return { splits: [], error: v.error! };
      return { splits: computeExactSplits(entries), error: "" };
    }

    if (splitMethod === "percentage") {
      const entries = activeMembers.map((m) => ({
        participantId: m._id,
        percentage: parseFloat(getEntryValue(m._id)) || 0,
      }));
      const v = validatePercentageSplits(entries);
      if (!v.valid) return { splits: [], error: v.error! };
      return { splits: computePercentageSplits(totalAmount, entries), error: "" };
    }

    if (splitMethod === "itemized") {
      if (lineItems.length === 0) return { splits: [], error: "Add at least one item" };
      if (lineItems.some((item) => item.assignedParticipants.length === 0))
        return { splits: [], error: "Every item must have at least one participant" };
      if (lineItems.some((item) => !parseFloat(item.amount) || parseFloat(item.amount) === 0))
        return { splits: [], error: "All items must have a valid amount" };
      const expenseItems: ExpenseItem[] = lineItems.map((item) => ({
        name: item.name,
        amount: parseFloat(item.amount) || 0,
        assignedParticipants: item.assignedParticipants,
      }));
      const baseSplits = computeItemizedSplits(expenseItems);
      return { splits: applyProportionalFees(baseSplits, parseFloat(fees) || 0), error: "" };
    }

    return { splits: [], error: "Unknown split method" };
  };

  const itemizedSubtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const itemizedFees = parseFloat(fees) || 0;
  const itemizedTotal = Number((itemizedSubtotal + itemizedFees).toFixed(2));
  const effectiveAmount = splitMethod === "itemized" ? itemizedTotal : totalAmount;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Title is required");
    if (splitMethod !== "itemized" && (!totalAmount || totalAmount <= 0)) return setError("Enter a valid amount");
    if (!paidBy) return setError("Select who paid");
    if (splitMethod !== "itemized" && activeMembers.length === 0) return setError("Select at least one participant");

    const { splits, error: splitError } = resolveSplits();
    if (splitError) return setError(splitError);

    const expenseItems: ExpenseItem[] | undefined =
      splitMethod === "itemized"
        ? lineItems.map((item) => ({
            name: item.name,
            amount: parseFloat(item.amount) || 0,
            assignedParticipants: item.assignedParticipants,
          }))
        : undefined;

    const allItemParticipants =
      splitMethod === "itemized"
        ? [...new Set(lineItems.flatMap((item) => item.assignedParticipants))]
        : activeMembers.map((m) => m._id);

    await onSubmit({
      title: title.trim(),
      amount: effectiveAmount,
      paidBy,
      date,
      participants: allItemParticipants,
      splitMethod,
      splits,
      items: expenseItems,
    });
  };

  const equalPreview =
    splitMethod === "equal" && totalAmount > 0 && activeMembers.length > 0
      ? computeEqualSplits(totalAmount, activeMembers.map((m) => m._id))
      : [];

  const nameFor = (id: string) => members.find((m) => m._id === id)?.name ?? "?";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        className="input"
        placeholder="Title (e.g. Trader Joe's run)"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="flex gap-3">
        {splitMethod !== "itemized" && (
        <input
          className="input flex-1"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Amount ($)"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        )}
        <input
          className="input flex-1"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <select className="input" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
        <option value="">Paid by...</option>
        {members.map((m) => (
          <option key={m._id} value={m._id}>
            {m.name}
          </option>
        ))}
      </select>

      {/* Participants */}
      {splitMethod !== "itemized" && (
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-700">Participants</p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const active = participants.includes(m._id);
              return (
                <button
                  key={m._id}
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"
                  }`}
                  onClick={() => toggleParticipant(m._id)}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Split method */}
      <div className="rounded-xl bg-slate-50 p-3">
        <p className="mb-2 text-sm font-medium text-slate-700">Split Method</p>
        <div className="flex gap-2">
          {(["equal", "exact", "percentage", "itemized"] as SplitMethod[]).map((method) => (
            <button
              key={method}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                splitMethod === method
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
              onClick={() => {
                setSplitMethod(method);
                setSplitEntries([]);
              }}
            >
              {method === "equal" ? "Equal" : method === "exact" ? "Exact" : method === "percentage" ? "%" : "Itemized"}
            </button>
          ))}
        </div>
      </div>

      {/* Equal preview */}
      {splitMethod === "equal" && equalPreview.length > 0 && (
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="mb-2 text-xs font-medium text-emerald-700">Each owes:</p>
          {equalPreview.map((s) => (
            <div key={s.participantId} className="flex justify-between text-sm text-emerald-900">
              <span>{nameFor(s.participantId)}</span>
              <span className="font-medium">{formatCurrency(s.owedAmount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Exact amount inputs */}
      {splitMethod === "exact" && activeMembers.length > 0 && (
        <div className="rounded-xl bg-slate-50 p-3 space-y-2">
          <p className="mb-1 text-xs font-medium text-slate-700">Amount per person:</p>
          {activeMembers.map((m) => (
            <div key={m._id} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-sm text-slate-700">{m.name}</span>
              <input
                className="input flex-1"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={getEntryValue(m._id)}
                onChange={(e) => setEntryValue(m._id, e.target.value)}
              />
            </div>
          ))}
          <p
            className={`text-xs font-medium ${
              Math.abs(exactSum - totalAmount) < 0.02 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            Sum: {formatCurrency(exactSum)} / {formatCurrency(totalAmount)}
            {Math.abs(exactSum - totalAmount) < 0.02 ? " ✓" : ""}
          </p>
        </div>
      )}

      {/* Percentage inputs */}
      {splitMethod === "percentage" && activeMembers.length > 0 && (
        <div className="rounded-xl bg-slate-50 p-3 space-y-2">
          <p className="mb-1 text-xs font-medium text-slate-700">Percentage per person:</p>
          {activeMembers.map((m) => (
            <div key={m._id} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-sm text-slate-700">{m.name}</span>
              <input
                className="input w-20"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="0"
                value={getEntryValue(m._id)}
                onChange={(e) => setEntryValue(m._id, e.target.value)}
              />
              <span className="text-sm text-slate-500">%</span>
              {totalAmount > 0 && getEntryValue(m._id) && (
                <span className="ml-auto text-sm text-slate-500">
                  = {formatCurrency((parseFloat(getEntryValue(m._id)) / 100) * totalAmount)}
                </span>
              )}
            </div>
          ))}
          <p
            className={`text-xs font-medium ${
              Math.abs(percentSum - 100) < 0.1 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            Total: {percentSum.toFixed(1)}%
            {Math.abs(percentSum - 100) < 0.1 ? " ✓" : " (must equal 100%)"}
          </p>
        </div>
      )}

      {/* Itemized items */}
      {splitMethod === "itemized" && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Items</p>
          {lineItems.map((item, index) => (
            <div key={index} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  value={item.name}
                  onChange={(e) =>
                    setLineItems((current) =>
                      current.map((li, i) => (i === index ? { ...li, name: e.target.value } : li))
                    )
                  }
                  placeholder="Item name"
                />
                <input
                  className="input w-28"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.amount}
                  onChange={(e) =>
                    setLineItems((current) =>
                      current.map((li, i) => (i === index ? { ...li, amount: e.target.value } : li))
                    )
                  }
                  placeholder="$0.00"
                />
                <button
                  type="button"
                  className="text-slate-400 hover:text-rose-500 transition-colors px-1"
                  onClick={() => setLineItems((current) => current.filter((_, i) => i !== index))}
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => {
                  const assigned = item.assignedParticipants.includes(m._id);
                  return (
                    <button
                      key={m._id}
                      type="button"
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        assigned ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                      onClick={() =>
                        setLineItems((current) =>
                          current.map((li, i) => {
                            if (i !== index) return li;
                            const assignedParticipants = li.assignedParticipants.includes(m._id)
                              ? li.assignedParticipants.filter((id) => id !== m._id)
                              : [...li.assignedParticipants, m._id];
                            return { ...li, assignedParticipants };
                          })
                        )
                      }
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button
            type="button"
            className="button-secondary w-full py-2 text-sm"
            onClick={() =>
              setLineItems((current) => [
                ...current,
                { name: "", amount: "", assignedParticipants: [...allIds] },
              ])
            }
          >
            + Add Item
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <span className="flex-1 text-sm text-slate-600">Tax &amp; Fees (split proportionally)</span>
            <input
              className="input w-28 text-right"
              type="number"
              min="0"
              step="0.01"
              placeholder="$0.00"
              value={fees}
              onChange={(e) => setFees(e.target.value)}
            />
          </div>

          {lineItems.length > 0 && itemizedSubtotal > 0 && (
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="mb-2 text-xs font-medium text-emerald-700">
                Computed splits (total: {formatCurrency(itemizedTotal)}):
              </p>
              {applyProportionalFees(
                computeItemizedSplits(
                  lineItems
                    .filter((item) => parseFloat(item.amount) > 0 && item.assignedParticipants.length > 0)
                    .map((item) => ({
                      name: item.name,
                      amount: parseFloat(item.amount) || 0,
                      assignedParticipants: item.assignedParticipants,
                    }))
                ),
                itemizedFees
              ).map((split) => (
                <div key={split.participantId} className="flex justify-between text-sm text-emerald-900">
                  <span>{nameFor(split.participantId)}</span>
                  <span className="font-medium">{formatCurrency(split.owedAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button className="button-primary w-full" type="submit" disabled={submitting}>
        {submitting ? "Saving..." : initialData ? "Save Changes" : "Save Expense"}
      </button>
    </form>
  );
}
