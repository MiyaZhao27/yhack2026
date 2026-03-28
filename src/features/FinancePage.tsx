"use client";

import { FormEvent, useEffect, useState } from "react";

import { api } from "../lib/api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { useSuite } from "../context/SuiteContext";
import { formatCurrency, formatDate } from "../lib/ui/format";
import { Balance, Expense } from "../types";

interface ExpenseResponse {
  expense: Expense;
  balances: Balance[];
  settleUps: { from: string; to: string; amount: number }[];
}

export function FinancePage() {
  const { suite, members } = useSuite();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settleUps, setSettleUps] = useState<{ from: string; to: string; amount: number }[]>([]);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    paidBy: "",
    participants: [] as string[],
  });

  const loadFinance = async () => {
    if (!suite?._id) return;
    const [expenseData, balanceData] = await Promise.all([
      api.get<Expense[]>(`/expenses?suiteId=${suite._id}`),
      api.get<{ balances: Balance[]; settleUps: { from: string; to: string; amount: number }[] }>(
        `/expenses/balances/${suite._id}`
      ),
    ]);
    setExpenses(expenseData);
    setBalances(balanceData.balances);
    setSettleUps(balanceData.settleUps);
  };

  useEffect(() => {
    if (!suite?._id) return;
    setForm((current) => ({
      ...current,
      participants: members.map((member) => member._id),
    }));
    void loadFinance();
  }, [suite?._id, members]);

  const toggleParticipant = (memberId: string) => {
    setForm((current) => ({
      ...current,
      participants: current.participants.includes(memberId)
        ? current.participants.filter((id) => id !== memberId)
        : [...current.participants, memberId],
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!suite?._id) return;
    const response = await api.post<ExpenseResponse>("/expenses", {
      suiteId: suite._id,
      title: form.title,
      amount: Number(form.amount),
      paidBy: form.paidBy || members[0]?._id,
      participants: form.participants.length ? form.participants : members.map((member) => member._id),
      splitType: "equal",
    });
    setExpenses((current) => [response.expense, ...current]);
    setBalances(response.balances);
    setSettleUps(response.settleUps);
    setForm({
      title: "",
      amount: "",
      paidBy: "",
      participants: members.map((member) => member._id),
    });
  };

  const nameFor = (id: string) => members.find((member) => member._id === id)?.name || "Unknown";

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <SectionCard title="Add Expense" subtitle="Equal split only, optimized for speed">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            className="input"
            placeholder="Trader Joe's run"
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            placeholder="40"
            required
            value={form.amount}
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
          />
          <select
            className="input"
            value={form.paidBy}
            onChange={(event) => setForm({ ...form, paidBy: event.target.value })}
          >
            <option value="">Paid by...</option>
            {members.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name}
              </option>
            ))}
          </select>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="mb-3 text-sm font-medium text-slate-700">Participants</p>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => {
                const active = form.participants.includes(member._id);
                return (
                  <button
                    key={member._id}
                    type="button"
                    className={`rounded-full px-3 py-2 text-sm font-medium ${
                      active ? "bg-slate-900 text-white" : "bg-white text-slate-700"
                    }`}
                    onClick={() => toggleParticipant(member._id)}
                  >
                    {member.name}
                  </button>
                );
              })}
            </div>
          </div>
          <button className="button-primary w-full" type="submit">
            Save Expense
          </button>
        </form>
      </SectionCard>

      <div className="space-y-6">
        <SectionCard title="Balances" subtitle="Backend-calculated net positions">
          <div className="space-y-3">
            {balances.map((balance) => (
              <div key={balance.userId} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{balance.name}</p>
                  <p className="text-sm text-slate-500">
                    Paid {formatCurrency(balance.paid)} • Owes {formatCurrency(balance.owed)}
                  </p>
                </div>
                <span
                  className={`pill ${
                    balance.net >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {balance.net >= 0 ? "+" : ""}
                  {formatCurrency(balance.net)}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Expense History" subtitle="Most recent first">
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div key={expense._id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{expense.title}</p>
                    <p className="text-sm text-slate-500">
                      Paid by {nameFor(expense.paidBy)} • {formatDate(expense.createdAt)}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{formatCurrency(expense.amount)}</p>
                </div>
              </div>
            ))}
            {!expenses.length ? <EmptyState label="No expenses yet. Add the first shared charge." /> : null}
          </div>
        </SectionCard>

        <SectionCard title="Settle-Up Suggestions" subtitle="Simple suggestions generated from net balances">
          <div className="space-y-3">
            {settleUps.map((item, index) => (
              <div key={`${item.from}-${index}`} className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                {item.from} pays {item.to} {formatCurrency(item.amount)}
              </div>
            ))}
            {!settleUps.length ? <EmptyState label="No settle-up action needed right now." /> : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
