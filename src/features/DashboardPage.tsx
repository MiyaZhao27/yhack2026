"use client";

import { useEffect, useMemo, useState } from "react";
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

  const nameFor = (id: string) => members.find((member) => member._id === id)?.name || "Unknown";
  const currentUserId = session?.user?.id ?? "";
  const myOverdue = useMemo(
    () =>
      (data?.overdue || []).filter((task) =>
        currentUserId ? task.assigneeId === currentUserId : true
      ),
    [currentUserId, data?.overdue]
  );
  const myDueToday = useMemo(
    () =>
      (data?.dueToday || []).filter((task) =>
        currentUserId ? task.assigneeId === currentUserId : true
      ),
    [currentUserId, data?.dueToday]
  );
  const priorityTasks = useMemo(
    () => [...myOverdue, ...myDueToday].slice(0, 8),
    [myDueToday, myOverdue]
  );

  const overdueCount = myOverdue.length;
  const dueTodayCount = myDueToday.length;

  if (!suite) {
    return <EmptyState label="Create a suite in Setup to unlock your dashboard." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(290px,1fr)] xl:items-start">
      <div className="relative z-10">
        <BulletinBoard />
      </div>

      <div className="space-y-4">
        <SectionCard title="My Tasks">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="surface-soft rounded-2xl px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f1d3a]">Overdue</p>
              <p className="mt-1 text-xl font-bold text-[#8f1d3a]">{overdueCount}</p>
            </div>
            <div className="surface-soft rounded-2xl px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0c306e]">Due Today</p>
              <p className="mt-1 text-xl font-bold text-[#0c306e]">{dueTodayCount}</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {priorityTasks.map((task) => (
              <div key={task._id} className="surface-soft interactive-lift rounded-2xl px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#2a1738]">{task.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{nameFor(task.assigneeId)}</p>
                  </div>
                  <span className={task.status === "overdue" ? "badge-negative" : "pill bg-[#d9e2ff] text-[#0c306e]"}>
                    {task.status}
                  </span>
                </div>
              </div>
            ))}

            {!priorityTasks.length ? (
              <EmptyState label="No urgent tasks right now. The suite is in a good place." />
            ) : null}
          </div>
        </SectionCard>

      </div>
    </div>
  );
}
