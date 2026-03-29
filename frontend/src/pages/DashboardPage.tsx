import { CheckCircle2, CircleAlert, Receipt, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { useSuite } from "../context/SuiteContext";
import { formatCurrency } from "../lib/format";
import { DashboardData } from "../types";

export function DashboardPage() {
  const { suite, members } = useSuite();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!suite?._id) return;
    void api.get<DashboardData>(`/dashboard/${suite._id}`).then(setData);
  }, [suite?._id]);

  if (!suite) {
    return <EmptyState label="Create a suite on Setup to unlock the dashboard." />;
  }

  const nameFor = (id: string) => members.find((member) => member._id === id)?.name || "Unknown";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Due Today"
          value={data?.dueToday.length || 0}
          hint="Tasks that still need attention today"
          tone="sky"
          icon={<CheckCircle2 size={14} />}
        />
        <StatCard
          title="Overdue"
          value={data?.overdue.length || 0}
          hint="Chores that need a quick recovery"
          tone="coral"
          icon={<CircleAlert size={14} />}
        />
        <StatCard
          title="Shopping Needed"
          value={data?.shoppingNeeded.length || 0}
          hint="Items waiting on the next run"
          tone="gold"
          icon={<ShoppingBag size={14} />}
        />
        <StatCard
          title="Recent Spend"
          value={formatCurrency((data?.recentExpenses || []).reduce((sum, item) => sum + item.amount, 0))}
          hint="Last few suite expenses combined"
          tone="mint"
          icon={<Receipt size={14} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <SectionCard title="Today + Overdue" subtitle="The highest-priority chores across the suite">
          <div className="space-y-3">
            {[...(data?.dueToday || []), ...(data?.overdue || [])].slice(0, 5).map((task) => (
              <div key={task._id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="font-medium text-slate-900">{task.title}</p>
                  <p className="text-sm text-slate-500">{nameFor(task.assigneeId)}</p>
                </div>
                <span
                  className={`pill ${task.status === "overdue" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700"}`}
                >
                  {task.status}
                </span>
              </div>
            ))}
            {!data?.dueToday.length && !data?.overdue.length ? (
              <EmptyState label="No urgent tasks. The suite is in good shape." />
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Settle Up" subtitle="Simple equal-split suggestions">
          <div className="space-y-3">
            {(data?.settleUps || []).map((item, index) => (
              <div key={`${item.from}-${index}`} className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                <span className="font-semibold">{item.from}</span> pays <span className="font-semibold">{item.to}</span>{" "}
                {formatCurrency(item.amount)}
              </div>
            ))}
            {!data?.settleUps.length ? <EmptyState label="Everyone is roughly settled up." /> : null}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Fairness Summary" subtitle="Contribution visibility across chores, shopping, and spend">
          <div className="space-y-3">
            {(data?.fairness || []).map((row) => (
              <div key={row.userId} className="grid grid-cols-4 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <p className="text-slate-500">Member</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{row.tasksCompleted}</p>
                  <p className="text-slate-500">Tasks done</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{row.shoppingBought}</p>
                  <p className="text-slate-500">Items bought</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{formatCurrency(row.expensesPaid)}</p>
                  <p className="text-slate-500">Paid</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Balances" subtitle="Net position after equal splits">
          <div className="space-y-3">
            {(data?.balances || []).map((balance) => (
              <div key={balance.userId} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{balance.name}</p>
                  <p className="text-sm text-slate-500">
                    Paid {formatCurrency(balance.paid)} • Owes {formatCurrency(balance.owed)}
                  </p>
                </div>
                <div
                  className={`pill ${
                    balance.net >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {balance.net >= 0 ? "+" : ""}
                  {formatCurrency(balance.net)}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
