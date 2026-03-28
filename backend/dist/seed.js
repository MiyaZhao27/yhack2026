"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = require("./config/db");
const Expense_1 = require("./models/Expense");
const ShoppingItem_1 = require("./models/ShoppingItem");
const Suite_1 = require("./models/Suite");
const Task_1 = require("./models/Task");
const User_1 = require("./models/User");
async function seed() {
    await (0, db_1.connectDatabase)();
    await Promise.all([
        Expense_1.Expense.deleteMany({}),
        ShoppingItem_1.ShoppingItem.deleteMany({}),
        Task_1.Task.deleteMany({}),
        User_1.User.deleteMany({}),
        Suite_1.Suite.deleteMany({}),
    ]);
    const suite = await Suite_1.Suite.create({ name: "Maple 4B", memberIds: [] });
    const [edmund, alex, ryan, mia] = await User_1.User.insertMany([
        { name: "Edmund", suiteId: suite._id },
        { name: "Alex", suiteId: suite._id },
        { name: "Ryan", suiteId: suite._id },
        { name: "Mia", suiteId: suite._id },
    ]);
    suite.memberIds = [edmund._id, alex._id, ryan._id, mia._id].map(String);
    await suite.save();
    const now = new Date();
    const todayEvening = new Date(now);
    todayEvening.setHours(19, 0, 0, 0);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(18, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    await Task_1.Task.insertMany([
        {
            suiteId: suite._id,
            title: "Take out recycling",
            assigneeId: edmund._id,
            dueDate: todayEvening,
            status: "pending",
            recurrence: "weekly",
        },
        {
            suiteId: suite._id,
            title: "Wipe kitchen counters",
            assigneeId: mia._id,
            dueDate: yesterday,
            status: "overdue",
            recurrence: "daily",
        },
        {
            suiteId: suite._id,
            title: "Vacuum common room",
            assigneeId: alex._id,
            dueDate: tomorrow,
            status: "pending",
            recurrence: "none",
        },
        {
            suiteId: suite._id,
            title: "Refill water filter",
            assigneeId: ryan._id,
            dueDate: yesterday,
            status: "done",
            recurrence: "weekly",
            completedAt: yesterday,
        },
    ]);
    await ShoppingItem_1.ShoppingItem.insertMany([
        {
            suiteId: suite._id,
            name: "Milk",
            quantity: 2,
            requestedBy: alex._id,
            category: "groceries",
            status: "needed",
        },
        {
            suiteId: suite._id,
            name: "Dish soap",
            quantity: 1,
            requestedBy: mia._id,
            category: "cleaning",
            status: "needed",
        },
        {
            suiteId: suite._id,
            name: "Paper towels",
            quantity: 3,
            requestedBy: edmund._id,
            category: "household",
            status: "bought",
            boughtBy: ryan._id,
        },
    ]);
    await Expense_1.Expense.insertMany([
        {
            suiteId: suite._id,
            title: "Costco run",
            amount: 84,
            paidBy: mia._id,
            participants: [edmund._id, alex._id, ryan._id, mia._id],
            splitType: "equal",
            createdAt: now,
        },
        {
            suiteId: suite._id,
            title: "Cleaning supplies",
            amount: 36,
            paidBy: edmund._id,
            participants: [edmund._id, alex._id, mia._id],
            splitType: "equal",
            createdAt: yesterday,
        },
        {
            suiteId: suite._id,
            title: "Late-night snacks",
            amount: 24,
            paidBy: alex._id,
            participants: [alex._id, ryan._id],
            splitType: "equal",
            createdAt: tomorrow,
        },
    ]);
    console.log("Seeded Maple 4B with demo data");
    await mongoose_1.default.disconnect();
}
seed().catch(async (error) => {
    console.error(error);
    await mongoose_1.default.disconnect();
    process.exit(1);
});
