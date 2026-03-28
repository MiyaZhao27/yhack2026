export function isSameDay(dateA: Date, dateB: Date) {
  return dateA.toDateString() === dateB.toDateString();
}

export function normalizeTaskStatus(dueDate: Date, status: string) {
  if (status === "done") {
    return "done";
  }

  return dueDate.getTime() < Date.now() ? "overdue" : "pending";
}
