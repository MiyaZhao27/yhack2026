export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function taskDateKey(value: Date | string) {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

export function isSameDay(dateA: Date | string, dateB: Date) {
  return taskDateKey(dateA) === localDateKey(dateB);
}

export function normalizeTaskStatus(dueDate: Date | string, status: string, now = new Date()) {
  if (status === "done") {
    return "done";
  }

  return taskDateKey(dueDate) < localDateKey(now) ? "overdue" : "pending";
}

export function shouldShowTask(
  task: { status: string; completedAt?: Date | string | null },
  now = new Date()
) {
  if (task.status !== "done") {
    return true;
  }

  if (!task.completedAt) {
    return false;
  }

  const completedAt = new Date(task.completedAt);
  return now.getTime() - completedAt.getTime() < 24 * 60 * 60 * 1000;
}
