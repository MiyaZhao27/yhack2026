"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

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

function startOfWeek(date: Date) {
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
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
  const [calendarCursor, setCalendarCursor] = useState(() => new Date());
  const [calendarRange, setCalendarRange] = useState<"day" | "week" | "month">("month");
  const [statusFilter, setStatusFilter] = useState<"all" | Task["status"]>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "board">("calendar");
  const [selectedDayKey, setSelectedDayKey] = useState(() => dateKey(new Date()));
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
    if (!currentUser?.id) {
      setGoogleTasks([]);
      setGoogleTasksError(null);
      return;
    }

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

  useEffect(() => {
    if (assigneeFilter !== "all" && !members.some((member) => member._id === assigneeFilter)) {
      setAssigneeFilter("all");
    }
  }, [assigneeFilter, members]);

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
    setShowNewTaskModal(false);
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
  const monthStart = startOfMonth(calendarCursor);
  const monthGridStart = startOfCalendarGrid(calendarCursor);
  const weekStart = startOfWeek(calendarCursor);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const monthDays = Array.from({ length: 35 }, (_, index) => addDays(monthGridStart, index));
  const dayOnly = [new Date(calendarCursor)];
  const activeDays = calendarRange === "day" ? dayOnly : calendarRange === "week" ? weekDays : monthDays;
  const activeRangeStart = activeDays[0] || new Date(calendarCursor);
  const assigneeFilteredTasks =
    assigneeFilter === "all" ? tasks : tasks.filter((task) => task.assigneeId === assigneeFilter);
  const visibleTasks =
    statusFilter === "all"
      ? assigneeFilteredTasks
      : assigneeFilteredTasks.filter((task) => task.status === statusFilter);
  const includeGoogleTasks = assigneeFilter === "all" || assigneeFilter === currentUser?.id;
  const calendarItems = [
    ...(includeGoogleTasks ? googleTasks : []),
    ...addRecurringTaskInstances(assigneeFilteredTasks, activeRangeStart, activeDays),
  ].filter(
    (task, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.title === task.title &&
          (candidate.due || "").slice(0, 10) === (task.due || "").slice(0, 10)
      ) === index
  );
  const tasksByDay = calendarItems.reduce<Record<string, GoogleTaskItem[]>>((accumulator, task) => {
    const parsedDate = taskDueDate(task.due);
    if (!parsedDate) return accumulator;

    const key = dateKey(parsedDate);
    accumulator[key] = [...(accumulator[key] || []), task];
    return accumulator;
  }, {});
  const selectedDayTasks = tasksByDay[selectedDayKey] || [];

  useEffect(() => {
    setSelectedDayKey(dateKey(calendarCursor));
  }, [calendarCursor, calendarRange]);

  const shiftCalendar = (direction: -1 | 1) => {
    setCalendarCursor((current) => {
      const next = new Date(current);
      if (calendarRange === "day") {
        next.setDate(next.getDate() + direction);
      } else if (calendarRange === "week") {
        next.setDate(next.getDate() + direction * 7);
      } else {
        next.setMonth(next.getMonth() + direction);
      }
      return next;
    });
  };

  const openDayDetails = (key: string) => {
    setSelectedDayKey(key);
    setShowDayDetailsModal(true);
  };

  const calendarTitle =
    calendarRange === "month"
      ? monthStart.toLocaleString("en-US", { month: "long", year: "numeric" })
      : calendarRange === "week"
        ? `${weekDays[0]?.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekDays[6]?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : calendarCursor.toLocaleDateString("en-US", {
            weekday: "short",
            month: "long",
            day: "numeric",
            year: "numeric",
          });

  return (
    <>
      {showNewTaskModal ? (
        <div className="modal-shell" onClick={(event) => event.target === event.currentTarget && setShowNewTaskModal(false)}>
          <div className="modal-card max-w-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#2a1738]">New Task</h2>
              <button className="button-ghost p-1" type="button" onClick={() => setShowNewTaskModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <input
                className="input"
                placeholder="Wash dishes"
                required
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
              <textarea
                className="input min-h-20"
                placeholder="Optional details"
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
              <div className="grid gap-2 sm:grid-cols-2">
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
              </div>
              <button className="button-primary w-full" type="submit">
                Add Task
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {showDayDetailsModal ? (
        <div className="modal-shell sm:hidden" onClick={(event) => event.target === event.currentTarget && setShowDayDetailsModal(false)}>
          <div className="modal-card max-w-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#2a1738]">
                {new Date(`${selectedDayKey}T00:00:00`).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              <button className="button-ghost p-1" type="button" onClick={() => setShowDayDetailsModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2">
              {selectedDayTasks.map((task) => (
                <div key={task.id} className="rounded-xl bg-[#f6eef9] px-3 py-2 text-sm text-[#4f3f5a]">
                  <p className="font-semibold">{task.title}</p>
                </div>
              ))}
              {!selectedDayTasks.length ? <p className="text-sm text-muted">No tasks on this day.</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      <SectionCard
        title="Tasks"
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="segmented w-full sm:w-auto">
              <button
                className={viewMode === "calendar" ? "segment-button-active" : "segment-button"}
                onClick={() => setViewMode("calendar")}
              >
                Calendar
              </button>
              <button
                className={viewMode === "board" ? "segment-button-active" : "segment-button"}
                onClick={() => setViewMode("board")}
              >
                Board
              </button>
            </div>
            <button className="button-primary w-full px-3 py-2 text-xs sm:w-auto" onClick={() => setShowNewTaskModal(true)}>
              <Plus size={14} /> New Task
            </button>
          </div>
        }
      >
        {googleTasksError ? (
          <div className="mb-3 rounded-2xl bg-[#ffdcbf] px-4 py-3 text-sm font-medium text-[#7a4300]">
            {googleTasksError}
          </div>
        ) : null}

        {viewMode === "calendar" ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                className="button-secondary px-3 py-2 text-xs"
                type="button"
                onClick={() => shiftCalendar(-1)}
              >
                Previous
              </button>
              <h3 className="text-base font-semibold text-[#2a1738] sm:text-lg">
                {calendarTitle}
              </h3>
              <button
                className="button-secondary px-3 py-2 text-xs"
                type="button"
                onClick={() => shiftCalendar(1)}
              >
                Next
              </button>
            </div>

            <div className="mb-3 flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="segmented w-full sm:w-auto">
                {(["day", "week", "month"] as const).map((range) => (
                  <button
                    key={range}
                    className={calendarRange === range ? "segment-button-active" : "segment-button"}
                    type="button"
                    onClick={() => setCalendarRange(range)}
                  >
                    {range[0].toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
              <select
                className="input h-10 w-full sm:w-56"
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
              >
                <option value="all">All members</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {calendarRange === "month" ? (
              <>
                <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="py-1.5">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {monthDays.map((day) => {
                    const key = dateKey(day);
                    const dayTasks = tasksByDay[key] || [];
                    const inCurrentMonth = day.getMonth() === monthStart.getMonth();
                    const isToday = sameDay(day, today);
                    const isSelected = key === selectedDayKey;

                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => {
                          setSelectedDayKey(key);
                          if (typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches) {
                            setShowDayDetailsModal(true);
                          }
                        }}
                        className={`min-h-[108px] rounded-2xl border px-2 py-2 text-left ${
                          inCurrentMonth ? "bg-white/80 text-[#2a1738]" : "bg-white/40 text-muted"
                        } ${
                          isToday
                            ? "border-[#8b1d44]/55 shadow-[0_8px_20px_-18px_rgba(107,0,46,0.7)]"
                            : "border-[rgba(108,73,118,0.22)]"
                        } ${isSelected ? "ring-1 ring-[#8b1d44]/55" : ""} min-h-[86px] sm:min-h-[108px]`}
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className={`text-xs font-bold ${isToday ? "text-[#8b1d44]" : "text-[#4f3f5a]"}`}>
                            {day.getDate()}
                          </span>
                          {dayTasks.length ? (
                            <span className="pill bg-[#d9e2ff] px-2 py-0.5 text-[10px] text-[#0c306e]">
                              {dayTasks.length}
                            </span>
                          ) : null}
                        </div>

                        <div className="hidden space-y-1 sm:block">
                          {dayTasks.slice(0, 2).map((task) => (
                            <div key={task.id} className="rounded-lg bg-[#f6eef9] px-1.5 py-1 text-[11px] text-[#4f3f5a]">
                              <p className="truncate font-semibold">{task.title}</p>
                            </div>
                          ))}
                          {dayTasks.length > 2 ? (
                            <p className="text-[11px] font-medium text-muted">+{dayTasks.length - 2} more</p>
                          ) : null}
                        </div>

                        <div className="mt-1 flex items-center gap-1 sm:hidden">
                          {dayTasks.slice(0, 3).map((task) => (
                            <span key={task.id} className="h-1.5 w-1.5 rounded-full bg-[#8b1d44]/70" />
                          ))}
                          {dayTasks.length > 3 ? (
                            <span className="text-[10px] font-semibold text-[#8b1d44]">+{dayTasks.length - 3}</span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            {calendarRange === "week" ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
                {weekDays.map((day) => {
                  const key = dateKey(day);
                  const dayTasks = tasksByDay[key] || [];
                  const isToday = sameDay(day, today);
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => {
                        if (typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches) {
                          openDayDetails(key);
                        }
                      }}
                      className={`rounded-2xl border px-3 py-3 ${isToday ? "border-[#8b1d44]/55" : "border-[rgba(108,73,118,0.22)]"} bg-white/80`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                        {day.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#2a1738]">
                        {day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {dayTasks.map((task) => (
                          <div key={task.id} className="rounded-lg bg-[#f6eef9] px-2 py-1.5 text-xs text-[#4f3f5a]">
                            <p className="font-semibold">{task.title}</p>
                          </div>
                        ))}
                        {!dayTasks.length ? <p className="text-xs text-muted">No tasks</p> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {calendarRange === "day" ? (
              <div className="rounded-2xl border border-[rgba(108,73,118,0.22)] bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  {calendarCursor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
                <div className="mt-2 space-y-2">
                  {(tasksByDay[dateKey(calendarCursor)] || []).map((task) => (
                    <div key={task.id} className="rounded-xl bg-[#f6eef9] px-3 py-2 text-sm text-[#4f3f5a]">
                      <p className="font-semibold">{task.title}</p>
                    </div>
                  ))}
                  {!(tasksByDay[dateKey(calendarCursor)] || []).length ? (
                    <p className="text-sm text-muted">No tasks on this day.</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {!calendarItems.length && !googleTasksError ? (
              <div className="mt-3">
                <EmptyState label="No calendar tasks found yet." />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {[
                { label: "All", value: "all" as const },
                { label: "Pending", value: "pending" as const },
                { label: "Overdue", value: "overdue" as const },
                { label: "Done", value: "done" as const },
              ].map((option) => (
                <button
                  key={option.value}
                  className={statusFilter === option.value ? "segment-button-active" : "segment-button"}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
              <select
                className="input h-10 min-w-[160px] flex-1 sm:max-w-[220px]"
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
              >
                <option value="all">All members</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2.5">
              {visibleTasks.map((task) => (
                <div key={task._id} className="surface-soft rounded-2xl px-3 py-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#2a1738]">{task.title}</p>
                      <p className="text-xs text-muted">
                        {nameFor(task.assigneeId)} · Due {formatTaskDate(task.dueDate)} · {task.recurrence}
                      </p>
                      {task.notes ? <p className="mt-1 text-xs text-ink-soft">{task.notes}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {currentUser?.id === task.assigneeId && !task.googleTaskId ? (
                        <button className="button-secondary px-3 py-1.5 text-xs" onClick={() => addTaskToGoogleTasks(task)}>
                          Add to Google
                        </button>
                      ) : null}
                      {task.status !== "done" ? (
                        <button className="button-secondary px-3 py-1.5 text-xs" onClick={() => updateStatus(task, "done")}>
                          Mark Done
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2">
                    <span
                      className={
                        task.status === "done"
                          ? "badge-positive"
                          : task.status === "overdue"
                            ? "badge-negative"
                            : "pill bg-[#ffdcbf] text-[#7a4300]"
                      }
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
          </>
        )}
      </SectionCard>
    </>
  );
}
