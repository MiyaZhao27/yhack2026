import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "../../../auth";
import { connectDatabase } from "../../../server/config/db";
import { Expense } from "../../../server/models/Expense";
import { Task } from "../../../server/models/Task";
import { Suite } from "../../../server/models/Suite";
import { Settlement } from "../../../server/models/Settlement";
import { BulletinNote } from "../../../server/models/BulletinNote";
import { User } from "../../../server/models/User";
import { getFairnessSummary, getSuiteBalances } from "../../../server/services/balanceService";
import { normalizeTaskStatus } from "../../../server/utils/date";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function fmt(n: number) {
  return `$${n.toFixed(2)}`;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ? String(session.user.id) : "";
  const suiteId = session?.user?.suiteId ? String(session.user.suiteId) : "";

  if (!userId || !suiteId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, history = [] } = (await request.json()) as {
    message: string;
    history: ChatMessage[];
  };

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (!process.env.LAVA_API_KEY) {
    return NextResponse.json({ error: "AI agent is not configured." }, { status: 500 });
  }

  await connectDatabase();

  const [suite, members, expenses, tasks, settlements, bulletinNotes, balanceData, fairness] = await Promise.all([
    Suite.findById(suiteId).lean(),
    User.find({ suiteId }).lean(),
    Expense.find({ suiteId }).sort({ createdAt: -1 }).lean(),
    Task.find({ suiteId }).sort({ dueDate: 1 }).lean(),
    Settlement.find({ suiteId }).sort({ date: -1 }).lean(),
    BulletinNote.find({ suiteId }).lean(),
    getSuiteBalances(suiteId, userId),
    getFairnessSummary(suiteId),
  ]);

  const nameMap = new Map<string, string>(
    (members as any[]).map((m: any) => [String(m._id), m.name as string])
  );
  const currentUserName = nameMap.get(userId) ?? "You";
  const suiteName = (suite as any)?.name ?? "your suite";

  const today = new Date();

  const normalizedTasks = (tasks as any[]).map((t: any) => ({
    ...t,
    status: normalizeTaskStatus(new Date(t.dueDate), t.status),
  }));

  // Build context
  const balanceLines = balanceData.balances
    .map((b) => {
      if (b.outstandingNet > 0.01) return `  ${b.name}: is owed ${fmt(b.outstandingNet)}`;
      if (b.outstandingNet < -0.01) return `  ${b.name}: owes ${fmt(-b.outstandingNet)}`;
      return `  ${b.name}: fully settled`;
    })
    .join("\n");

  const settleUpLines = balanceData.settleUps
    .map((s) => `  ${s.from} should pay ${s.to} ${fmt(s.amount)}`)
    .join("\n");

  const expenseLines = (expenses as any[])
    .map((e: any) => {
      const payer = nameMap.get(String(e.paidBy)) ?? "Unknown";
      const date = new Date(e.date ?? e.createdAt).toLocaleDateString();
      const itemSummary =
        e.items?.length > 0
          ? ` (items: ${(e.items as any[]).map((i: any) => `${i.name} ${fmt(i.amount)}`).join(", ")})`
          : "";
      return `  ${date} — "${e.title}" ${fmt(e.amount)} paid by ${payer}${itemSummary}`;
    })
    .join("\n");

  const taskLines = normalizedTasks
    .map((t: any) => {
      const assignee = nameMap.get(String(t.assigneeId)) ?? "Unknown";
      const due = new Date(t.dueDate).toLocaleDateString();
      return `  [${t.status}] "${t.title}" — ${assignee}, due ${due}${t.notes ? `, notes: ${t.notes}` : ""}`;
    })
    .join("\n");

  const settlementLines = (settlements as any[])
    .map((s: any) => {
      const payer = nameMap.get(String(s.payerId)) ?? "Unknown";
      const receiver = nameMap.get(String(s.receiverId)) ?? "Unknown";
      const date = new Date(s.date).toLocaleDateString();
      const type = s.type === "netting" ? "auto-netted" : "payment";
      return `  ${date} — ${payer} paid ${receiver} ${fmt(s.amount)} [${type}]${s.note ? ` "${s.note}"` : ""}`;
    })
    .join("\n");

  const bulletinLines = (bulletinNotes as any[])
    .map((n: any) => `  "${n.text}"`)
    .join("\n");

  const fairnessLines = (fairness as any[])
    .map(
      (f: any) =>
        `  ${nameMap.get(String(f.userId)) ?? "?"}: ${f.tasksCompleted} tasks done, ${f.shoppingBought} shopping runs, ${f.expensesPaid} expenses paid`
    )
    .join("\n");

  const systemPrompt = `You are a smart, friendly personal assistant for ${suiteName}, a shared apartment managed with SuiteEase.
The current user is ${currentUserName}.

Today's date: ${today.toLocaleDateString()}

=== SUITE MEMBERS ===
${Array.from(nameMap.values()).join(", ")}

=== CURRENT BALANCES ===
${balanceLines || "  No balance data yet."}

=== SUGGESTED SETTLE-UPS ===
${settleUpLines || "  Everyone is settled up!"}

=== RECENT EXPENSES (last 20) ===
${expenseLines || "  No expenses yet."}

=== ALL TASKS ===
${taskLines || "  No tasks yet."}

=== SETTLEMENT HISTORY ===
${settlementLines || "  No settlements recorded yet."}

=== BULLETIN BOARD NOTES ===
${bulletinLines || "  No notes on the bulletin board."}

=== FAIRNESS SUMMARY ===
${fairnessLines || "  No data yet."}

Answer the user's questions about the suite. Be friendly, concise, and specific — use real names and real numbers from the data above.
You can identify spending habits, remind about tasks, suggest who to settle with, notice patterns (who pays most, whose tasks are overdue, etc.).
Do not make up data that isn't in the context above.`;

  const response = await fetch("https://api.lava.so/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LAVA_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-10),
        { role: "user", content: message },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "AI request failed." }, { status: 502 });
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const reply = data.choices?.[0]?.message?.content?.trim() ?? "Sorry, I couldn't generate a response.";

  return NextResponse.json({ reply });
}
