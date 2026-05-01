import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  getAiInsights,
  getAiStatus,
  postAiCategorize,
  postAiChat,
  postAiParseExpense,
} from "@/api/ai";
import { useBackendQueryEnabled } from "@/hooks/useBackendQueryEnabled";
import type {
  AiCategorizeRequest,
  AiCategorizeResponse,
  AiChatRequest,
  AiChatResponse,
  AiInsightsResponse,
  AiParseExpenseRequest,
  AiParseExpenseResponse,
  AiStatusResponse,
} from "@/types/ai";

export function useAiStatus() {
  const tokenReady = useBackendQueryEnabled();
  return useQuery<AiStatusResponse>({
    queryKey: ["ai", "status"],
    queryFn: getAiStatus,
    enabled: tokenReady,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
}

export function useAiInsights(options?: { lookbackDays?: number }) {
  const tokenReady = useBackendQueryEnabled();
  const lookbackDays = options?.lookbackDays ?? 90;
  return useQuery<AiInsightsResponse>({
    queryKey: ["ai", "insights", lookbackDays],
    queryFn: () => getAiInsights({ lookbackDays }),
    enabled: tokenReady,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 401) return false;
      if (isAxiosError(error) && error.response?.status === 429) return false;
      return failureCount < 1;
    },
  });
}

export function useAiChat() {
  return useMutation<AiChatResponse, unknown, AiChatRequest>({
    mutationFn: postAiChat,
  });
}

export function useAiCategorize() {
  return useMutation<AiCategorizeResponse, unknown, AiCategorizeRequest>({
    mutationFn: postAiCategorize,
  });
}

export function useAiParseExpense() {
  return useMutation<AiParseExpenseResponse, unknown, AiParseExpenseRequest>({
    mutationFn: postAiParseExpense,
  });
}
