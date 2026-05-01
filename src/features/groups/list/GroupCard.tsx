import { Link } from "react-router-dom";
import { Archive, CircleDot, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/formatCurrency";
import type { Group } from "@/types/group";
import { cn } from "@/lib/utils";

function statusIcon(status: Group["status"]) {
  if (status === "archived") return <Archive className="size-3.5" />;
  return <CircleDot className="size-3.5" />;
}

type GroupCardProps = {
  group: Group;
  /** Default vertical card; list = full-width row for dense layouts */
  layout?: "grid" | "list";
};

export function GroupCard({ group, layout = "grid" }: GroupCardProps) {
  const total = group.totalSpendCache || 0;
  const currency = group.currency || "INR";
  const activeMembers = group.members.filter((member) => member.isActive !== false);
  const description = group.description?.trim() ? group.description : "No description";

  const statusBadge = (
    <Badge variant={group.status === "archived" ? "secondary" : "default"} className="gap-1 shrink-0">
      {statusIcon(group.status)}
      {(group.status || "active").toUpperCase()}
    </Badge>
  );

  if (layout === "list") {
    return (
      <Link to={`/groups/${group._id}`} className="block">
        <Card className="rounded-xl border-white/10 bg-[#161b22] transition-colors hover:border-teal-400/40">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar size="lg" className="shrink-0 border border-white/10">
                {group.avatarUrl ? <AvatarImage src={group.avatarUrl} alt={group.name} /> : null}
                <AvatarFallback className="bg-[#1f2937]">{group.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base text-white">{group.name}</CardTitle>
                <CardDescription className="line-clamp-2 text-gray-400 sm:line-clamp-1">{description}</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:shrink-0 sm:justify-end">
              {statusBadge}
              <div>
                <p className="text-xs text-gray-500">Total spend</p>
                <p className="text-lg font-semibold tabular-nums text-white">{formatCurrency(total, currency)}</p>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-400">
                <Users className="size-4 shrink-0" />
                <span>
                  {activeMembers.length} member{activeMembers.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link to={`/groups/${group._id}`} className="block h-full">
      <Card
        className={cn(
          "h-full rounded-xl border-white/10 bg-[#161b22] transition-colors hover:border-teal-400/40"
        )}
      >
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar size="lg" className="border border-white/10">
                {group.avatarUrl ? <AvatarImage src={group.avatarUrl} alt={group.name} /> : null}
                <AvatarFallback className="bg-[#1f2937]">{group.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base text-white">{group.name}</CardTitle>
                <CardDescription className="line-clamp-1 text-gray-400">{description}</CardDescription>
              </div>
            </div>
            {statusBadge}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <p className="text-gray-500">Total spend</p>
            <p className="text-lg font-semibold text-white">{formatCurrency(total, currency)}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Users className="size-4" />
            {activeMembers.length} member{activeMembers.length === 1 ? "" : "s"}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
