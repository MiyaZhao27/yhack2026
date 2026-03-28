import mongoose from "mongoose";

import { connectDatabase } from "./config/db";
import { Expense } from "./models/Expense";
import { ShoppingItem } from "./models/ShoppingItem";
import { Suite } from "./models/Suite";
import { Task } from "./models/Task";
import { User } from "./models/User";

<<<<<<< HEAD
=======
const SEEDED_INVITE_CODE = "MAPLE4";

>>>>>>> origin/lauren/tasks
async function seed() {
  await connectDatabase();

  await Promise.all([
    Expense.deleteMany({}),
    ShoppingItem.deleteMany({}),
    Task.deleteMany({}),
    User.deleteMany({}),
    Suite.deleteMany({}),
  ]);

<<<<<<< HEAD
  const suite = await Suite.create({ name: "Maple 4B", memberIds: [] });
=======
  const suite = await Suite.create({ name: "Maple 4B", memberIds: [], inviteCode: SEEDED_INVITE_CODE });
>>>>>>> origin/lauren/tasks
  const [edmund, alex, ryan, mia] = await User.insertMany([
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

  await Task.insertMany([
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

  await ShoppingItem.insertMany([
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

  await Expense.insertMany([
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

<<<<<<< HEAD
  console.log("Seeded Maple 4B with demo data");
=======
  console.log(`Seeded Maple 4B with demo data (invite code: ${suite.inviteCode})`);
>>>>>>> origin/lauren/tasks
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
