"use client";

import { useMemo, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { api } from "../lib/api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { useSuite } from "../context/SuiteContext";
import { formatCurrency, formatDate } from "../lib/ui/format";
import { AddExpenseModal } from "./finance/AddExpenseModal";
import { EditExpenseModal } from "./finance/EditExpenseModal";
import { RecordPaymentModal } from "./finance/RecordPaymentModal";
import { Balance, Expense, Settlement } from "../types";

type SettleUp = { from: string; fromId?: string; to: string; toId?: string; amount: number };

export function FinancePage() {
  const { suite, members } = useSuite();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settleUps, setSettleUps] = useState<SettleUp[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentPrefill, setPaymentPrefill] = useState<
    { payerId?: string; receiverId?: string; amount?: number } | undefined
  >();
  const [settleUpView, setSettleUpView] = useState<"net" | "per-expense">("net");
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());
  const [expandedSettlements, setExpandedSettlements] = useState<Set<string>>(new Set());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<"all" | "week" | "month">("all");
  const [filterUser, setFilterUser] = useState("");

  const loadAll = async () => {
    if (!suite?._id) return;
    const [expenseData, settlementData, balanceData] = await Promise.all([
      api.get<Expense[]>(`/expenses?suiteId=${suite._id}`),
      api.get<Settlement[]>(`/settlements?suiteId=${suite._id}`),
      api.get<{ balances: Balance[]; settleUps: SettleUp[] }>(`/expenses/balances/${suite._id}`),
    ]);
    setExpenses(expenseData);
    setSettlements(settlementData);
    setBalances(balanceData.balances);
    setSettleUps(balanceData.settleUps);
  };

  useEffect(() => {
    void loadAll();
  }, [suite?._id]);

  // Build splitAllocations: Map<expenseId, Map<debtorId, coveredAmount>>
  const splitAllocations = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const s of settlements) {
      for (const alloc of s.allocations ?? []) {
        const expId = alloc.expenseId;
        if (!map.has(expId)) map.set(expId, new Map());
        map.get(expId)!.set(
          alloc.debtorId,
          (map.get(expId)!.get(alloc.debtorId) ?? 0) + alloc.amount
        );
      }
    }
    return map;
  }, [settlements]);

  const nameFor = (id: string) => members.find((m) => m._id === id)?.name ?? "Unknown";

  const toggleExpense = (id: string) =>
    setExpandedExpenses((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSettlement = (id: string) =>
    setExpandedSettlements((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // Period filter
      if (filterPeriod !== "all") {
        const expDate = new Date(e.date ?? e.createdAt);
        const now = new Date();
        if (filterPeriod === "week") {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (expDate < weekAgo) return false;
        } else if (filterPeriod === "month") {
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          if (expDate < monthAgo) return false;
        }
      }
      // User filter (paidBy OR participant)
      if (filterUser) {
        const inParticipants = e.participants.includes(filterUser);
        const isPayer = e.paidBy === filterUser;
        if (!inParticipants && !isPayer) return false;
      }
      return true;
    });
  }, [expenses, filterPeriod, filterUser]);

  const handleDeleteExpense = async (id: string) => {
    const data = await api.delete<{ balances: Balance[]; settleUps: SettleUp[] }>(`/expenses/${id}`);
    setExpenses((prev) => prev.filter((e) => e._id !== id));
    setBalances(data.balances);
    setSettleUps(data.settleUps);
  };

  const handleDeleteSettlement = async (id: string) => {
    const data = await api.delete<{ balances: Balance[]; settleUps: SettleUp[] }>(`/settlements/${id}`);
    setSettlements((prev) => prev.filter((s) => s._id !== id));
    setBalances(data.balances);
    setSettleUps(data.settleUps);
  };

  const openPayment = (prefill?: { payerId?: string; receiverId?: string; amount?: number }) => {
    setPaymentPrefill(prefill);
    setShowPayment(true);
  };

  return (
    <>
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          members={members}
          onSuccess={(updatedExpense, newBalances, newSettleUps) => {
            setExpenses((prev) =>
              prev.map((e) => (e._id === updatedExpense._id ? updatedExpense : e))
            );
            setBalances(newBalances);
            setSettleUps(newSettleUps as SettleUp[]);
            setEditingExpense(null);
          }}
          onClose={() => setEditingExpense(null)}
        />
      )}
      {showAddExpense && suite && (
        <AddExpenseModal
          members={members}
          suiteId={suite._id}
          onSuccess={(expense, newBalances, newSettleUps) => {
            setExpenses((prev) => [expense, ...prev]);
            setBalances(newBalances);
            setSettleUps(newSettleUps as SettleUp[]);
            setShowAddExpense(false);
          }}
          onClose={() => setShowAddExpense(false)}
        />
      )}
      {showPayment && suite && (
        <RecordPaymentModal
          members={members}
          suiteId={suite._id}
          prefill={paymentPrefill}
          onSuccess={(settlement, newBalances, newSettleUps) => {
            setSettlements((prev) => [settlement, ...prev]);
            setBalances(newBalances);
            setSettleUps(newSettleUps);
            setShowPayment(false);
          }}
          onClose={() => setShowPayment(false)}
        />
      )}

      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          {/* Left column: Balances + Settle-Up */}
          <div className="space-y-6">
            <SectionCard title="Balances" subtitle="Outstanding after settlements">
              <div className="space-y-3">
                {balances.map((b) => (
                  <div key={b.userId} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-900">{b.name}</p>
                      <span
                        className={`pill ${
                          b.outstandingNet >= 0
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {b.outstandingNet >= 0 ? "+" : ""}
                        {formatCurrency(b.outstandingNet)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Paid {formatCurrency(b.paid)} · Owes {formatCurrency(b.owed)} · Settled out{" "}
                      {formatCurrency(b.settledOut)}
                    </p>
                  </div>
                ))}
                {!balances.length && <EmptyState label="No members yet." />}
              </div>
            </SectionCard>

            <SectionCard
              title="Settle Up"
              subtitle="Suggested payments to clear balances"
              action={
                <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                  {(["net", "per-expense"] as const).map((v) => (
                    <button
                      key={v}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                        settleUpView === v ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                      }`}
                      onClick={() => setSettleUpView(v)}
                    >
                      {v === "net" ? "Net" : "Per Expense"}
                    </button>
                  ))}
                </div>
              }
            >
              {settleUpView === "net" ? (
                <div className="space-y-3">
                  {settleUps.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4"
                    >
                      <p className="text-sm text-emerald-900">
                        <span className="font-semibold">{s.from}</span> pays{" "}
                        <span className="font-semibold">{s.to}</span>
                        <span className="ml-2 font-semibold">{formatCurrency(s.amount)}</span>
                      </p>
                      <button
                        className="button-secondary text-xs"
                        onClick={() =>
                          openPayment({ payerId: s.fromId, receiverId: s.toId, amount: s.amount })
                        }
                      >
                        Record
                      </button>
                    </div>
                  ))}
                  {!settleUps.length && <EmptyState label="All settled up!" />}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredExpenses.map((expense) => {
                    const nonPayerSplits = expense.splits.filter(
                      (sp) => sp.participantId !== expense.paidBy
                    );
                    const anyRemaining = nonPayerSplits.some((sp) => {
                      const covered =
                        splitAllocations.get(expense._id)?.get(sp.participantId) ?? 0;
                      return sp.owedAmount - covered > 0.005;
                    });
                    if (!anyRemaining) return null;
                    return (
                      <div key={expense._id} className="rounded-2xl bg-slate-50 p-4">
                        <p className="mb-2 font-semibold text-slate-900">
                          {expense.title} — {formatCurrency(expense.amount)}
                        </p>
                        <div className="space-y-2">
                          {nonPayerSplits.map((sp) => {
                            const covered =
                              splitAllocations.get(expense._id)?.get(sp.participantId) ?? 0;
                            const remaining = Math.max(0, sp.owedAmount - covered);
                            if (remaining < 0.005) return null;
                            return (
                              <div
                                key={sp.participantId}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-slate-700">
                                  {nameFor(sp.participantId)} owes {nameFor(expense.paidBy)}
                                  <span className="ml-2 font-medium text-rose-600">
                                    {formatCurrency(remaining)}
                                  </span>
                                  {covered > 0 && (
                                    <span className="ml-1 text-xs text-slate-400">
                                      (of {formatCurrency(sp.owedAmount)})
                                    </span>
                                  )}
                                </span>
                                <button
                                  className="button-secondary text-xs"
                                  onClick={() =>
                                    openPayment({
                                      payerId: sp.participantId,
                                      receiverId: expense.paidBy,
                                      amount: remaining,
                                    })
                                  }
                                >
                                  Record
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {filteredExpenses.every((expense) =>
                    expense.splits
                      .filter((sp) => sp.participantId !== expense.paidBy)
                      .every((sp) => {
                        const covered =
                          splitAllocations.get(expense._id)?.get(sp.participantId) ?? 0;
                        return sp.owedAmount - covered <= 0.005;
                      })
                  ) && <EmptyState label="All expenses settled up!" />}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Right column: Expense History */}
          <SectionCard
            title="Expense History"
            subtitle="Most recent first"
            action={
              <button
                className="button-primary flex items-center gap-1 text-sm"
                onClick={() => setShowAddExpense(true)}
              >
                <Plus size={15} /> Add
              </button>
            }
          >
            {/* Filter bar */}
            <div className="mb-4 flex flex-wrap gap-2">
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                {(["all", "week", "month"] as const).map((p) => (
                  <button
                    key={p}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                      filterPeriod === p ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                    }`}
                    onClick={() => setFilterPeriod(p)}
                  >
                    {p === "all" ? "All time" : p === "week" ? "This week" : "This month"}
                  </button>
                ))}
              </div>
              <select
                className="rounded-xl border-0 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
              >
                <option value="">All members</option>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
              {(filterPeriod !== "all" || filterUser) && (
                <button
                  className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
                  onClick={() => { setFilterPeriod("all"); setFilterUser(""); }}
                >
                  Clear
                </button>
              )}
            </div>
            {(filterPeriod !== "all" || filterUser) && (
              <p className="mb-3 text-xs text-slate-500">
                Showing {filteredExpenses.length} of {expenses.length} expenses
              </p>
            )}
            <div className="space-y-3">
              {filteredExpenses.map((expense) => {
                const isExpanded = expandedExpenses.has(expense._id);
                return (
                  <div key={expense._id} className="rounded-2xl bg-slate-50">
                    <div
                      className="flex cursor-pointer items-center gap-3 p-4"
                      onClick={() => toggleExpense(expense._id)}
                    >
                      <span className="text-slate-400">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{expense.title}</p>
                        <p className="text-xs text-slate-500">
                          Paid by {nameFor(expense.paidBy)} · {formatDate(expense.createdAt)}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(expense.amount)}
                      </p>
                      <button
                        className="text-slate-400 hover:text-sky-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingExpense(expense);
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="text-slate-400 hover:text-rose-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteExpense(expense._id);
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-slate-200 px-4 pb-4 pt-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                          Split breakdown
                        </p>
                        <div className="space-y-2">
                          {expense.splits.map((sp) => {
                            const covered =
                              splitAllocations.get(expense._id)?.get(sp.participantId) ?? 0;
                            const remaining = Math.max(0, sp.owedAmount - covered);
                            const isPayer = sp.participantId === expense.paidBy;
                            return (
                              <div
                                key={sp.participantId}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-slate-700">
                                  {nameFor(sp.participantId)}
                                  {isPayer && (
                                    <span className="ml-1 text-xs text-slate-400">(payer)</span>
                                  )}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-500">
                                    {formatCurrency(sp.owedAmount)}
                                  </span>
                                  {!isPayer && covered > 0 && (
                                    <span className="text-xs text-emerald-600">
                                      −{formatCurrency(covered)}
                                    </span>
                                  )}
                                  {!isPayer && (
                                    <span
                                      className={`font-medium ${
                                        remaining < 0.005 ? "text-emerald-600" : "text-rose-600"
                                      }`}
                                    >
                                      {remaining < 0.005 ? "Settled" : formatCurrency(remaining)}
                                    </span>
                                  )}
                                  {!isPayer && remaining > 0.005 && (
                                    <button
                                      className="button-secondary text-xs"
                                      onClick={() =>
                                        openPayment({
                                          payerId: sp.participantId,
                                          receiverId: expense.paidBy,
                                          amount: remaining,
                                        })
                                      }
                                    >
                                      Record
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {!filteredExpenses.length && (
                <EmptyState label={expenses.length ? "No expenses match the current filters." : "No expenses yet."} />
              )}
            </div>
          </SectionCard>
        </div>

        {/* Settlement History */}
        <SectionCard
          title="Settlement History"
          subtitle="Recorded payments and their allocations"
          action={
            <button
              className="button-primary flex items-center gap-1 text-sm"
              onClick={() => openPayment()}
            >
              <Plus size={15} /> Record Payment
            </button>
          }
        >
          <div className="space-y-3">
            {settlements.map((s) => {
              const isExpanded = expandedSettlements.has(s._id);
              return (
                <div key={s._id} className="rounded-2xl bg-slate-50">
                  <div
                    className="flex cursor-pointer items-center gap-3 p-4"
                    onClick={() => toggleSettlement(s._id)}
                  >
                    <span className="text-slate-400">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">
                        {nameFor(s.payerId)} → {nameFor(s.receiverId)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(s.date)}
                        {s.note ? ` · ${s.note}` : ""}
                      </p>
                    </div>
                    <p className="font-semibold text-emerald-700">{formatCurrency(s.amount)}</p>
                    <button
                      className="text-slate-400 hover:text-rose-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteSettlement(s._id);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-slate-200 px-4 pb-4 pt-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Allocations (FIFO)
                      </p>
                      {s.allocations?.length ? (
                        <div className="space-y-1">
                          {s.allocations.map((a, i) => {
                            const expense = expenses.find((e) => e._id === a.expenseId);
                            return (
                              <div
                                key={i}
                                className="flex items-center justify-between text-sm text-slate-600"
                              >
                                <span>{expense?.title ?? "Expense"}</span>
                                <span className="font-medium text-emerald-700">
                                  {formatCurrency(a.amount)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">No allocations recorded.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {!settlements.length && (
              <EmptyState label="No settlement payments recorded yet." />
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
