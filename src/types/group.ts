export interface GroupMemberUser {
  _id: string;
  email: string;
  displayName: string;
  avatar?: string;
}

export interface GroupMember {
  userId: string | GroupMemberUser;
  role: "admin" | "member";
  permissions?: string[];
  joinedAt: string;
  isActive?: boolean;
  removedAt?: string | null;
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  createdBy: string;
  ownerId?: string;
  avatarUrl?: string;
  currency?: string;
  status?: "active" | "inactive" | "archived";
  lastActivityAt?: string;
  totalSpendCache?: number;
  members: GroupMember[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupListResponse {
  groups: Group[];
  nextCursor: string | null;
}

export interface GroupSplitItem {
  userId: string | GroupMemberUser;
  amount: number;
  percent: number;
}

export type GroupSplitType = "equal" | "exact" | "percentage";

export interface GroupExpense {
  _id: string;
  groupId: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  notes: string;
  billImageUrl?: string;
  paidBy: string | GroupMemberUser;
  splitType: GroupSplitType;
  splits: GroupSplitItem[];
  participantIds: string[];
  date: string;
  createdBy: string | GroupMemberUser;
  createdAt: string;
  updatedAt: string;
}

export interface GroupExpensesResponse {
  items: GroupExpense[];
  nextCursor: string | null;
}

export interface LegacyGroupExpenseRow {
  _id: string;
  userId: string | GroupMemberUser;
  title: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  scope: string;
  groupId: string;
}

export interface FriendEntry {
  friendshipId: string;
  user: { id: string; email: string; displayName: string };
  since: string;
}

export interface IncomingRequest {
  friendshipId: string;
  from: { id: string; email: string; displayName: string };
  createdAt: string;
}

export interface GroupInvite {
  _id: string;
  groupId: string;
  token?: string;
  inviterId: string | GroupMemberUser;
  inviteeEmail: string;
  status: "pending" | "accepted" | "rejected" | "expired" | "cancelled";
  expiresAt: string;
  createdAt: string;
}

export interface GroupBalanceRow {
  userId: string;
  net: number;
}

export interface GroupTransfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export interface GroupBalancesResponse {
  balances: GroupBalanceRow[];
  simplified: GroupTransfer[];
}

export interface GroupActivity {
  _id: string;
  groupId: string;
  actorId: string | GroupMemberUser;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface GroupActivityResponse {
  items: GroupActivity[];
  nextCursor: string | null;
}

export interface GroupAnalytics {
  totalSpent: number;
  expenseCount: number;
  categoryBreakdown: Array<{ category: string; amount: number }>;
  monthlyTrend: Array<{ month: string; amount: number }>;
  topSpenders: Array<{ userId: string; amount: number }>;
}
