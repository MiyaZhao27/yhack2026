"use client";

import { useEffect, useState } from "react";

import { api } from "../lib/api/client";
import { BulletinBoard } from "../components/BulletinBoard";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { useSuite } from "../context/SuiteContext";
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:items-start">
        <div className="relative z-20">
          <BulletinBoard />
        </div>

        <SectionCard title="Today + Overdue" subtitle="The highest-priority chores across the suite">
          <div className="space-y-3">
            {[...(data?.dueToday || []), ...(data?.overdue || [])].slice(0, 6).map((task) => (
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
            {!!data?.dueToday.length && !data?.overdue.length ? (
              <div className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-800">
                Today is under control. Nothing is currently overdue.
              </div>
            ) : null}
            {!data?.dueToday.length && !!data?.overdue.length ? (
              <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">
                Overdue chores need attention first before new tasks stack up.
              </div>
            ) : null}
            {!!data?.dueToday.length && !!data?.overdue.length ? (
              <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                A mix of due-today and overdue work is active, so this is the fastest place to recover the suite.
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
