"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSameDay = isSameDay;
exports.normalizeTaskStatus = normalizeTaskStatus;
function isSameDay(dateA, dateB) {
    return dateA.toDateString() === dateB.toDateString();
}
function normalizeTaskStatus(dueDate, status) {
    if (status === "done") {
        return "done";
    }
    return dueDate.getTime() < Date.now() ? "overdue" : "pending";
}
