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
  assigneeId: string;
  dueDate: string;
  status: "pending" | "done" | "overdue";
  recurrence: "none" | "daily" | "weekly";
  completedAt?: string | null;
}

export interface ShoppingItem {
  _id: string;
  suiteId: string;
  name: string;
  quantity: number;
  requestedBy: string;
  category: "groceries" | "cleaning" | "household";
  status: "needed" | "bought";
  boughtBy?: string | null;
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
  shoppingBought: number;
  expensesPaid: number;
}

export interface DashboardData {
  dueToday: Task[];
  overdue: Task[];
  shoppingNeeded: ShoppingItem[];
  recentExpenses: Expense[];
  balances: Balance[];
  settleUps: { from: string; fromId?: string; to: string; toId?: string; amount: number }[];
  fairness: FairnessRow[];
}
