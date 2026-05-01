import { ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatCurrency";
import type { GroupBalancesResponse, Group } from "@/types/group";
import { memberDisplayName, memberUserId } from "@/lib/groupUtils";

function memberName(group: Group, userId: string): string {
  const row = group.members.find((member) => memberUserId(member) === userId);
  return row ? memberDisplayName(row) : "Unknown";
}

export function GroupBalancesTab({
  balances,
  group,
}: {
  balances: GroupBalancesResponse;
  group: Group;
}) {
  const currency = group.currency || "INR";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">Net balances</CardTitle>
          <CardDescription>Positive means should receive, negative means owes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {balances.balances.map((row) => (
            <div
              key={row.userId}
              className="border-border flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <span>{memberName(group, row.userId)}</span>
              <span className={row.net < 0 ? "text-destructive font-medium" : "text-emerald-500 font-medium"}>
                {formatCurrency(row.net, currency)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">Who owes whom</CardTitle>
          <CardDescription>Simplified settlement path.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {balances.simplified.length === 0 ? (
            <p className="text-muted-foreground text-sm">All settled up.</p>
          ) : (
            balances.simplified.map((row, index) => (
              <div
                key={`${row.fromUserId}-${row.toUserId}-${index}`}
                className="border-border flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span>{memberName(group, row.fromUserId)}</span>
                <ArrowRightLeft className="text-muted-foreground size-4" />
                <span>{memberName(group, row.toUserId)}</span>
                <span className="font-semibold">{formatCurrency(row.amount, currency)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
