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

export interface Expense {
  _id: string;
  suiteId: string;
  title: string;
  amount: number;
  paidBy: string;
  participants: string[];
  splitType: "equal";
  createdAt: string;
}

export interface Balance {
  userId: string;
  name: string;
  net: number;
  paid: number;
  owed: number;
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
  settleUps: { from: string; to: string; amount: number }[];
  fairness: FairnessRow[];
}
