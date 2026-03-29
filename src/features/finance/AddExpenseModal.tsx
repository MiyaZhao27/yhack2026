"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { api } from "../../lib/api/client";
import { Balance, Expense, Member } from "../../types";
import { ManualExpenseForm, ManualExpenseData } from "./ManualExpenseForm";
import { ReceiptUploadForm, ReceiptExpenseData } from "./ReceiptUploadForm";

interface ExpenseResponse {
  expense: Expense;
  balances: Balance[];
  settleUps: { from: string; to: string; amount: number }[];
}

interface Props {
  members: Member[];
  suiteId: string;
  onSuccess: (
    expense: Expense,
    balances: Balance[],
    settleUps: { from: string; to: string; amount: number }[]
  ) => void;
  onClose: () => void;
}

type Tab = "manual" | "receipt";

export function AddExpenseModal({ members, suiteId, onSuccess, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("manual");
  const [submitting, setSubmitting] = useState(false);

  const submitExpense = async (data: ManualExpenseData | ReceiptExpenseData) => {
    setSubmitting(true);
    try {
      const response = await api.post<ExpenseResponse>("/expenses", {
        suiteId,
        ...data,
      });
      onSuccess(response.expense, response.balances, response.settleUps);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Add Expense</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="mb-5 flex gap-1 rounded-xl bg-slate-100 p-1">
          {(["manual", "receipt"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "manual" ? "Manual Entry" : "Receipt Upload"}
            </button>
          ))}
        </div>

        {tab === "manual" ? (
          <ManualExpenseForm members={members} onSubmit={submitExpense} submitting={submitting} />
        ) : (
          <ReceiptUploadForm members={members} onSubmit={submitExpense} submitting={submitting} />
        )}
      </div>
    </div>
  );
}
