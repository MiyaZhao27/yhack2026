"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTasks = getTasks;
exports.createTask = createTask;
exports.updateTask = updateTask;
const Task_1 = require("../models/Task");
const date_1 = require("../utils/date");
async function getTasks(req, res) {
    const { suiteId } = req.query;
    const tasks = await Task_1.Task.find(suiteId ? { suiteId } : {}).sort({ dueDate: 1 }).lean();
    res.json(tasks.map((task) => ({
        ...task,
        status: (0, date_1.normalizeTaskStatus)(new Date(task.dueDate), task.status),
    })));
}
async function createTask(req, res) {
    const payload = req.body;
    const task = await Task_1.Task.create({
        ...payload,
        status: (0, date_1.normalizeTaskStatus)(new Date(payload.dueDate), payload.status || "pending"),
        completedAt: payload.status === "done" ? new Date() : null,
    });
    res.status(201).json(task);
}
async function updateTask(req, res) {
    const payload = req.body;
    const status = (0, date_1.normalizeTaskStatus)(new Date(payload.dueDate), payload.status);
    const task = await Task_1.Task.findByIdAndUpdate(req.params.id, {
        ...payload,
        status,
        completedAt: status === "done" ? new Date() : null,
    }, { new: true });
    res.json(task);
}
