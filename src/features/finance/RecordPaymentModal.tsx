"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";

import { api } from "../../lib/api/client";
import { formatCurrency } from "../../lib/ui/format";
import { Balance, Member, Settlement } from "../../types";

interface SettlementResponse {
  settlement: Settlement;
  balances: Balance[];
  settleUps: { from: string; fromId?: string; to: string; toId?: string; amount: number }[];
}

interface Props {
  members: Member[];
  suiteId: string;
  currentUserId: string;
  prefill?: { payerId?: string; receiverId?: string; amount?: number };
  onSuccess: (
    settlement: Settlement,
    balances: Balance[],
    settleUps: SettlementResponse["settleUps"]
  ) => void;
  onClose: () => void;
}

export function RecordPaymentModal({
  members,
  suiteId,
  currentUserId,
  prefill,
  onSuccess,
  onClose,
}: Props) {
  const prefillIncludesCurrentUser =
    prefill?.payerId === currentUserId || prefill?.receiverId === currentUserId;
  const [payerId, setPayerId] = useState(
    prefillIncludesCurrentUser ? (prefill?.payerId ?? currentUserId) : currentUserId
  );
  const [receiverId, setReceiverId] = useState(
    prefillIncludesCurrentUser ? (prefill?.receiverId ?? "") : ""
  );
  const [amount, setAmount] = useState(prefill?.amount != null ? String(prefill.amount) : "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUserId) return;
    if (payerId !== currentUserId && receiverId !== currentUserId) {
      setPayerId(currentUserId);
      setReceiverId("");
    }
  }, [currentUserId, payerId, receiverId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!currentUserId) return setError("Unable to identify current user");
    if (!payerId) return setError("Select who paid");
    if (!receiverId) return setError("Select who received");
    if (payerId !== currentUserId && receiverId !== currentUserId) {
      return setError("Settlement payment must involve your account");
    }
    if (payerId === receiverId) return setError("Payer and receiver must be different");
    if (!amount || parseFloat(amount) <= 0) return setError("Enter a valid amount");

    setSubmitting(true);
    try {
      const res = await api.post<SettlementResponse>("/settlements", {
        suiteId,
        payerId,
        receiverId,
        amount: parseFloat(amount),
        note: note.trim() || undefined,
      });
      onSuccess(res.settlement, res.balances, res.settleUps);
    } catch (err: any) {
      setError(err.message ?? "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const payerName = members.find((m) => m._id === payerId)?.name;
  const receiverName = members.find((m) => m._id === receiverId)?.name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Record Settlement Payment</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {payerName && receiverName && amount && (
          <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {payerName} pays {receiverName} {formatCurrency(parseFloat(amount) || 0)}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Paid by</label>
              <select
                className="input"
                value={payerId}
                onChange={(e) => {
                  const nextPayerId = e.target.value;
                  setPayerId(nextPayerId);

                  if (nextPayerId === receiverId) {
                    setReceiverId("");
                    return;
                  }

                  if (nextPayerId !== currentUserId && receiverId !== currentUserId) {
                    setReceiverId(currentUserId);
                  }
                }}
              >
                <option value="">Select...</option>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Paid to</label>
              <select
                className="input"
                value={receiverId}
                onChange={(e) => {
                  const nextReceiverId = e.target.value;
                  setReceiverId(nextReceiverId);

                  if (nextReceiverId === payerId) {
                    setPayerId("");
                    return;
                  }

                  if (nextReceiverId !== currentUserId && payerId !== currentUserId) {
                    setPayerId(currentUserId);
                  }
                }}
              >
                <option value="">Select...</option>
                {members
                  .filter((m) => m._id !== payerId)
                  .map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Amount ($)</label>
            <input
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <input
            className="input"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button className="button-primary w-full" type="submit" disabled={submitting}>
            {submitting ? "Recording..." : "Record Payment"}
          </button>
        </form>
      </div>
    </div>
  );
}
