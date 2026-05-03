import { api } from "@/api/client";
import type { DashboardResponse } from "@/types/dashboard";

export async function getDashboard(params?: {
  preset?: string;
  timelineDays?: number;
  chartFrom?: string;
  chartTo?: string;
}): Promise<DashboardResponse> {
  const { data } = await api.get<DashboardResponse>("/dashboard", { params });
  return data;
}
