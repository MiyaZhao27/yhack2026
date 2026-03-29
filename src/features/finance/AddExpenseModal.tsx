"use client";

import { useEffect, useState } from "react";
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
  initialTab?: Tab;
  onSuccess: (
    expense: Expense,
    balances: Balance[],
    settleUps: { from: string; to: string; amount: number }[]
  ) => void;
  onClose: () => void;
}

type Tab = "manual" | "receipt";

export function AddExpenseModal({ members, suiteId, initialTab = "manual", onSuccess, onClose }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

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
      className="modal-shell"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#2a1738]">Add Expense</h2>
          <button
            type="button"
            onClick={onClose}
            className="button-ghost p-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="segmented mb-5 flex w-full">
          {(["manual", "receipt"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`flex-1 ${tab === t ? "segment-button-active" : "segment-button"}`}
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
