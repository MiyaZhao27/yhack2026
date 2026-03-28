"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { api } from "../../lib/api/client";
import { Balance, Expense, Member } from "../../types";
import { ManualExpenseForm, ManualExpenseData } from "./ManualExpenseForm";

interface Props {
  expense: Expense;
  members: Member[];
  onSuccess: (expense: Expense, balances: Balance[], settleUps: any[]) => void;
  onClose: () => void;
}

export function EditExpenseModal({ expense, members, onSuccess, onClose }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const initialData: ManualExpenseData = {
    title: expense.title,
    amount: expense.amount,
    paidBy: expense.paidBy,
    date: expense.date ? expense.date.split("T")[0] : new Date().toISOString().split("T")[0],
    participants: expense.participants,
    splitMethod: expense.splitMethod,
    splits: expense.splits,
  };

  const handleSubmit = async (data: ManualExpenseData) => {
    setError("");
    setSubmitting(true);
    try {
      const res = await api.patch<{ expense: Expense; balances: Balance[]; settleUps: any[] }>(
        `/expenses/${expense._id}`,
        data
      );
      onSuccess(res.expense, res.balances, res.settleUps);
    } catch (err: any) {
      setError(err.message ?? "Failed to update expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Edit Expense</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}
        <ManualExpenseForm
          members={members}
          initialData={initialData}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
