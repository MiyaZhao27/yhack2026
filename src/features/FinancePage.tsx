"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Pencil, Plus, ReceiptText, Trash2, Wallet } from "lucide-react";
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

type ExpenseMode = "manual" | "receipt";

export function FinancePage() {
  const { suite, members } = useSuite();
  const { data: session, status } = useSession();
  const currentUserId = session?.user?.id ?? "";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settleUps, setSettleUps] = useState<SettleUp[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [addExpenseMode, setAddExpenseMode] = useState<ExpenseMode | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentPrefill, setPaymentPrefill] = useState<
    { payerId?: string; receiverId?: string; amount?: number } | undefined
  >();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [historyView, setHistoryView] = useState<"expenses" | "settlements">("expenses");
  const [expandedExpenses, setExpandedExpenses] = useState<Record<string, boolean>>({});

  const loadAll = async () => {
    if (!suite?._id || status !== "authenticated") return;
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
    if (status !== "authenticated") {
      setExpenses([]);
      setSettlements([]);
      setBalances([]);
      setSettleUps([]);
      return;
    }
    void loadAll();
  }, [suite?._id, status]);

  const nameFor = (id: string) => members.find((member) => member._id === id)?.name ?? "Unknown";

  const sortedExpenses = useMemo(
    () => [...expenses].sort((a, b) => new Date(b.date ?? b.createdAt).getTime() - new Date(a.date ?? a.createdAt).getTime()),
    [expenses]
  );

  const sortedSettlements = useMemo(
    () => [...settlements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [settlements]
  );

  const myBalance = balances.find((balance) => balance.userId === currentUserId);
  const myNet = myBalance?.outstandingNet ?? 0;
  const myOwes = myNet < 0 ? -myNet : 0;
  const myOwed = myNet > 0 ? myNet : 0;

  const iOwe = settleUps.filter((item) => item.fromId === currentUserId);
  const owedToMe = settleUps.filter((item) => item.toId === currentUserId);

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

  const toggleExpenseDetails = (expenseId: string) => {
    setExpandedExpenses((current) => ({
      ...current,
      [expenseId]: !current[expenseId],
    }));
  };

  const splitMethodLabel: Record<Expense["splitMethod"], string> = {
    equal: "Equal split",
    exact: "Exact amounts",
    percentage: "Percentage split",
    itemized: "Itemized split",
  };

  return (
    <>
      {editingExpense ? (
        <EditExpenseModal
          expense={editingExpense}
          members={members}
          onSuccess={() => {
            setEditingExpense(null);
            void loadAll();
          }}
          onClose={() => setEditingExpense(null)}
        />
      ) : null}

      {addExpenseMode && suite ? (
        <AddExpenseModal
          members={members}
          suiteId={suite._id}
          initialTab={addExpenseMode}
          onSuccess={() => {
            setAddExpenseMode(null);
            void loadAll();
          }}
          onClose={() => setAddExpenseMode(null)}
        />
      ) : null}

      {showPayment && suite ? (
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
      ) : null}

      <SectionCard
        title="Finance"
        action={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <button
              className="button-secondary w-full px-3 py-2 text-xs sm:w-auto"
              onClick={() => setAddExpenseMode("manual")}
            >
              <Plus size={14} /> Manual Expense
            </button>
            <button
              className="button-secondary w-full px-3 py-2 text-xs sm:w-auto"
              onClick={() => setAddExpenseMode("receipt")}
            >
              <ReceiptText size={14} /> Receipt Expense
            </button>
            <button
              className="button-primary col-span-2 w-full px-3 py-2 text-xs sm:col-auto sm:w-auto"
              onClick={() => openPayment()}
            >
              <Wallet size={14} /> Record Payment
            </button>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="space-y-3">
            <div className="surface-soft rounded-2xl px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Your Balance</p>
              <p
                className={`mt-2 text-3xl font-bold ${
                  myNet > 0.005 ? "text-[#00503a]" : myNet < -0.005 ? "text-[#8f1d3a]" : "text-[#2a1738]"
                }`}
              >
                {myNet > 0.005
                  ? `+${formatCurrency(myNet)}`
                  : myNet < -0.005
                    ? `-${formatCurrency(-myNet)}`
                    : formatCurrency(0)}
              </p>
              <p className="mt-1 text-sm text-muted">
                {myNet > 0.005
                  ? `You are owed ${formatCurrency(myOwed)}`
                  : myNet < -0.005
                    ? `You owe ${formatCurrency(myOwes)}`
                    : "You are settled up"}
              </p>
            </div>

            <div className="surface-soft rounded-2xl px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Settle Up</p>

              <div className="mt-3 space-y-3">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8f1d3a]">You Owe</p>
                  <div className="space-y-1.5">
                    {iOwe.map((item, index) => (
                      <button
                        key={`${item.fromId}-${item.toId}-${index}`}
                        className="flex w-full items-center justify-between rounded-xl bg-[#ffe0ea] px-3 py-2 text-left text-sm text-[#8f1d3a]"
                        onClick={() => openPayment({ payerId: item.fromId, receiverId: item.toId, amount: item.amount })}
                      >
                        <span>Pay {item.to}</span>
                        <span className="font-semibold">{formatCurrency(item.amount)}</span>
                      </button>
                    ))}
                    {!iOwe.length ? <p className="text-sm text-muted">Nothing to pay.</p> : null}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#00503a]">Owed To You</p>
                  <div className="space-y-1.5">
                    {owedToMe.map((item, index) => (
                      <div
                        key={`${item.toId}-${item.fromId}-${index}`}
                        className="flex items-center justify-between rounded-xl bg-[#e2f7eb] px-3 py-2 text-sm text-[#00503a]"
                      >
                        <span>{item.from} owes you</span>
                        <span className="font-semibold">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    {!owedToMe.length ? <p className="text-sm text-muted">No incoming payments.</p> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="surface-soft rounded-2xl px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">History</p>
              <div className="segmented">
                <button
                  className={historyView === "expenses" ? "segment-button-active" : "segment-button"}
                  onClick={() => setHistoryView("expenses")}
                >
                  Expenses
                </button>
                <button
                  className={historyView === "settlements" ? "segment-button-active" : "segment-button"}
                  onClick={() => setHistoryView("settlements")}
                >
                  Payments
                </button>
              </div>
            </div>

            <div className="no-scrollbar max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {historyView === "expenses"
                ? sortedExpenses.map((expense) => (
                    <div key={expense._id} className="rounded-xl bg-white/80 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[#2a1738]">{expense.title}</p>
                          <p className="text-xs text-muted">
                            Paid by {nameFor(expense.paidBy)} · {formatDateTime(expense.date ?? expense.createdAt)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-[#2a1738]">{formatCurrency(expense.amount)}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-[rgba(108,73,118,0.12)] px-2 py-0.5 text-[11px] font-semibold text-[#4f3f5a]">
                          {splitMethodLabel[expense.splitMethod]}
                        </span>
                        <button
                          className="button-ghost px-2 py-1 text-xs"
                          onClick={() => toggleExpenseDetails(expense._id)}
                          type="button"
                        >
                          {expandedExpenses[expense._id] ? "Hide details" : "Show details"}
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${expandedExpenses[expense._id] ? "rotate-180" : ""}`}
                          />
                        </button>
                      </div>

                      {expandedExpenses[expense._id] ? (
                        <div className="mt-2.5 space-y-2 rounded-lg bg-[#f7f2fb] p-2.5 text-xs">
                          <div className="rounded-md bg-white/90 px-2 py-1.5">
                            <p className="font-semibold uppercase tracking-[0.08em] text-muted">Participants</p>
                            <p className="mt-1 text-[#2a1738]">
                              {expense.participants.length
                                ? expense.participants.map((id) => nameFor(id)).join(", ")
                                : "No participants"}
                            </p>
                          </div>

                          <div className="rounded-md bg-white/90 px-2 py-1.5">
                            <p className="font-semibold uppercase tracking-[0.08em] text-muted">Split Breakdown</p>
                            <div className="mt-1 space-y-1">
                              {expense.splits.map((split, index) => (
                                <div
                                  key={`${split.participantId}-${index}`}
                                  className="flex items-center justify-between gap-2 text-[#2a1738]"
                                >
                                  <span>
                                    {nameFor(split.participantId)}
                                    {typeof split.percentage === "number"
                                      ? ` (${split.percentage.toFixed(1)}%)`
                                      : ""}
                                  </span>
                                  <span className="font-semibold">{formatCurrency(split.owedAmount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {expense.splitMethod === "itemized" ? (
                            <div className="rounded-md bg-white/90 px-2 py-1.5">
                              <p className="font-semibold uppercase tracking-[0.08em] text-muted">Itemized Details</p>
                              <div className="mt-1 space-y-1.5">
                                {expense.items.map((item, index) => (
                                  <div key={`${item.name}-${index}`} className="rounded-md bg-[#f7f2fb] px-2 py-1">
                                    <div className="flex items-center justify-between gap-2 text-[#2a1738]">
                                      <span className="font-medium">{item.name}</span>
                                      <span className="font-semibold">{formatCurrency(item.amount)}</span>
                                    </div>
                                    <p className="mt-0.5 text-[11px] text-muted">
                                      Split with{" "}
                                      {item.assignedParticipants.length
                                        ? item.assignedParticipants.map((id) => nameFor(id)).join(", ")
                                        : "no one"}
                                    </p>
                                  </div>
                                ))}

                                {(() => {
                                  const itemizedSubtotal = expense.items.reduce((sum, item) => sum + item.amount, 0);
                                  const inferredFees = Number((expense.amount - itemizedSubtotal).toFixed(2));
                                  const hasFees = inferredFees > 0.009;
                                  return (
                                    <div className="mt-1 border-t border-[rgba(108,73,118,0.2)] pt-1">
                                      <div className="flex items-center justify-between text-[#2a1738]">
                                        <span>Items subtotal</span>
                                        <span>{formatCurrency(itemizedSubtotal)}</span>
                                      </div>
                                      {hasFees ? (
                                        <div className="flex items-center justify-between text-[#2a1738]">
                                          <span>Fees &amp; tax</span>
                                          <span>{formatCurrency(inferredFees)}</span>
                                        </div>
                                      ) : null}
                                      <div className="flex items-center justify-between font-semibold text-[#2a1738]">
                                        <span>Total</span>
                                        <span>{formatCurrency(expense.amount)}</span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-2 flex items-center justify-end gap-1.5">
                        <button className="button-ghost px-2 py-1" onClick={() => setEditingExpense(expense)}>
                          <Pencil size={14} />
                        </button>
                        <button className="button-ghost px-2 py-1 text-[#8f1d3a]" onClick={() => void handleDeleteExpense(expense._id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                : sortedSettlements.map((settlement) => (
                    <div key={settlement._id} className="rounded-xl bg-white/80 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[#2a1738]">
                            {nameFor(settlement.payerId)} paid {nameFor(settlement.receiverId)}
                          </p>
                          <p className="text-xs text-muted">{formatDateTime(settlement.date)}</p>
                        </div>
                        <p className="text-sm font-semibold text-[#00503a]">{formatCurrency(settlement.amount)}</p>
                      </div>
                      <div className="mt-2 flex items-center justify-end gap-1.5">
                        <button className="button-ghost px-2 py-1 text-[#8f1d3a]" onClick={() => void handleDeleteSettlement(settlement._id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

              {historyView === "expenses" && !sortedExpenses.length ? (
                <EmptyState label="No expenses yet." />
              ) : null}
              {historyView === "settlements" && !sortedSettlements.length ? (
                <EmptyState label="No payments recorded yet." />
              ) : null}
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
