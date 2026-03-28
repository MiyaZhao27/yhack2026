"use client";

import { FormEvent, useState } from "react";
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
  prefill?: { payerId?: string; receiverId?: string; amount?: number };
  onSuccess: (
    settlement: Settlement,
    balances: Balance[],
    settleUps: SettlementResponse["settleUps"]
  ) => void;
  onClose: () => void;
}

export function RecordPaymentModal({ members, suiteId, prefill, onSuccess, onClose }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [payerId, setPayerId] = useState(prefill?.payerId ?? "");
  const [receiverId, setReceiverId] = useState(prefill?.receiverId ?? "");
  const [amount, setAmount] = useState(prefill?.amount != null ? String(prefill.amount) : "");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!payerId) return setError("Select who paid");
    if (!receiverId) return setError("Select who received");
    if (payerId === receiverId) return setError("Payer and receiver must be different");
    if (!amount || parseFloat(amount) <= 0) return setError("Enter a valid amount");

    setSubmitting(true);
    try {
      const res = await api.post<SettlementResponse>("/settlements", {
        suiteId,
        payerId,
        receiverId,
        amount: parseFloat(amount),
        date,
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
                  setPayerId(e.target.value);
                  if (e.target.value === receiverId) setReceiverId("");
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
                onChange={(e) => setReceiverId(e.target.value)}
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

          <div className="flex gap-3">
            <div className="flex-1">
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
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
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
