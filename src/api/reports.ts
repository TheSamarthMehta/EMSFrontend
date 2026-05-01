import { api } from "@/api/client";
import type { ReportsSummaryResponse } from "@/types/reports";

export async function getReportsSummary(params: {
  type?: string;
  from?: string;
  to?: string;
  category?: string;
  q?: string;
}): Promise<ReportsSummaryResponse> {
  const { data } = await api.get<ReportsSummaryResponse>("/reports/summary", { params });
  return data;
}

export async function downloadTransactionsCsv(params: {
  type?: string;
  from?: string;
  to?: string;
  category?: string;
  q?: string;
}): Promise<void> {
  const res = await api.get<Blob>("/export/transactions", {
    params,
    responseType: "blob",
  });
  const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}
