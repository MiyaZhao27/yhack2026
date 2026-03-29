"use client";

import { useMemo, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";

import { api } from "../lib/api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { useSuite } from "../context/SuiteContext";
import { formatCurrency, formatDateTime } from "../lib/ui/format";
import { AddExpenseModal } from "./finance/AddExpenseModal";
import { EditExpenseModal } from "./finance/EditExpenseModal";
import { RecordPaymentModal } from "./finance/RecordPaymentModal";
import { Balance, Expense, Settlement } from "../types";

type SettleUp = { from: string; fromId?: string; to: string; toId?: string; amount: number };

export function FinancePage() {
  const { suite, members } = useSuite();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settleUps, setSettleUps] = useState<SettleUp[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentPrefill, setPaymentPrefill] = useState<
    { payerId?: string; receiverId?: string; amount?: number } | undefined
  >();
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

  // For each expense: Map<expenseId, Map<debtorId, settledAmount>>
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
      if (filterUser) {
        if (!e.participants.includes(filterUser) && e.paidBy !== filterUser) return false;
      }
      return true;
    });
  }, [expenses, filterPeriod, filterUser]);

  const handleDeleteExpense = async (id: string) => {
    await api.delete(`/expenses/${id}`);
    await loadAll();
  };

  const handleDeleteSettlement = async (id: string) => {
    await api.delete(`/settlements/${id}`);
    await loadAll();
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
          onSuccess={() => {
            setEditingExpense(null);
            void loadAll();
          }}
          onClose={() => setEditingExpense(null)}
        />
      )}
      {showAddExpense && suite && (
        <AddExpenseModal
          members={members}
          suiteId={suite._id}
          onSuccess={() => {
            setShowAddExpense(false);
            void loadAll();
          }}
          onClose={() => setShowAddExpense(false)}
        />
      )}
      {showPayment && suite && (
        <RecordPaymentModal
          members={members}
          suiteId={suite._id}
          currentUserId={currentUserId}
          prefill={paymentPrefill}
          onSuccess={() => {
            setShowPayment(false);
            void loadAll();
          }}
          onClose={() => setShowPayment(false)}
        />
      )}

      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">

          {/* Left column: Balances + Settle Up */}
          <div className="space-y-6">

            {/* Balances */}
            <SectionCard title="Balances" subtitle="Current outstanding after settlements">
              <div className="space-y-3">
                {balances.map((b) => {
                  // outstandingNet > 0: net creditor (others owe you)
                  // outstandingNet < 0: net debtor (you owe others)
                  // outstanding: total you still owe others
                  // outstanding + outstandingNet: total others still owe you
                  const amountOwedToYou = Number((b.outstanding + b.outstandingNet).toFixed(2));
                  const isOwed = b.outstandingNet > 0.005;
                  const isOwing = b.outstandingNet < -0.005;
                  return (
                    <div key={b.userId} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-900">{b.name}</p>
                        <span
                          className={`pill ${
                            isOwed
                              ? "bg-emerald-100 text-emerald-800"
                              : isOwing
                                ? "bg-rose-100 text-rose-700"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isOwed
                            ? `Owed ${formatCurrency(b.outstandingNet)}`
                            : isOwing
                              ? `Owes ${formatCurrency(-b.outstandingNet)}`
                              : "Settled up"}
                        </span>
                      </div>
                      {(amountOwedToYou > 0.005 || b.outstanding > 0.005) && (
                        <p className="mt-1 text-xs text-slate-500">
                          {amountOwedToYou > 0.005
                            ? `Others owe ${formatCurrency(amountOwedToYou)}`
                            : ""}
                          {amountOwedToYou > 0.005 && b.outstanding > 0.005 ? " · " : ""}
                          {b.outstanding > 0.005
                            ? `Owes others ${formatCurrency(b.outstanding)}`
                            : ""}
                        </p>
                      )}
                    </div>
                  );
                })}
                {!balances.length && <EmptyState label="No members yet." />}
              </div>
            </SectionCard>

            {/* Settle Up */}
            <SectionCard
              title="Settle Up"
              subtitle="Suggested payments to clear balances"
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
                <p className="text-xs text-slate-400">
                  Suggestions from direct payer-to-payee obligations · Payments applied FIFO to oldest obligations
                </p>
              </div>
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
                const expAllocMap = splitAllocations.get(expense._id) ?? new Map<string, number>();

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
                          Paid by {nameFor(expense.paidBy)} · {formatDateTime(expense.date ?? expense.createdAt)}
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
                      <div className="border-t border-slate-200 px-4 pb-4 pt-3 space-y-3">
                        {expense.splitMethod === "itemized" && expense.items?.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                              Items
                            </p>
                            <div className="space-y-1">
                              {expense.items.map((item, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                                >
                                  <div>
                                    <span className="font-medium text-slate-700">{item.name}</span>
                                    {item.assignedParticipants?.length > 0 && (
                                      <span className="ml-2 text-xs text-slate-400">
                                        {item.assignedParticipants.map((id) => nameFor(id)).join(", ")}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-medium text-slate-700">
                                    {formatCurrency(item.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Split breakdown
                        </p>
                        <div className="space-y-1.5">
                          {expense.splits.map((sp) => {
                            const isPayer = sp.participantId === expense.paidBy;
                            const settled = expAllocMap.get(sp.participantId) ?? 0;
                            const remaining = Math.max(0, sp.owedAmount - settled);
                            const isFullySettled = remaining < 0.005;

                            return (
                              <div
                                key={sp.participantId}
                                className="rounded-lg bg-white px-3 py-2 text-sm"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-slate-700">
                                    {nameFor(sp.participantId)}
                                    {isPayer && (
                                      <span className="ml-1 text-xs font-normal text-slate-400">
                                        (payer)
                                      </span>
                                    )}
                                  </span>
                                  {isPayer ? (
                                    <span className="text-xs text-slate-400">
                                      Own share: {formatCurrency(sp.owedAmount)}
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="text-slate-500">
                                        Share:{" "}
                                        <span className="font-medium text-slate-700">
                                          {formatCurrency(sp.owedAmount)}
                                        </span>
                                      </span>
                                      <span className="text-emerald-600">
                                        Settled:{" "}
                                        <span className="font-medium">
                                          {formatCurrency(settled)}
                                        </span>
                                      </span>
                                      <span
                                        className={
                                          isFullySettled ? "text-slate-400" : "text-rose-600"
                                        }
                                      >
                                        {isFullySettled ? (
                                          "Paid in full"
                                        ) : (
                                          <>
                                            Remaining:{" "}
                                            <span className="font-medium">
                                              {formatCurrency(remaining)}
                                            </span>
                                          </>
                                        )}
                                      </span>
                                    </div>
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
                <EmptyState
                  label={
                    expenses.length
                      ? "No expenses match the current filters."
                      : "No expenses yet."
                  }
                />
              )}
            </div>
          </SectionCard>
        </div>

        {/* Settlement History */}
        <SectionCard
          title="Settlement History"
          subtitle="Recorded direct payments"
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
            {[...settlements]
              .sort((a, b) => {
                const tA = new Date(a.date).getTime();
                const tB = new Date(b.date).getTime();
                return tB - tA;
              })
              .map((s) => {
                const isExpanded = expandedSettlements.has(s._id);
                const isNetting = s.type === "netting";

                const settledAllocs = s.allocations?.filter((a) => a.allocationRole === "settled" || !a.allocationRole) ?? [];
                const offsetAllocs = s.allocations?.filter((a) => a.allocationRole === "offset") ?? [];

                return (
                  <div
                    key={s._id}
                    className={`rounded-2xl ${isNetting ? "bg-violet-50" : "bg-slate-50"}`}
                  >
                    <div
                      className="flex cursor-pointer items-center gap-3 p-4"
                      onClick={() => toggleSettlement(s._id)}
                    >
                      <span className={isNetting ? "text-violet-400" : "text-slate-400"}>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {isNetting
                              ? `${nameFor(s.payerId)} ↔ ${nameFor(s.receiverId)} netted`
                              : `${nameFor(s.payerId)} paid ${nameFor(s.receiverId)}`}
                          </p>
                          {isNetting && (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                              Auto-netted
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(s.date)}
                          {!isNetting && s.note ? ` · ${s.note}` : ""}
                        </p>
                      </div>
                      <p className={`font-semibold ${isNetting ? "text-violet-700" : "text-emerald-700"}`}>
                        {formatCurrency(s.amount)}
                      </p>
                      {!isNetting && (
                        <button
                          className="text-slate-400 hover:text-rose-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteSettlement(s._id);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="border-t border-slate-200 px-4 pb-4 pt-3 space-y-3">
                        {isNetting ? (
                          <>
                            {settledAllocs.length > 0 && (
                              <div>
                                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-violet-500">
                                  Cleared obligations ({nameFor(s.payerId)})
                                </p>
                                <div className="space-y-1">
                                  {settledAllocs.map((a, i) => {
                                    const expense = expenses.find((e) => e._id === a.expenseId);
                                    return (
                                      <div
                                        key={i}
                                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm text-slate-600"
                                      >
                                        <span>{expense?.title ?? "Expense"}</span>
                                        <span className="font-medium text-violet-700">
                                          {formatCurrency(a.amount)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {offsetAllocs.length > 0 && (
                              <div>
                                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-violet-500">
                                  Offset against ({nameFor(s.receiverId)})
                                </p>
                                <div className="space-y-1">
                                  {offsetAllocs.map((a, i) => {
                                    const expense = expenses.find((e) => e._id === a.expenseId);
                                    return (
                                      <div
                                        key={i}
                                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm text-slate-600"
                                      >
                                        <span>{expense?.title ?? "Expense"}</span>
                                        <span className="font-medium text-violet-700">
                                          {formatCurrency(a.amount)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                              Applied to (FIFO)
                            </p>
                            {s.allocations?.length ? (
                              <div className="space-y-1">
                                {s.allocations.map((a, i) => {
                                  const expense = expenses.find((e) => e._id === a.expenseId);
                                  return (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm text-slate-600"
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
                          </>
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
