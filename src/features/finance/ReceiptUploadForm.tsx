"use client";

import { FormEvent, useState } from "react";
import { ChevronLeft } from "lucide-react";

import { ReceiptUpload } from "../../components/ReceiptUpload";
import { applyProportionalFees, computeItemizedSplits } from "../../lib/finance/calculations";
import { NormalizedReceipt } from "../../lib/ocr/normalizeReceipt";
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
  const allIds = members.map((member) => member._id);

  const [step, setStep] = useState<"upload" | "review">("upload");
  const [title, setTitle] = useState("");
  const [paidBy, setPaidBy] = useState(members[0]?._id || "");
  const [date, setDate] = useState(today);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [fees, setFees] = useState("");
  const [error, setError] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [dateTouched, setDateTouched] = useState(false);
  const [ocrMeta, setOcrMeta] = useState<NormalizedReceipt | null>(null);

  const handleScanResult = (receipt: NormalizedReceipt) => {
    setError("");
    setOcrMeta(receipt);

    if (!titleTouched && !title.trim() && receipt.merchantName) {
      setTitle(receipt.merchantName);
    }

    if (!dateTouched && receipt.purchaseDate) {
      setDate(receipt.purchaseDate);
    }

    setFees(receipt.fees ? String(receipt.fees) : "");

    if (receipt.items && receipt.items.length > 0) {
      setItems(
        receipt.items.map((item) => ({
          name: item.name,
          amount: String(item.amount),
          assignedParticipants: [...allIds],
        }))
      );
    } else if (receipt.total) {
      setItems([
        {
          name: receipt.merchantName ? `${receipt.merchantName} total` : "Receipt total",
          amount: String(receipt.total),
          assignedParticipants: [...allIds],
        },
      ]);
    } else {
      setItems([]);
    }

    setStep("review");
  };

  const updateItem = (index: number, field: "name" | "amount", value: string) => {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  };

  const toggleItemParticipant = (itemIndex: number, memberId: string) => {
    setItems((current) =>
      current.map((item, currentIndex) => {
        if (currentIndex !== itemIndex) return item;
        const assignedParticipants = item.assignedParticipants.includes(memberId)
          ? item.assignedParticipants.filter((id) => id !== memberId)
          : [...item.assignedParticipants, memberId];
        return { ...item, assignedParticipants };
      })
    );
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number.parseFloat(item.amount) || 0), 0);

  const expenseItems: ExpenseItem[] = items.map((item) => ({
    name: item.name,
    amount: Number.parseFloat(item.amount) || 0,
    assignedParticipants: item.assignedParticipants,
  }));

  const feesAmount = Number.parseFloat(fees) || 0;
  const computedSplits = applyProportionalFees(computeItemizedSplits(expenseItems), feesAmount);
  const nameFor = (id: string) => members.find((member) => member._id === id)?.name ?? "?";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (items.some((item) => item.assignedParticipants.length === 0)) {
      return setError("Every item must have at least one participant assigned.");
    }

    if (items.some((item) => !Number.parseFloat(item.amount) || Number.parseFloat(item.amount) === 0)) {
      return setError("All items must have a valid amount.");
    }

    const allParticipants = [...new Set(items.flatMap((item) => item.assignedParticipants))];

    await onSubmit({
      title: title.trim() || ocrMeta?.merchantName || "Receipt purchase",
      amount: Number((totalAmount + feesAmount).toFixed(2)),
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
          onChange={(event) => {
            setTitleTouched(true);
            setTitle(event.target.value);
          }}
        />

        <div className="flex gap-3">
          <input
            className="input flex-1"
            type="date"
            value={date}
            onChange={(event) => {
              setDateTouched(true);
              setDate(event.target.value);
            }}
          />
          <select
            className="input flex-1"
            value={paidBy}
            onChange={(event) => setPaidBy(event.target.value)}
          >
            <option value="">Paid by...</option>
            {members.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <ReceiptUpload onScanned={handleScanResult} />

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    );
  }

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
                onChange={(event) => updateItem(index, "name", event.target.value)}
                placeholder="Item name"
              />
              <input
                className="input w-28"
                type="number"
                step="0.01"
                value={item.amount}
                onChange={(event) => updateItem(index, "amount", event.target.value)}
                placeholder="$0.00"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {members.map((member) => {
                const assigned = item.assignedParticipants.includes(member._id);
                return (
                  <button
                    key={member._id}
                    type="button"
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      assigned ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                    onClick={() => toggleItemParticipant(index, member._id)}
                  >
                    {member.name}
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
            setItems((current) => [
              ...current,
              { name: "", amount: "", assignedParticipants: [...allIds] },
            ])
          }
        >
          + Add Item
        </button>
      </div>

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

      {computedSplits.length > 0 ? (
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="mb-2 text-xs font-medium text-emerald-700">
            Computed splits (total: {formatCurrency(totalAmount + feesAmount)}):
          </p>
          {computedSplits.map((split) => (
            <div key={split.participantId} className="flex justify-between text-sm text-emerald-900">
              <span>{nameFor(split.participantId)}</span>
              <span className="font-medium">{formatCurrency(split.owedAmount)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <button className="button-primary w-full" type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save Expense"}
      </button>
    </form>
  );
}
