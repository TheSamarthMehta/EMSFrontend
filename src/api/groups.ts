import { api } from "@/api/client";
import type {
  Group,
  GroupActivityResponse,
  GroupAnalytics,
  GroupBalancesResponse,
  GroupExpense,
  GroupExpensesResponse,
  GroupInvite,
  GroupListResponse,
  GroupSplitType,
} from "@/types/group";

export async function getGroups(params?: {
  q?: string;
  status?: "all" | "active" | "inactive" | "archived";
  sortBy?: "recent" | "spent" | "members" | "name";
  limit?: number;
  cursor?: string | null;
}): Promise<GroupListResponse> {
  const { data } = await api.get<GroupListResponse>("/social/groups", { params });
  return data;
}

export async function getGroup(groupId: string): Promise<Group> {
  const { data } = await api.get<Group>(`/social/groups/${groupId}`);
  return data;
}

export async function postGroup(body: {
  name: string;
  description?: string;
  avatarUrl?: string;
  currency?: string;
}): Promise<Group> {
  const { data } = await api.post<Group>("/social/groups", body);
  return data;
}

export async function patchGroup(
  groupId: string,
  body: Partial<{
    name: string;
    description: string;
    avatarUrl: string;
    currency: string;
    status: "active" | "inactive" | "archived";
  }>
): Promise<Group> {
  const { data } = await api.patch<Group>(`/social/groups/${groupId}`, body);
  return data;
}

export async function deleteGroup(
  groupId: string
): Promise<{ ok: boolean; deleted?: boolean; message?: string }> {
  const { data } = await api.delete<{ ok: boolean; deleted?: boolean; message?: string }>(
    `/social/groups/${groupId}`
  );
  return data;
}

export async function postGroupMember(groupId: string, friendUserId: string): Promise<Group> {
  const { data } = await api.post<Group>(`/social/groups/${groupId}/members`, { friendUserId });
  return data;
}

export async function patchGroupMemberRole(
  groupId: string,
  memberId: string,
  role: "admin" | "member"
): Promise<{ ok: boolean }> {
  const { data } = await api.patch<{ ok: boolean }>(`/social/groups/${groupId}/members/${memberId}/role`, {
    role,
  });
  return data;
}

export async function deleteGroupMember(groupId: string, memberId: string): Promise<{ ok: boolean }> {
  const { data } = await api.delete<{ ok: boolean }>(`/social/groups/${groupId}/members/${memberId}`);
  return data;
}

export async function postGroupOwnershipTransfer(
  groupId: string,
  newOwnerUserId: string
): Promise<{ ok: boolean }> {
  const { data } = await api.post<{ ok: boolean }>(`/social/groups/${groupId}/ownership-transfer`, {
    newOwnerUserId,
  });
  return data;
}

export async function deleteLeaveGroup(groupId: string): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/social/groups/${groupId}/members/me`);
  return data;
}

export interface GroupInvitePreview {
  status: string;
  usable: boolean;
  expired: boolean;
  groupName: string;
  inviteeEmail: string;
}

export async function getGroupInvitePreview(token: string): Promise<GroupInvitePreview> {
  const { data } = await api.get<GroupInvitePreview>(`/social/group-invites/${token}/preview`);
  return data;
}

export interface MyPendingGroupInviteRow {
  _id: string;
  token: string;
  groupId: string;
  groupName: string;
  inviterId: unknown;
  inviteeEmail: string;
  expiresAt: string;
  createdAt: string;
}

export async function getMyPendingGroupInvites(): Promise<MyPendingGroupInviteRow[]> {
  const { data } = await api.get<{ invites: MyPendingGroupInviteRow[] }>("/social/group-invites/me/pending");
  return data.invites;
}

export async function postGroupInvite(
  groupId: string,
  body: { inviteeEmail?: string; inviteeUsername?: string }
): Promise<GroupInvite & { emailDelivered?: boolean }> {
  const { data } = await api.post<GroupInvite & { emailDelivered?: boolean }>(
    `/social/groups/${groupId}/invites`,
    body
  );
  return data;
}

export async function postResendGroupInvite(
  groupId: string,
  inviteId: string
): Promise<GroupInvite & { emailDelivered?: boolean }> {
  const { data } = await api.post<GroupInvite & { emailDelivered?: boolean }>(
    `/social/groups/${groupId}/invites/${inviteId}/resend`
  );
  return data;
}

export async function getGroupInvites(groupId: string): Promise<{ invites: GroupInvite[] }> {
  const { data } = await api.get<{ invites: GroupInvite[] }>(`/social/groups/${groupId}/invites`);
  return data;
}

export async function postAcceptGroupInvite(token: string): Promise<{ ok: boolean; groupId?: string }> {
  const { data } = await api.post<{ ok: boolean; groupId?: string }>(`/social/groups/invites/${token}/accept`);
  return data;
}

export async function getGroupExpenses(
  groupId: string,
  params?: {
    cursor?: string | null;
    limit?: number;
    category?: string;
    paidBy?: string;
    from?: string;
    to?: string;
  }
): Promise<GroupExpensesResponse> {
  const { data } = await api.get<GroupExpensesResponse>(`/social/groups/${groupId}/expenses`, { params });
  return data;
}

export async function postGroupExpense(body: {
  title: string;
  amount: number;
  category: string;
  notes: string;
  billImageUrl?: string;
  date: string;
  groupId: string;
  paidBy: string;
  splitType: GroupSplitType;
  splitParticipants: string[];
  splits: Array<{ userId: string; amount?: number; percent?: number }>;
}): Promise<GroupExpense> {
  const { groupId, ...payload } = body;
  const { data } = await api.post<GroupExpense>(`/social/groups/${groupId}/expenses`, payload);
  return data;
}

export async function postGroupSplitSuggestion(
  groupId: string,
  body: { participantIds: string[]; category?: string }
): Promise<{ splitType: GroupSplitType; splits: Array<{ userId: string; amount?: number; percent?: number }> }> {
  const { data } = await api.post<{
    splitType: GroupSplitType;
    splits: Array<{ userId: string; amount?: number; percent?: number }>;
  }>(`/social/groups/${groupId}/split-suggestion`, body);
  return data;
}

export async function getGroupBalances(groupId: string): Promise<GroupBalancesResponse> {
  const { data } = await api.get<GroupBalancesResponse>(`/social/groups/${groupId}/balances`);
  return data;
}

export async function postGroupSettlement(
  groupId: string,
  body: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    method: "cash" | "upi" | "bank" | "other";
    reference?: string;
    notes?: string;
    settledAt?: string;
  }
): Promise<{ _id: string }> {
  const { data } = await api.post<{ _id: string }>(`/social/groups/${groupId}/settlements`, body);
  return data;
}

export async function getGroupActivity(
  groupId: string,
  params?: {
    cursor?: string | null;
    limit?: number;
    type?: string;
    userId?: string;
    from?: string;
    to?: string;
  }
): Promise<GroupActivityResponse> {
  const { data } = await api.get<GroupActivityResponse>(`/social/groups/${groupId}/activity`, { params });
  return data;
}

export async function getGroupAnalytics(groupId: string): Promise<GroupAnalytics> {
  const { data } = await api.get<GroupAnalytics>(`/social/groups/${groupId}/analytics`);
  return data;
}
