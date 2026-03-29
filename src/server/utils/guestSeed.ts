import { Types } from "mongoose";

import { BulletinNote } from "../models/BulletinNote";
import { Expense } from "../models/Expense";
import { Suite } from "../models/Suite";
import { Task } from "../models/Task";
import { User } from "../models/User";

const GUEST_EMAIL = "guest@demo.suiteease";
const GUEST_NAME = "You (Demo)";

export async function ensureGuestSeedData() {
  // Find or create the primary guest user
  let guestUser = await User.findOne({ email: GUEST_EMAIL });

  if (guestUser) {
    return guestUser;
  }

  // Create demo roommates
  let alex = await User.findOne({ email: "alex@demo.suiteease" });
  if (!alex) {
    alex = await User.create({
      name: "Alex",
      email: "alex@demo.suiteease",
      image: null,
      suiteIds: [],
      activeSuiteId: null,
      onboardingComplete: true,
    });
  }

  let jordan = await User.findOne({ email: "jordan@demo.suiteease" });
  if (!jordan) {
    jordan = await User.create({
      name: "Jordan",
      email: "jordan@demo.suiteease",
      image: null,
      suiteIds: [],
      activeSuiteId: null,
      onboardingComplete: true,
    });
  }

  // Find or create demo suite
  let suite = await Suite.findOne({ name: "Demo Apartment" });
  if (!suite) {
    suite = await Suite.create({
      name: "Demo Apartment",
      memberIds: [],
      inviteCode: "DEMO01",
    });
  }

  const suiteId = suite._id as Types.ObjectId;

  // Ensure all members are in the suite
  const memberIds = [String(alex._id), String(jordan._id)];
  suite.memberIds = memberIds.map((id) => new Types.ObjectId(id));

  // Create or update guest user
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const in3Days = new Date(now);
  in3Days.setDate(in3Days.getDate() + 3);
  const in5Days = new Date(now);
  in5Days.setDate(in5Days.getDate() + 5);
  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  if (!guestUser) {
    guestUser = await User.create({
      name: GUEST_NAME,
      email: GUEST_EMAIL,
      image: null,
      suiteIds: [suiteId],
      activeSuiteId: suiteId,
      onboardingComplete: false,
    });
  }

  // Add guest to suite
  suite.memberIds = [guestUser._id, alex._id, jordan._id] as Types.ObjectId[];
  await suite.save();

  // Update roommates to belong to this suite
  alex.suiteIds = [suiteId];
  alex.activeSuiteId = suiteId;
  await alex.save();

  jordan.suiteIds = [suiteId];
  jordan.activeSuiteId = suiteId;
  await jordan.save();

  const guestId = guestUser._id as Types.ObjectId;
  const alexId = alex._id as Types.ObjectId;
  const jordanId = jordan._id as Types.ObjectId;

  // Seed tasks (only if suite has none)
  const existingTasks = await Task.countDocuments({ suiteId });
  if (existingTasks === 0) {
    await Task.insertMany([
      {
        suiteId,
        title: "Take out trash",
        assigneeId: guestId,
        dueDate: yesterday,
        status: "overdue",
        recurrence: "weekly",
      },
      {
        suiteId,
        title: "Vacuum living room",
        assigneeId: guestId,
        dueDate: tomorrow,
        status: "pending",
        recurrence: "weekly",
      },
      {
        suiteId,
        title: "Buy dish soap",
        notes: "The one with lemon scent",
        assigneeId: alexId,
        dueDate: yesterday,
        status: "done",
        recurrence: "none",
        completedAt: now,
      },
      {
        suiteId,
        title: "Pay electric bill",
        assigneeId: jordanId,
        dueDate: in3Days,
        status: "pending",
        recurrence: "none",
      },
      {
        suiteId,
        title: "Clean bathroom",
        assigneeId: guestId,
        dueDate: in5Days,
        status: "pending",
        recurrence: "weekly",
      },
      {
        suiteId,
        title: "Mop kitchen floor",
        assigneeId: alexId,
        dueDate: in3Days,
        status: "pending",
        recurrence: "weekly",
      },
    ]);
  }

  // Seed expenses (only if suite has none)
  const existingExpenses = await Expense.countDocuments({ suiteId });
  if (existingExpenses === 0) {
    await Expense.insertMany([
      {
        suiteId,
        title: "Groceries",
        amount: 45.6,
        paidBy: guestId,
        date: lastWeek,
        participants: [guestId, alexId, jordanId],
        splitMethod: "equal",
        splits: [
          { participantId: guestId, owedAmount: 15.2 },
          { participantId: alexId, owedAmount: 15.2 },
          { participantId: jordanId, owedAmount: 15.2 },
        ],
        items: [],
      },
      {
        suiteId,
        title: "Netflix subscription",
        amount: 18.0,
        paidBy: jordanId,
        date: twoWeeksAgo,
        participants: [guestId, alexId, jordanId],
        splitMethod: "equal",
        splits: [
          { participantId: guestId, owedAmount: 6.0 },
          { participantId: alexId, owedAmount: 6.0 },
          { participantId: jordanId, owedAmount: 6.0 },
        ],
        items: [],
      },
      {
        suiteId,
        title: "Cleaning supplies",
        amount: 22.5,
        paidBy: alexId,
        date: lastWeek,
        participants: [guestId, alexId],
        splitMethod: "equal",
        splits: [
          { participantId: guestId, owedAmount: 11.25 },
          { participantId: alexId, owedAmount: 11.25 },
        ],
        items: [],
      },
    ]);
  }

  // Seed bulletin notes (only if suite has none)
  const existingNotes = await BulletinNote.countDocuments({ suiteId });
  if (existingNotes === 0) {
    await BulletinNote.insertMany([
      {
        suiteId,
        color: "red",
        text: "Rent is due on the 1st! Don't be late 🏠",
        x: 80,
        y: 60,
        rotationDeg: -3,
      },
      {
        suiteId,
        color: "blue",
        text: "WiFi: SuiteEase_5G\nPassword: suiteease123",
        x: 300,
        y: 120,
        rotationDeg: 2,
      },
      {
        suiteId,
        color: "yellow",
        text: "Movie night Friday 8pm 🎬 bring snacks!",
        x: 160,
        y: 240,
        rotationDeg: -1,
      },
    ]);
  }

  return guestUser;
}
