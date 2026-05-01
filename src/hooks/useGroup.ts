import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  getGroup,
  getGroupActivity,
  getGroupAnalytics,
  getGroupBalances,
  getGroupExpenses,
  getGroupInvites,
  getMyPendingGroupInvites,
} from "@/api/groups";
import { useBackendQueryEnabled } from "@/hooks/useBackendQueryEnabled";

export function useGroup(groupId: string | undefined) {
  const tokenReady = useBackendQueryEnabled();
  return useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroup(groupId!),
    enabled: Boolean(groupId) && tokenReady,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
}

export function useGroupExpenses(groupId: string | undefined) {
  const tokenReady = useBackendQueryEnabled();
  return useQuery({
    queryKey: ["group-expenses", groupId],
    queryFn: () => getGroupExpenses(groupId!),
    enabled: Boolean(groupId) && tokenReady,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
}

export function useGroupBalances(groupId: string | undefined) {
  const tokenReady = useBackendQueryEnabled();
  return useQuery({
    queryKey: ["group-balances", groupId],
    queryFn: () => getGroupBalances(groupId!),
    enabled: Boolean(groupId) && tokenReady,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
}

export function useGroupActivity(groupId: string | undefined) {
  const tokenReady = useBackendQueryEnabled();
  return useQuery({
    queryKey: ["group-activity", groupId],
    queryFn: () => getGroupActivity(groupId!),
    enabled: Boolean(groupId) && tokenReady,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
}

export function useGroupAnalytics(groupId: string | undefined) {
  const tokenReady = useBackendQueryEnabled();
  return useQuery({
    queryKey: ["group-analytics", groupId],
    queryFn: () => getGroupAnalytics(groupId!),
    enabled: Boolean(groupId) && tokenReady,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
}

export function useGroupInvites(groupId: string | undefined) {
  const tokenReady = useBackendQueryEnabled();
  return useQuery({
    queryKey: ["group-invites", groupId],
    queryFn: () => getGroupInvites(groupId!),
    enabled: Boolean(groupId) && tokenReady,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
}

export function useMyPendingGroupInvites() {
  const tokenReady = useBackendQueryEnabled();
  return useQuery({
    queryKey: ["my-pending-group-invites"],
    queryFn: () => getMyPendingGroupInvites(),
    enabled: tokenReady,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
}
