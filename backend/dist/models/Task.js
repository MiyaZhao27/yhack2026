"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Task = void 0;
const mongoose_1 = require("mongoose");
const taskSchema = new mongoose_1.Schema({
    suiteId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Suite", required: true },
    title: { type: String, required: true, trim: true },
    assigneeId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ["pending", "done", "overdue"],
        default: "pending",
    },
    recurrence: {
        type: String,
        enum: ["none", "daily", "weekly"],
        default: "none",
    },
    completedAt: { type: Date, default: null },
}, { timestamps: true });
exports.Task = (0, mongoose_1.model)("Task", taskSchema);
