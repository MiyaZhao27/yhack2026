"use client";

import { FormEvent, useEffect, useState } from "react";

import { api } from "../lib/api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { useSuite } from "../context/SuiteContext";
import { formatDate } from "../lib/ui/format";
import { Task } from "../types";

interface TasksPageProps {
  currentUser?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    suiteId?: string | null;
  };
}

export function TasksPage({ currentUser }: TasksPageProps) {
  const { suite, members } = useSuite();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState({
    title: "",
    assigneeId: "",
    dueDate: "",
    recurrence: "none",
  });

  const loadTasks = async () => {
    if (!suite?._id) return;
    const data = await api.get<Task[]>(`/tasks?suiteId=${suite._id}`);
    setTasks(data);
  };

  useEffect(() => {
    void loadTasks();
  }, [suite?._id]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!suite?._id) return;
    await api.post("/tasks", {
      suiteId: suite._id,
      title: form.title,
      assigneeId: form.assigneeId || members[0]?._id,
      dueDate: form.dueDate,
      status: "pending",
      recurrence: form.recurrence,
    });
    setForm({ title: "", assigneeId: "", dueDate: "", recurrence: "none" });
    await loadTasks();
  };

  const updateStatus = async (task: Task, status: Task["status"]) => {
    await api.patch(`/tasks/${task._id}`, { ...task, status });
    await loadTasks();
  };

  const nameFor = (id: string) => members.find((member) => member._id === id)?.name || "Unknown";

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <SectionCard title="New Task" subtitle="Assign a chore with just enough structure">
        {currentUser ? (
          <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">{currentUser.name || "Signed-in user"}</p>
            <p>{currentUser.email}</p>
            {currentUser.id ? <p className="mt-1 text-xs text-slate-500">User ID: {currentUser.id}</p> : null}
          </div>
        ) : null}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            className="input"
            placeholder="Wash dishes"
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <select
            className="input"
            value={form.assigneeId}
            onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}
          >
            <option value="">Assign to...</option>
            {members.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            required
            value={form.dueDate}
            onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
          />
          <select
            className="input"
            value={form.recurrence}
            onChange={(event) => setForm({ ...form, recurrence: event.target.value })}
          >
            <option value="none">No recurrence</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <button className="button-primary w-full" type="submit">
            Add Task
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Task Board" subtitle="Pending, done, and overdue in one place">
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task._id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{task.title}</p>
                  <p className="text-sm text-slate-500">
                    {nameFor(task.assigneeId)} • Due {formatDate(task.dueDate)} • {task.recurrence}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="button-secondary" onClick={() => updateStatus(task, "pending")}>
                    Pending
                  </button>
                  <button className="button-secondary" onClick={() => updateStatus(task, "done")}>
                    Done
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <span
                  className={`pill ${
                    task.status === "done"
                      ? "bg-emerald-100 text-emerald-800"
                      : task.status === "overdue"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {task.status}
                </span>
              </div>
            </div>
          ))}
          {!tasks.length ? <EmptyState label="No tasks yet. Add the first suite chore." /> : null}
        </div>
      </SectionCard>
    </div>
  );
}
