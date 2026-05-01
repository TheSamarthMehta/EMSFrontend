import { api } from "@/api/client";
import type { FriendEntry, IncomingRequest } from "@/types/group";

export async function getFriends(): Promise<{ friends: FriendEntry[] }> {
  const { data } = await api.get<{ friends: FriendEntry[] }>("/social/friends");
  return data;
}

export async function getIncomingRequests(): Promise<{ incoming: IncomingRequest[] }> {
  const { data } = await api.get<{ incoming: IncomingRequest[] }>(
    "/social/friends/requests/incoming"
  );
  return data;
}

export async function postFriendRequest(targetEmail: string): Promise<unknown> {
  const { data } = await api.post("/social/friends/request", { targetEmail });
  return data;
}

export async function postAcceptRequest(friendshipId: string): Promise<void> {
  await api.post(`/social/friends/requests/${friendshipId}/accept`);
}

export async function postRejectRequest(friendshipId: string): Promise<void> {
  await api.post(`/social/friends/requests/${friendshipId}/reject`);
}
