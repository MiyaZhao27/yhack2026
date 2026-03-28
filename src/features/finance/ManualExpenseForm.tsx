"use client";

import { FormEvent, useState } from "react";

import {
  computeEqualSplits,
  computeExactSplits,
  computePercentageSplits,
  validateExactSplits,
  validatePercentageSplits,
} from "../../lib/finance/calculations";
import { formatCurrency } from "../../lib/ui/format";
import { ExpenseSplit, Member, SplitMethod } from "../../types";

export interface ManualExpenseData {
  title: string;
  amount: number;
  paidBy: string;
  date: string;
  participants: string[];
  splitMethod: SplitMethod;
  splits: ExpenseSplit[];
}

interface Props {
  members: Member[];
  onSubmit: (data: ManualExpenseData) => Promise<void>;
  submitting: boolean;
}

export function ManualExpenseForm({ members, onSubmit, submitting }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(members[0]?._id || "");
  const [date, setDate] = useState(today);
  const [participants, setParticipants] = useState<string[]>(members.map((m) => m._id));
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal");
  const [splitEntries, setSplitEntries] = useState<{ participantId: string; value: string }[]>([]);
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

    return { splits: [], error: "Unknown split method" };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Title is required");
    if (!totalAmount || totalAmount <= 0) return setError("Enter a valid amount");
    if (!paidBy) return setError("Select who paid");
    if (activeMembers.length === 0) return setError("Select at least one participant");

    const { splits, error: splitError } = resolveSplits();
    if (splitError) return setError(splitError);

    await onSubmit({
      title: title.trim(),
      amount: totalAmount,
      paidBy,
      date,
      participants: activeMembers.map((m) => m._id),
      splitMethod,
      splits,
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

      {/* Split method */}
      <div className="rounded-xl bg-slate-50 p-3">
        <p className="mb-2 text-sm font-medium text-slate-700">Split Method</p>
        <div className="flex gap-2">
          {(["equal", "exact", "percentage"] as SplitMethod[]).map((method) => (
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
              {method === "equal" ? "Equal" : method === "exact" ? "Exact Amount" : "Percentage"}
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

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button className="button-primary w-full" type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save Expense"}
      </button>
    </form>
  );
}
