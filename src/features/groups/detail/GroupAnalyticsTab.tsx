import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/formatCurrency";
import type { GroupAnalytics } from "@/types/group";

export function GroupAnalyticsTab({
  analytics,
  currency,
}: {
  analytics: GroupAnalytics;
  currency: string;
}) {
  const categoryConfig = {
    amount: { label: "Amount", color: "var(--chart-1)" },
  };
  const trendConfig = {
    amount: { label: "Monthly spend", color: "var(--chart-2)" },
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total spend</CardDescription>
            <CardTitle>{formatCurrency(analytics.totalSpent, currency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total expenses</CardDescription>
            <CardTitle>{analytics.expenseCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top spender amount</CardDescription>
            <CardTitle>{formatCurrency(analytics.topSpenders[0]?.amount || 0, currency)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">Category breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={categoryConfig}>
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie data={analytics.categoryBreakdown} dataKey="amount" nameKey="category" />
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">Monthly trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig}>
            <LineChart data={analytics.monthlyTrend}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="amount" stroke="var(--color-amount)" strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">Top spenders</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig}>
            <BarChart data={analytics.topSpenders}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="userId" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="amount" fill="var(--color-amount)" radius={6} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
