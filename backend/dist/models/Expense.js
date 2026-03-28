"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Expense = void 0;
const mongoose_1 = require("mongoose");
const expenseSchema = new mongoose_1.Schema({
    suiteId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Suite", required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paidBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    participants: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true }],
    splitType: { type: String, enum: ["equal"], default: "equal" },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true, versionKey: false });
exports.Expense = (0, mongoose_1.model)("Expense", expenseSchema);
