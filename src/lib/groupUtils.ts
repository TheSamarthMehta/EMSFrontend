import type { GroupMember, GroupMemberUser } from "@/types/group";

export function memberUserId(m: GroupMember): string {
  const u = m.userId;
  if (typeof u === "string") return u;
  return u._id;
}

export function memberDisplayName(m: GroupMember): string {
  const u = m.userId;
  if (typeof u === "string") return "Member";
  return u.displayName || u.email || "Member";
}

export function memberEmail(m: GroupMember): string | null {
  const u = m.userId;
  if (typeof u === "string") return null;
  return u.email || null;
}

export function isPopulatedUser(u: string | GroupMemberUser): u is GroupMemberUser {
  return typeof u === "object" && u !== null && "_id" in u;
}
