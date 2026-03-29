"use client";

import { FormEvent, useState } from "react";
import { ChevronLeft, Upload } from "lucide-react";

import { computeItemizedSplits } from "../../lib/finance/calculations";
import { parseReceipt } from "../../lib/finance/mockParser";
import { formatCurrency } from "../../lib/ui/format";
import { ExpenseItem, ExpenseSplit, Member } from "../../types";

export interface ReceiptExpenseData {
  title: string;
  amount: number;
  paidBy: string;
  date: string;
  participants: string[];
  splitMethod: "itemized";
  splits: ExpenseSplit[];
  items: ExpenseItem[];
}

interface EditableItem {
  name: string;
  amount: string;
  assignedParticipants: string[];
}

interface Props {
  members: Member[];
  onSubmit: (data: ReceiptExpenseData) => Promise<void>;
  submitting: boolean;
}

export function ReceiptUploadForm({ members, onSubmit, submitting }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const allIds = members.map((m) => m._id);

  const [step, setStep] = useState<"upload" | "review">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [title, setTitle] = useState("");
  const [paidBy, setPaidBy] = useState(members[0]?._id || "");
  const [date, setDate] = useState(today);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [error, setError] = useState("");

  const handleParse = async () => {
    if (!file) return setError("Select a receipt file first");
    if (!title.trim()) return setError("Enter a title for this expense");
    if (!paidBy) return setError("Select who paid");
    setError("");
    setParsing(true);
    try {
      const parsed = await parseReceipt(file);
      setItems(
        parsed.map((item) => ({
          name: item.name,
          amount: String(item.amount),
          assignedParticipants: [...allIds],
        }))
      );
      setStep("review");
    } finally {
      setParsing(false);
    }
  };

  const updateItem = (index: number, field: "name" | "amount", value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const toggleItemParticipant = (itemIndex: number, memberId: string) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        const assigned = item.assignedParticipants.includes(memberId)
          ? item.assignedParticipants.filter((id) => id !== memberId)
          : [...item.assignedParticipants, memberId];
        return { ...item, assignedParticipants: assigned };
      })
    );
  };

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const expenseItems: ExpenseItem[] = items.map((item) => ({
    name: item.name,
    amount: parseFloat(item.amount) || 0,
    assignedParticipants: item.assignedParticipants,
  }));

  const computedSplits = computeItemizedSplits(expenseItems);

  const nameFor = (id: string) => members.find((m) => m._id === id)?.name ?? "?";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (items.some((item) => item.assignedParticipants.length === 0)) {
      return setError("Every item must have at least one participant assigned");
    }
    if (items.some((item) => !parseFloat(item.amount) || parseFloat(item.amount) <= 0)) {
      return setError("All items must have a valid amount");
    }
    const allParticipants = [...new Set(items.flatMap((item) => item.assignedParticipants))];
    await onSubmit({
      title: title.trim(),
      amount: totalAmount,
      paidBy,
      date,
      participants: allParticipants,
      splitMethod: "itemized",
      splits: computedSplits,
      items: expenseItems,
    });
  };

  if (step === "upload") {
    return (
      <div className="space-y-4">
        <input
          className="input"
          placeholder="Expense title (e.g. Grocery run)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="flex gap-3">
          <input
            className="input flex-1"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <select className="input flex-1" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            <option value="">Paid by...</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-8 transition-colors hover:border-slate-400">
          <Upload size={24} className="mb-2 text-slate-400" />
          <span className="text-sm text-slate-500">
            {file ? file.name : "Click to upload receipt"}
          </span>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          className="button-primary w-full"
          type="button"
          onClick={handleParse}
          disabled={parsing}
        >
          {parsing ? "Parsing..." : "Parse Receipt"}
        </button>

        <p className="text-center text-xs text-slate-400">
          Using mock parser — replace with real OCR in production
        </p>
      </div>
    );
  }

  // Review step
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button
        type="button"
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        onClick={() => setStep("upload")}
      >
        <ChevronLeft size={14} /> Back
      </button>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">Review Items</p>
        {items.map((item, index) => (
          <div key={index} className="space-y-2 rounded-xl border border-slate-200 p-3">
            <div className="flex gap-2">
              <input
                className="input flex-1"
                value={item.name}
                onChange={(e) => updateItem(index, "name", e.target.value)}
                placeholder="Item name"
              />
              <input
                className="input w-28"
                type="number"
                min="0.01"
                step="0.01"
                value={item.amount}
                onChange={(e) => updateItem(index, "amount", e.target.value)}
                placeholder="$0.00"
              />
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
                    onClick={() => toggleItemParticipant(index, m._id)}
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
            setItems((prev) => [
              ...prev,
              { name: "", amount: "", assignedParticipants: [...allIds] },
            ])
          }
        >
          + Add Item
        </button>
      </div>

      {computedSplits.length > 0 && (
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="mb-2 text-xs font-medium text-emerald-700">
            Computed splits (total: {formatCurrency(totalAmount)}):
          </p>
          {computedSplits.map((s) => (
            <div key={s.participantId} className="flex justify-between text-sm text-emerald-900">
              <span>{nameFor(s.participantId)}</span>
              <span className="font-medium">{formatCurrency(s.owedAmount)}</span>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button className="button-primary w-full" type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save Expense"}
      </button>
    </form>
  );
}
