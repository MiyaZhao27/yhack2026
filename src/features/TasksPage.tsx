"use client";

import { FormEvent, useEffect, useState } from "react";

import { api } from "../lib/api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { useSuite } from "../context/SuiteContext";
import { formatTaskDate } from "../lib/ui/format";
import { GoogleTaskItem, Task } from "../types";

interface TasksPageProps {
  currentUser?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    suiteId?: string | null;
  };
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfCalendarGrid(date: Date) {
  const firstDay = startOfMonth(date);
  const offset = firstDay.getDay();
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - offset);
  return gridStart;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function taskDueDate(value?: string | null) {
  if (!value) return null;
  return new Date(value);
}

function addRecurringTaskInstances(tasks: Task[], rangeStart: Date, days: Date[]) {
  const rangeStartTime = rangeStart.getTime();
  const rangeEndTime = days[days.length - 1]?.getTime() || rangeStartTime;
  const items: GoogleTaskItem[] = [];

  tasks.forEach((task) => {
    if (task.status === "done") {
      return;
    }

    const baseDate = new Date(task.dueDate);
    const step = task.recurrence === "daily" ? 1 : task.recurrence === "weekly" ? 7 : 0;

    if (!step) {
      if (baseDate.getTime() >= rangeStartTime && baseDate.getTime() <= rangeEndTime) {
        items.push({
          id: `local-${task._id}-${task.dueDate.slice(0, 10)}`,
          title: task.title,
          due: task.dueDate,
          notes: task.notes || null,
        });
      }
      return;
    }

    const cursor = new Date(baseDate);
    while (cursor.getTime() < rangeStartTime) {
      cursor.setDate(cursor.getDate() + step);
    }

    while (cursor.getTime() <= rangeEndTime) {
      items.push({
        id: `local-${task._id}-${cursor.toISOString().slice(0, 10)}`,
        title: task.title,
        due: cursor.toISOString(),
        notes: task.notes || null,
      });
      cursor.setDate(cursor.getDate() + step);
    }
  });

  return items;
}

