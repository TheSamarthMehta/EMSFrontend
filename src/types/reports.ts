export interface ReportsSummaryResponse {
  type: string;
  expense: { count: number; total: number };
  income: { count: number; total: number };
  net: number;
}
