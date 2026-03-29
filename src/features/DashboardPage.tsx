"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { api } from "../lib/api/client";
import { BulletinBoard } from "../components/BulletinBoard";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { useSuite } from "../context/SuiteContext";
import { DashboardData } from "../types";

export function DashboardPage() {
  const { suite, members } = useSuite();
  const [data, setData] = useState<DashboardData | null>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!suite?._id || status !== "authenticated") {
      setData(null);
      return;
    }

    void api
      .get<DashboardData>(`/dashboard/${suite._id}`)
      .then(setData)
      .catch(() => setData(null));
  }, [suite?._id, status]);

  if (!suite) {
    return <EmptyState label="Create a suite on Setup to unlock the dashboard." />;
  }

  const nameFor = (id: string) => members.find((member) => member._id === id)?.name || "Unknown";
  const currentUserId = session?.user?.id ?? "";
  const myDueToday = (data?.dueToday || []).filter((task) => task.assigneeId === currentUserId);
  const myOverdue = (data?.overdue || []).filter((task) => task.assigneeId === currentUserId);
  const myUpcoming = (data?.upcoming || []).filter((task) => task.assigneeId === currentUserId);
  const myUrgentTasks = [...myOverdue, ...myDueToday, ...myUpcoming].slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:items-start">
        <div className="relative z-20">
          <BulletinBoard />
        </div>

        <div className="relative z-0">
          <SectionCard title="My Tasks">
            <div className="space-y-3">
              {myUrgentTasks.map((task) => (
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
              {!myDueToday.length && !myOverdue.length && !myUpcoming.length ? (
                <EmptyState label="No current tasks for the next week. The suite is in good shape." />
              ) : null}
              {!!myDueToday.length && !myOverdue.length ? (
                <div className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-800">
                  Today is under control. Nothing is currently overdue.
                </div>
              ) : null}
              {!myDueToday.length && !myOverdue.length && !!myUpcoming.length ? (
                <div className="rounded-2xl bg-violet-50 p-4 text-sm text-violet-800">
                  No urgent items today. Here is what is coming up over the next 7 days.
                </div>
              ) : null}
              {!myDueToday.length && !!myOverdue.length ? (
                <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">
                  Overdue chores need attention first before new tasks stack up.
                </div>
              ) : null}
              {!!myDueToday.length && !!myOverdue.length ? (
                <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                  A mix of due-today and overdue work is active, so this is the fastest place to recover the suite.
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