export function TasksPage({ currentUser }: TasksPageProps) {
  const { suite, members } = useSuite();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [googleTasks, setGoogleTasks] = useState<GoogleTaskItem[]>([]);
  const [googleTasksError, setGoogleTasksError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState<"all" | Task["status"]>("all");
  const [form, setForm] = useState({
    title: "",
    notes: "",
    assigneeId: currentUser?.id || "",
    dueDate: "",
    recurrence: "none",
  });

  const loadTasks = async () => {
    if (!suite?._id) return;
    const data = await api.get<Task[]>(`/tasks?suiteId=${suite._id}`);
    setTasks(data);
  };

  const loadGoogleTasks = async () => {
    try {
      const data = await api.get<GoogleTaskItem[]>("/google-calendar");
      setGoogleTasks(data);
      setGoogleTasksError(null);
    } catch (error) {
      setGoogleTasks([]);
      setGoogleTasksError(error instanceof Error ? error.message : "Failed to load Google Tasks");
    }
  };

  useEffect(() => {
    void loadTasks();
    void loadGoogleTasks();
  }, [suite?._id]);

  useEffect(() => {
    if (currentUser?.id) {
      setForm((current) => ({
        ...current,
        assigneeId: current.assigneeId || currentUser.id || "",
      }));
    }
  }, [currentUser?.id]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!suite?._id) return;
    const response = await api.post<{
      task: Task;
      googleTask?: GoogleTaskItem | null;
      googleTaskSyncError?: string | null;
    }>("/tasks", {
      suiteId: suite._id,
      title: form.title,
      notes: form.notes,
      assigneeId: form.assigneeId || currentUser?.id || members[0]?._id,
      dueDate: form.dueDate,
      status: "pending",
      recurrence: form.recurrence,
    });
    setForm({
      title: "",
      notes: "",
      assigneeId: currentUser?.id || "",
      dueDate: "",
      recurrence: "none",
    });
    setGoogleTasksError(response.googleTaskSyncError || null);
    await loadTasks();
    await loadGoogleTasks();
  };

  const updateStatus = async (task: Task, status: Task["status"]) => {
    await api.patch(`/tasks/${task._id}`, { ...task, status });
    await loadTasks();
  };

  const addTaskToGoogleTasks = async (task: Task) => {
    await api.post(`/tasks/${task._id}`, {});
    await loadTasks();
    await loadGoogleTasks();
  };

  const nameFor = (id: string) => members.find((member) => member._id === id)?.name || "Unknown";
  const today = new Date();
  const gridStart = startOfCalendarGrid(calendarMonth);
  const calendarDays = Array.from({ length: 35 }, (_, index) => addDays(gridStart, index));
  const visibleTasks =
    statusFilter === "all" ? tasks : tasks.filter((task) => task.status === statusFilter);
  const calendarItems = [...googleTasks, ...addRecurringTaskInstances(tasks, gridStart, calendarDays)].filter(
    (task, index, all) =>
      all.findIndex(
        (candidate) => candidate.title === task.title && (candidate.due || "").slice(0, 10) === (task.due || "").slice(0, 10)
      ) === index
  );
  const tasksByDay = calendarItems.reduce<Record<string, GoogleTaskItem[]>>((accumulator, task) => {
    const parsedDate = taskDueDate(task.due);
    if (!parsedDate) return accumulator;

    const key = dateKey(parsedDate);
    accumulator[key] = [...(accumulator[key] || []), task];
    return accumulator;
  }, {});

  return (
    <div className="space-y-6">
      <SectionCard title="Task Calendar" subtitle="LiveWell recurring tasks and synced Google Tasks in a monthly view">
        {googleTasksError ? <div className="mb-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{googleTasksError}</div> : null}
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            className="button-secondary"
            type="button"
            onClick={() =>
              setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
            }
          >
            Previous
          </button>
          <h3 className="text-lg font-semibold text-slate-900">
            {calendarMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}
          </h3>
          <button
            className="button-secondary"
            type="button"
            onClick={() =>
              setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
            }
          >
            Next
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const key = dateKey(day);
            const dayTasks = tasksByDay[key] || [];
            const inCurrentMonth = day.getMonth() === calendarMonth.getMonth();

            return (
              <div
                key={key}
                className={`min-h-28 rounded-2xl border p-3 text-left ${
                  inCurrentMonth ? "bg-white" : "bg-slate-50 text-slate-400"
                } ${sameDay(day, today) ? "border-sky-300 shadow-sm" : "border-slate-200"}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className={`text-sm font-semibold ${sameDay(day, today) ? "text-sky-700" : "text-slate-700"}`}>
                    {day.getDate()}
                  </span>
                  {dayTasks.length ? <span className="pill bg-sky-100 text-sky-700">{dayTasks.length}</span> : null}
                </div>

                <div className="space-y-2">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="rounded-xl bg-sky-50 px-2 py-1 text-xs text-sky-900">
                      <p className="truncate font-medium">{task.title}</p>
                    </div>
                  ))}
                  {dayTasks.length > 3 ? (
                    <p className="text-xs text-slate-500">+{dayTasks.length - 3} more</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {!calendarItems.length && !googleTasksError ? (
          <div className="mt-4">
            <EmptyState label="No calendar tasks found yet." />
          </div>
        ) : null}
      </SectionCard>

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
          <textarea
            className="input min-h-24"
            placeholder="Optional details for the Google Task"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
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
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { label: "All", value: "all" as const },
            { label: "Pending", value: "pending" as const },
            { label: "Overdue", value: "overdue" as const },
            { label: "Done", value: "done" as const },
          ].map((option) => (
            <button
              key={option.value}
              className={statusFilter === option.value ? "button-primary" : "button-secondary"}
              type="button"
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {visibleTasks.map((task) => (
            <div key={task._id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{task.title}</p>
                  <p className="text-sm text-slate-500">
                    {nameFor(task.assigneeId)} • Due {formatTaskDate(task.dueDate)} • {task.recurrence}
                  </p>
                  {task.notes ? <p className="mt-1 text-sm text-slate-500">{task.notes}</p> : null}
                </div>
                <div className="flex gap-2">
                  {currentUser?.id === task.assigneeId && !task.googleTaskId ? (
                    <button className="button-secondary" onClick={() => addTaskToGoogleTasks(task)}>
                      Add to Google Tasks
                    </button>
                  ) : null}
                  {task.status !== "done" ? (
                    <button className="button-secondary" onClick={() => updateStatus(task, "done")}>
                      Done
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-3">
                <span
                  className={`pill ${
                    task.status === "done"
                      ? "bg-emerald-100 text-emerald-800"
                      : task.status === "overdue"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {task.status}
                </span>
              </div>
            </div>
          ))}
          {!visibleTasks.length ? (
            <EmptyState
              label={
                tasks.length
                  ? "No tasks match this filter yet."
                  : "No tasks yet. Add the first suite chore."
              }
            />
          ) : null}
        </div>
      </SectionCard>
      </div>
    </div>
  );
}
