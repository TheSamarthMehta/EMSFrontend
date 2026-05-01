import { format } from "date-fns";
import { Crown, Trash2, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { memberDisplayName, memberEmail, memberUserId } from "@/lib/groupUtils";
import type { Group } from "@/types/group";
import { cn } from "@/lib/utils";

type GroupOverviewTabProps = {
  group: Group;
  isAdmin: boolean;
  currentUserId?: string;
  onMemberRole?: (memberId: string, role: "admin" | "member") => void;
  onMemberTransfer?: (memberId: string) => void;
  onMemberRemove?: (memberId: string) => void;
  rolePending?: boolean;
  transferPending?: boolean;
  removePending?: boolean;
};

export function GroupOverviewTab({
  group,
  isAdmin,
  currentUserId,
  onMemberRole,
  onMemberTransfer,
  onMemberRemove,
  rolePending,
  transferPending,
  removePending,
}: GroupOverviewTabProps) {
  const members = group.members.filter((member) => member.isActive !== false);

  return (
    <Card className="rounded-xl border-white/10 bg-[#161b22]">
      <CardHeader>
        <CardTitle className="text-lg text-white">Members</CardTitle>
        <CardDescription className="text-gray-400">
          Roles, contact info, and who joined this group.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {members.map((member) => {
          const id = memberUserId(member);
          const name = memberDisplayName(member);
          const email = memberEmail(member);
          const isSelf = currentUserId != null && id === currentUserId;
          const isAdminMember = member.role === "admin";

          return (
            <div
              key={id}
              className={cn(
                "group relative flex flex-col gap-3 rounded-xl border border-white/10 bg-[#0d1117]/80 p-4 transition-colors duration-200 hover:border-white/15",
                isAdminMember && "border-l-2 border-l-teal-400/90"
              )}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <Avatar
                  className={cn(
                    "size-11 shrink-0 border-2",
                    isAdminMember ? "border-teal-400/50 bg-teal-500/15" : "border-zinc-600 bg-zinc-700/40"
                  )}
                >
                  {typeof member.userId !== "string" && member.userId.avatar ? (
                    <AvatarImage src={member.userId.avatar} alt={name} />
                  ) : null}
                  <AvatarFallback
                    className={cn(
                      "text-sm font-semibold",
                      isAdminMember ? "bg-teal-500/20 text-teal-200" : "bg-zinc-700 text-zinc-200"
                    )}
                  >
                    {name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-white">{name}</span>
                    <Badge
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        isAdminMember
                          ? "border-teal-500/35 bg-teal-500/15 text-teal-300"
                          : "border-zinc-600/50 bg-zinc-700/40 text-zinc-300"
                      )}
                    >
                      {isAdminMember ? "Admin" : "Member"}
                    </Badge>
                  </div>
                  {email ? <p className="mt-0.5 truncate text-xs text-gray-400">{email}</p> : null}
                  <p className="mt-1 text-xs text-gray-500">
                    Joined {format(new Date(member.joinedAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>

              {isAdmin && onMemberRole && onMemberTransfer && onMemberRemove ? (
                <div
                  className={cn(
                    "flex flex-wrap items-center justify-end gap-1 border-t border-white/5 pt-3 transition-opacity duration-200",
                    "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  )}
                >
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 rounded-lg px-2 text-gray-300 hover:bg-white/5 hover:text-white"
                    disabled={isSelf || rolePending}
                    onClick={() =>
                      onMemberRole(id, member.role === "admin" ? "member" : "admin")
                    }
                  >
                    <UserCog className="size-3.5 shrink-0" />
                    <span className="hidden sm:inline">
                      {member.role === "admin" ? "Make member" : "Make admin"}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 rounded-lg px-2 text-gray-300 hover:bg-white/5 hover:text-white"
                    disabled={isSelf || transferPending}
                    onClick={() => onMemberTransfer(id)}
                  >
                    <Crown className="size-3.5 shrink-0" />
                    <span className="hidden sm:inline">Transfer</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 rounded-lg px-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    disabled={isSelf || removePending}
                    onClick={() => onMemberRemove(id)}
                  >
                    <Trash2 className="size-3.5 shrink-0" />
                    <span className="hidden sm:inline">Remove</span>
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
