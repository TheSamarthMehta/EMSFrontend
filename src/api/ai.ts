import { api } from "@/api/client";
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

export async function getAiStatus(): Promise<AiStatusResponse> {
  const { data } = await api.get<AiStatusResponse>("/ai/status");
  return data;
}

export async function getAiInsights(params?: { lookbackDays?: number }): Promise<AiInsightsResponse> {
  const { data } = await api.get<AiInsightsResponse>("/ai/insights", {
    params: { lookbackDays: params?.lookbackDays ?? 90 },
  });
  return data;
}

export async function postAiChat(payload: AiChatRequest): Promise<AiChatResponse> {
  const { data } = await api.post<AiChatResponse>("/ai/chat", payload);
  return data;
}

export async function postAiCategorize(payload: AiCategorizeRequest): Promise<AiCategorizeResponse> {
  const { data } = await api.post<AiCategorizeResponse>("/ai/categorize", payload);
  return data;
}

export async function postAiParseExpense(
  payload: AiParseExpenseRequest
): Promise<AiParseExpenseResponse> {
  const { data } = await api.post<AiParseExpenseResponse>("/ai/parse-expense", payload);
  return data;
}
