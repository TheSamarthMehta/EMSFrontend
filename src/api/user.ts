import { api } from "@/api/client";
import type { PublicUser } from "@/types/user";

export async function patchMe(body: {
  name?: string;
  currency?: string;
  timezone?: string;
  language?: string;
  avatar?: string;
  isProfileComplete?: true;
}): Promise<PublicUser> {
  const { data } = await api.patch<PublicUser>("/auth/me", body);
  return data;
}
