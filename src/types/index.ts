export interface Member {
  _id: string;
  name: string;
  suiteId: string;
  email?: string;
}

export interface Suite {
  _id: string;
  name: string;
  memberIds: string[];
  inviteCode?: string;
  members?: Member[];
}

export interface Task {
  _id: string;
  suiteId: string;
  title: string;
  notes?: string | null;
  assigneeId: string;
  dueDate: string;
  status: "pending" | "done" | "overdue";
  recurrence: "none" | "daily" | "weekly";
  googleTaskId?: string | null;
  googleTaskSyncedAt?: string | null;
  completedAt?: string | null;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  due?: string | null;
  notes?: string | null;
  webViewLink?: string | null;
}

export interface BulletinNote {
  _id: string;
  suiteId: string;
  color: "red" | "green" | "blue" | "yellow";
  text: string;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  x: number;
  y: number;
  rotationDeg: number;
  createdAt?: string;
  updatedAt?: string;
}

export type SplitMethod = "equal" | "exact" | "percentage" | "itemized";

export interface ExpenseSplit {
  participantId: string;
  owedAmount: number;
  percentage?: number;
}

export interface ExpenseItem {
  name: string;
  amount: number;
  assignedParticipants: string[];
}

export interface Expense {
  _id: string;
  suiteId: string;
  title: string;
  amount: number;
  paidBy: string;
  date?: string;
  participants: string[];
  splitMethod: SplitMethod;
  splits: ExpenseSplit[];
  items: ExpenseItem[];
  createdAt: string;
}

export interface SettlementAllocation {
  expenseId: string;
  debtorId: string;
  creditorId: string;
  amount: number;
  allocationRole?: "settled" | "offset" | null;
}

export interface Settlement {
  _id: string;
  suiteId: string;
  payerId: string;
  receiverId: string;
  amount: number;
  date: string;
  note: string;
  status: "confirmed";
  type?: "payment" | "netting";
  allocations: SettlementAllocation[];
  createdAt: string;
}

export interface Balance {
  userId: string;
  name: string;
  paid: number;          // total fronted as expense payer
  owed: number;          // gross from expense splits
  net: number;           // paid - owed (theoretical)
  settledOut: number;    // total paid via recorded settlements
  settledIn: number;     // total received via recorded settlements
  outstanding: number;   // what this person still owes to others (after settlements)
  outstandingNet: number; // outstandingReceivable - outstanding
}

export interface FairnessRow {
  userId: string;
  name: string;
  tasksCompleted: number;
  expensesPaid: number;
}

export interface DashboardData {
  dueToday: Task[];
  overdue: Task[];
  recentExpenses: Expense[];
  balances: Balance[];
  settleUps: { from: string; fromId?: string; to: string; toId?: string; amount: number }[];
  fairness: FairnessRow[];
}
