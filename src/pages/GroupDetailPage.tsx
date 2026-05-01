import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  ArrowLeft,
  BarChart2,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Mail,
  MoreHorizontal,
  Receipt,
  Scale,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  deleteGroup,
  deleteGroupMember,
  deleteLeaveGroup,
  patchGroup,
  patchGroupMemberRole,
  postGroupExpense,
  postGroupInvite,
  postGroupMember,
  postGroupOwnershipTransfer,
  postGroupSettlement,
  postResendGroupInvite,
} from "@/api/groups";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { GroupActivityTab } from "@/features/groups/detail/GroupActivityTab";
import { GroupAnalyticsTab } from "@/features/groups/detail/GroupAnalyticsTab";
import { GroupBalancesTab } from "@/features/groups/detail/GroupBalancesTab";
import { GroupExpensesTab } from "@/features/groups/detail/GroupExpensesTab";
import { GroupOverviewTab } from "@/features/groups/detail/GroupOverviewTab";
import {
  addExpenseSchema,
  inviteMemberSchema,
  settleUpSchema,
  type AddExpenseFormValues,
  type InviteMemberFormValues,
  type SettleUpFormValues,
} from "@/features/groups/schemas/groupForms";
import { useGroupRealtime } from "@/hooks/useGroupRealtime";
import { useFriends } from "@/hooks/useFriends";
import {
  useGroup,
  useGroupActivity,
  useGroupAnalytics,
  useGroupBalances,
  useGroupExpenses,
  useGroupInvites,
} from "@/hooks/useGroup";
import { useSession } from "@/hooks/useSession";
import type { GroupInvite, GroupMemberUser } from "@/types/group";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { memberDisplayName, memberUserId } from "@/lib/groupUtils";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function isInviteResendable(inv: GroupInvite): boolean {
  if (inv.status === "expired") return true;
  if (inv.status !== "pending") return false;
  return new Date(inv.expiresAt) < new Date();
}

function inviterLabel(inv: GroupInvite): string {
  const u = inv.inviterId;
  if (typeof u === "object" && u !== null && "displayName" in u) {
    const m = u as GroupMemberUser;
    return m.displayName || m.email || "Member";
  }
  return "Member";
}

const TAB_IDS = ["overview", "expenses", "balances", "activity", "analytics"] as const;
type TabId = (typeof TAB_IDS)[number];

const TAB_CONFIG: Array<{ id: TabId; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "balances", label: "Balances", icon: Scale },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
];

function InviteStatusBadge({ status }: { status: GroupInvite["status"] }) {
  const label = status === "rejected" ? "declined" : status;
  const pill =
    status === "accepted"
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
      : status === "pending"
        ? "border-amber-500/30 bg-amber-500/15 text-amber-400"
        : status === "expired"
          ? "border-red-500/30 bg-red-500/15 text-red-400"
          : "border-white/15 bg-white/10 text-gray-400";
  const dot =
    status === "accepted"
      ? "text-emerald-400"
      : status === "pending"
        ? "text-amber-400"
        : status === "expired"
          ? "text-red-400"
          : "text-gray-400";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        pill
      )}
    >
      <span className={cn("text-[10px] leading-none", dot)} aria-hidden>
        ●
      </span>
      {label}
    </span>
  );
}

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const { data: me } = useSession();
  const { data: group, isPending: gPending, isError: gErr, error: gError } = useGroup(groupId);
  const { data: expensesPayload, isPending: ePending } = useGroupExpenses(groupId);
  const { data: balancesPayload } = useGroupBalances(groupId);
  const { data: activityPayload } = useGroupActivity(groupId);
  const { data: analyticsPayload } = useGroupAnalytics(groupId);
  const { data: invitesPayload } = useGroupInvites(groupId);
  const { data: friends, isPending: friendsPending } = useFriends();
  useGroupRealtime(groupId);

  const rawTab = searchParams.get("tab");
  const activeTab: TabId =
    rawTab && TAB_IDS.includes(rawTab as TabId) ? (rawTab as TabId) : "overview";

  const setTab = (id: TabId) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", id);
        return next;
      },
      { replace: true }
    );
  };

  const [addOpen, setAddOpen] = useState(false);
  const [expOpen, setExpOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [friendToAdd, setFriendToAdd] = useState("");
  const [friendSearch, setFriendSearch] = useState("");

  const currency = me?.currency ?? "INR";
  const expenses = expensesPayload?.items || [];
  const balances = balancesPayload || { balances: [], simplified: [] };
  const activity = activityPayload?.items || [];
  const analytics = analyticsPayload || {
    totalSpent: 0,
    expenseCount: 0,
    categoryBreakdown: [],
    monthlyTrend: [],
    topSpenders: [],
  };
  const sentInvites = invitesPayload?.invites ?? [];

  const expenseForm = useForm<AddExpenseFormValues>({
    resolver: zodResolver(addExpenseSchema),
    defaultValues: {
      title: "",
      amount: 0,
      category: EXPENSE_CATEGORIES[0]?.id || "other",
      notes: "",
      billImageUrl: "",
      date: format(new Date(), "yyyy-MM-dd"),
      paidBy: "",
      splitType: "equal",
    },
  });

  const inviteForm = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { inviteeEmail: "", inviteeUsername: "" },
  });

  const settleForm = useForm<SettleUpFormValues>({
    resolver: zodResolver(settleUpSchema),
    defaultValues: { fromUserId: "", toUserId: "", amount: 0, method: "cash", reference: "", notes: "" },
  });

  const isAdmin = useMemo(() => {
    if (!group || !me) return false;
    return group.members.some(
      (m) => memberUserId(m) === me.id && m.role === "admin"
    );
  }, [group, me]);
  const isCreator = useMemo(() => {
    if (!group || !me) return false;
    return group.createdBy === me.id || group.ownerId === me.id;
  }, [group, me]);

  const friendOptions = useMemo(() => {
    if (!group || !friends) return [];
    const memberIds = new Set(group.members.map((m) => String(memberUserId(m))));
    return friends.filter((f) => !memberIds.has(String(f.user.id)));
  }, [group, friends]);

  const filteredFriendOptions = useMemo(() => {
    const q = friendSearch.trim().toLowerCase();
    if (!q) return friendOptions;
    return friendOptions.filter(
      (f) =>
        f.user.displayName.toLowerCase().includes(q) || f.user.email.toLowerCase().includes(q)
    );
  }, [friendOptions, friendSearch]);

  const selectedFriend = useMemo(
    () => friendOptions.find((f) => String(f.user.id) === String(friendToAdd)),
    [friendOptions, friendToAdd]
  );

  const activeMembers = useMemo(
    () => (group ? group.members.filter((member) => member.isActive !== false) : []),
    [group]
  );

  const leaveMut = useMutation({
    mutationFn: () => deleteLeaveGroup(groupId!),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["groups"] });
      toast.success(data.message);
      navigate("/groups", { replace: true });
    },
    onError: (e: unknown) => {
      toast.error(getApiErrorMessage(e, "Could not leave group"));
    },
  });

  const addMemberMut = useMutation({
    mutationFn: () => postGroupMember(groupId!, friendToAdd),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["group", groupId] });
      toast.success("Member added");
      setAddOpen(false);
      setFriendToAdd("");
      setFriendSearch("");
    },
    onError: (e: unknown) => {
      toast.error(getApiErrorMessage(e, "Could not add member"));
    },
  });

  const inviteMut = useMutation({
    mutationFn: (values: InviteMemberFormValues) =>
      postGroupInvite(groupId!, {
        inviteeEmail: values.inviteeEmail?.trim() || undefined,
        inviteeUsername: values.inviteeUsername?.trim() || undefined,
      }),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["group-invites", groupId] });
      await qc.invalidateQueries({ queryKey: ["my-pending-group-invites"] });
      if (data.emailDelivered === false) {
        toast.success("Invite saved", {
          description: "Email was not delivered. Configure RESEND_API_KEY or SMTP in the API server.",
        });
      } else {
        toast.success("Invite sent");
      }
      inviteForm.reset();
      setInviteOpen(false);
    },
    onError: (e: unknown) => {
      toast.error(getApiErrorMessage(e, "Could not send invite"));
    },
  });

  const resendInviteMut = useMutation({
    mutationFn: (inviteId: string) => postResendGroupInvite(groupId!, inviteId),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["group-invites", groupId] });
      await qc.invalidateQueries({ queryKey: ["my-pending-group-invites"] });
      if (data.emailDelivered === false) {
        toast.message("Invite updated, but email was not delivered.", {
          description: "Check server email configuration.",
        });
      } else {
        toast.success("Invitation email resent");
      }
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Could not resend invite")),
  });

  const roleMut = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: "admin" | "member" }) =>
      patchGroupMemberRole(groupId!, memberId, role),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["group", groupId] });
      toast.success("Member role updated");
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Could not update role")),
  });

  const removeMemberMut = useMutation({
    mutationFn: (memberId: string) => deleteGroupMember(groupId!, memberId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["group", groupId] });
      toast.success("Member removed");
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Could not remove member")),
  });

  const transferOwnershipMut = useMutation({
    mutationFn: (newOwnerUserId: string) => postGroupOwnershipTransfer(groupId!, newOwnerUserId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["group", groupId] });
      toast.success("Ownership transferred");
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Could not transfer ownership")),
  });

  const statusMut = useMutation({
    mutationFn: (status: "active" | "inactive" | "archived") => patchGroup(groupId!, { status }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["group", groupId] });
      await qc.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Group status updated");
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Could not update status")),
  });

  const deleteGroupMut = useMutation({
    mutationFn: () => deleteGroup(groupId!),
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: ["groups"] });
      toast.success(result.deleted ? "Group deleted" : "Group archived");
      navigate("/groups", { replace: true });
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Could not delete group")),
  });

  const addExpMut = useMutation({
    mutationFn: (values: AddExpenseFormValues) =>
      postGroupExpense({
        title: values.title.trim(),
        amount: values.amount,
        category: values.category,
        notes: values.notes?.trim() || "",
        billImageUrl: values.billImageUrl?.trim() || undefined,
        date: new Date(values.date).toISOString(),
        groupId: groupId!,
        paidBy: values.paidBy,
        splitType: values.splitType,
        splitParticipants: activeMembers.map((row) => memberUserId(row)),
        splits: [],
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["group-expenses", groupId] });
      await qc.invalidateQueries({ queryKey: ["group-balances", groupId] });
      await qc.invalidateQueries({ queryKey: ["group-analytics", groupId] });
      toast.success("Expense added");
      setExpOpen(false);
      expenseForm.reset({
        title: "",
        amount: 0,
        category: EXPENSE_CATEGORIES[0]?.id ?? "other",
        notes: "",
        billImageUrl: "",
        date: format(new Date(), "yyyy-MM-dd"),
        paidBy: "",
        splitType: "equal",
      });
    },
    onError: (e: unknown) => {
      toast.error(getApiErrorMessage(e, "Could not add expense"));
    },
  });

  const settleMut = useMutation({
    mutationFn: (values: SettleUpFormValues) =>
      postGroupSettlement(groupId!, {
        fromUserId: values.fromUserId,
        toUserId: values.toUserId,
        amount: values.amount,
        method: values.method,
        reference: values.reference,
        notes: values.notes,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["group-balances", groupId] });
      await qc.invalidateQueries({ queryKey: ["group-activity", groupId] });
      toast.success("Settlement recorded");
      settleForm.reset();
      setSettleOpen(false);
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Could not settle up")),
  });

  if (gPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (gErr || !group) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="gap-2" onClick={() => navigate("/groups")}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <p className="text-destructive text-sm" role="alert">
          {getApiErrorMessage(gError, "Group not found")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <Button
            type="button"
            variant="ghost"
            className="gap-2 -ml-2 h-9 w-fit px-2 text-gray-400 hover:bg-white/5 hover:text-white"
            onClick={() => navigate("/groups")}
          >
            <ArrowLeft className="size-4" />
            All groups
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{group.name}</h1>
            {group.description ? (
              <p className="mt-1 max-w-2xl text-xs text-gray-400">{group.description}</p>
            ) : null}
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:max-w-2xl lg:items-end">
          <div className="flex w-full flex-wrap items-center gap-2 lg:justify-end">
            <Button
              type="button"
              className="h-11 gap-2 rounded-lg px-5 text-base font-semibold"
              onClick={() => setExpOpen(true)}
            >
              <Receipt className="size-5 shrink-0" />
              Add expense
            </Button>

            {isAdmin ? (
              <Button
                type="button"
                variant="ghost"
                className="h-10 gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white transition-all duration-200 hover:border-white/15 hover:bg-white/10"
                onClick={() => setAddOpen(true)}
              >
                <UserPlus className="size-4 shrink-0 text-gray-300" />
                Add member
              </Button>
            ) : null}
            {isAdmin ? (
              <Button
                type="button"
                variant="ghost"
                className="h-10 gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white transition-all duration-200 hover:border-white/15 hover:bg-white/10"
                onClick={() => setInviteOpen(true)}
              >
                <Mail className="size-4 shrink-0 text-gray-300" />
                Invite
              </Button>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              className="h-10 gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white transition-all duration-200 hover:border-white/15 hover:bg-white/10"
              onClick={() => setSettleOpen(true)}
            >
              <CircleDollarSign className="size-4 shrink-0 text-gray-300" />
              Settle up
            </Button>

            {isAdmin ? (
              <div className="inline-flex rounded-full border border-white/10 bg-card p-0.5">
                {(["active", "inactive", "archived"] as const).map((s) => {
                  const groupStatus = group.status || "active";
                  const isActivePill = groupStatus === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={statusMut.isPending}
                      onClick={() => statusMut.mutate(s)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-all duration-200",
                        isActivePill
                          ? "bg-white/10 text-white"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="rounded-full border border-white/10 bg-card px-3 py-1.5 text-xs font-medium capitalize text-gray-300">
                {group.status || "active"}
              </span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "h-10 w-10 shrink-0 rounded-lg border border-white/10 bg-card text-gray-300 hover:bg-white/5 hover:text-white"
                )}
                aria-label="More group actions"
              >
                <MoreHorizontal className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[200px] rounded-xl border border-white/10 bg-card p-1 shadow-xl"
              >
                {isCreator ? (
                  <DropdownMenuItem
                    variant="destructive"
                    className="gap-2 rounded-lg text-red-400 focus:bg-red-500/15 focus:text-red-300"
                    onClick={() => {
                      if (!window.confirm("Delete this group permanently? This cannot be undone.")) return;
                      deleteGroupMut.mutate();
                    }}
                  >
                    <Trash2 className="size-4 shrink-0" />
                    Delete group
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  variant="destructive"
                  className="gap-2 rounded-lg text-red-400 focus:bg-red-500/15 focus:text-red-300"
                  disabled={leaveMut.isPending}
                  onClick={() => leaveMut.mutate()}
                >
                  <LogOut className="size-4 shrink-0" />
                  Leave group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <Card className="rounded-xl border-white/10 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white">Sent invitations</CardTitle>
            <CardDescription className="text-gray-400">
              Track email invites and resend after they expire (72 hours).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sentInvites.length === 0 ? (
              <p className="text-sm text-gray-400">No invitations sent yet.</p>
            ) : (
              <ul className="space-y-2">
                {sentInvites.map((inv) => (
                  <li
                    key={inv._id}
                    className="flex flex-col gap-2 rounded-lg border border-white/10 bg-[#0d1117]/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium text-white">{inv.inviteeEmail}</p>
                      <p className="text-xs text-gray-400">
                        By {inviterLabel(inv)} · expires{" "}
                        {formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <InviteStatusBadge status={inv.status} />
                      {isInviteResendable(inv) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="rounded-lg border border-white/10 text-sm text-white hover:bg-white/10"
                          disabled={resendInviteMut.isPending}
                          onClick={() => resendInviteMut.mutate(inv._id)}
                        >
                          Resend
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="sticky top-0 z-20 -mx-4 border-b border-white/10 bg-[#0d1117] px-4 md:-mx-6 md:px-6">
        <nav
          className="flex gap-1 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Group sections"
        >
          {TAB_CONFIG.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-t-md px-4 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "border-primary border-b-2 bg-white/5 text-white"
                    : "border-b-2 border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4 pt-1">
        {activeTab === "overview" ? (
          <GroupOverviewTab
            group={group}
            isAdmin={isAdmin}
            currentUserId={me?.id}
            onMemberRole={
              isAdmin ? (memberId, role) => roleMut.mutate({ memberId, role }) : undefined
            }
            onMemberTransfer={isAdmin ? (memberId) => transferOwnershipMut.mutate(memberId) : undefined}
            onMemberRemove={isAdmin ? (memberId) => removeMemberMut.mutate(memberId) : undefined}
            rolePending={roleMut.isPending}
            transferPending={transferOwnershipMut.isPending}
            removePending={removeMemberMut.isPending}
          />
        ) : null}
        {activeTab === "expenses" ? (
          ePending ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : (
            <GroupExpensesTab expenses={expenses} currency={currency} />
          )
        ) : null}
        {activeTab === "balances" ? <GroupBalancesTab balances={balances} group={group} /> : null}
        {activeTab === "activity" ? <GroupActivityTab items={activity} /> : null}
        {activeTab === "analytics" ? (
          <GroupAnalyticsTab analytics={analytics} currency={group.currency || currency} />
        ) : null}
      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            setFriendToAdd("");
            setFriendSearch("");
          }
        }}
      >
        <DialogContent className="border-white/10 bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add member</DialogTitle>
            <DialogDescription className="text-gray-400">
              Only friends can be added. Invite people from the Groups page first.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {friendsPending ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            ) : !friends || friends.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-[#0d1117]/80 p-4 text-center">
                <p className="text-sm text-gray-400">
                  No friends added yet. Invite them from the Groups page first.
                </p>
                <Link
                  to="/groups"
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "mt-3 inline-flex rounded-lg border border-white/10 text-white hover:bg-white/10"
                  )}
                >
                  Go to Groups
                </Link>
              </div>
            ) : friendOptions.length === 0 ? (
              <p className="text-sm text-gray-400">Everyone you know is already in this group.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-gray-300">Search friends</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                      placeholder="Filter by name or email…"
                      className="border-white/10 bg-[#0d1117] pl-9 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>
                {selectedFriend ? (
                  <div className="border-primary/30 bg-primary/10 rounded-lg border px-3 py-2">
                    <p className="text-primary text-xs font-medium uppercase tracking-wide">Selected</p>
                    <p className="text-sm font-semibold text-white">{selectedFriend.user.displayName}</p>
                    <p className="text-xs text-gray-400">{selectedFriend.user.email}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 px-2 text-xs text-gray-300 hover:text-white"
                      onClick={() => setFriendToAdd("")}
                    >
                      Clear selection
                    </Button>
                  </div>
                ) : null}
                <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-[#0d1117] p-1">
                  {filteredFriendOptions.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-gray-500">No matches.</p>
                  ) : (
                    filteredFriendOptions.map((f) => {
                      const selected = String(friendToAdd) === String(f.user.id);
                      const initials = f.user.displayName.slice(0, 2).toUpperCase();
                      return (
                        <button
                          key={f.user.id}
                          type="button"
                          onClick={() => setFriendToAdd(String(f.user.id))}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-200",
                            selected ? "bg-white/10" : "hover:bg-white/5"
                          )}
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#1f2937] text-xs font-semibold text-white">
                            {initials}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-white">
                              {f.user.displayName}
                            </span>
                            <span className="block truncate text-xs text-gray-400">{f.user.email}</span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="rounded-lg border border-white/10 text-white hover:bg-white/10"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-lg font-semibold"
              disabled={!friendToAdd || addMemberMut.isPending || friendsPending}
              onClick={() => addMemberMut.mutate()}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>Invite by email or username search.</DialogDescription>
          </DialogHeader>
          <form onSubmit={inviteForm.handleSubmit((values) => inviteMut.mutate(values))} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" placeholder="friend@email.com" {...inviteForm.register("inviteeEmail")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-username">Username</Label>
              <Input id="invite-username" placeholder="or search by display name" {...inviteForm.register("inviteeUsername")} />
            </div>
            {inviteForm.formState.errors.inviteeEmail ? (
              <p className="text-destructive text-xs">{inviteForm.formState.errors.inviteeEmail.message}</p>
            ) : null}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteMut.isPending}>
                Send invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={expOpen} onOpenChange={setExpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add group expense</DialogTitle>
            <DialogDescription>Visible to all members of this group.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4 py-2"
            onSubmit={expenseForm.handleSubmit((values) => addExpMut.mutate(values))}
          >
            <div className="space-y-4">
              <Label htmlFor="et">Title</Label>
              <Input id="et" {...expenseForm.register("title")} />
            </div>
            <div className="space-y-4">
              <Label htmlFor="ea">Amount</Label>
              <NumberInput
                id="ea"
                step={0.01}
                min={0}
                value={expenseForm.watch("amount") ?? ""}
                onValueChange={(value) =>
                  expenseForm.setValue("amount", Number(value) || 0, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <div className="space-y-4">
              <Label>Category</Label>
              <Select
                value={expenseForm.watch("category")}
                onValueChange={(value) => {
                  if (!value) return;
                  expenseForm.setValue("category", value, { shouldValidate: true });
                }}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <Label>Payer</Label>
              <Select
                value={expenseForm.watch("paidBy")}
                onValueChange={(value) => {
                  if (!value) return;
                  expenseForm.setValue("paidBy", value, { shouldValidate: true });
                }}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Who paid?" />
                </SelectTrigger>
                <SelectContent>
                  {activeMembers.map((member) => (
                    <SelectItem key={memberUserId(member)} value={memberUserId(member)}>
                      {memberDisplayName(member)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <Label>Split type</Label>
              <Select
                value={expenseForm.watch("splitType")}
                onValueChange={(value) =>
                  value
                    ? expenseForm.setValue("splitType", value as "equal" | "exact" | "percentage", {
                        shouldValidate: true,
                      })
                    : null
                }
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">Equal</SelectItem>
                  <SelectItem value="exact">Exact</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <Label htmlFor="ed">Date</Label>
              <DatePicker
                id="ed"
                value={expenseForm.watch("date")}
                onChange={(v) =>
                  expenseForm.setValue("date", v, { shouldValidate: true, shouldDirty: true })
                }
                align="start"
              />
            </div>
            <div className="space-y-4">
              <Label htmlFor="eds">Notes</Label>
              <Textarea id="eds" rows={2} {...expenseForm.register("notes")} />
            </div>
            <div className="space-y-4">
              <Label htmlFor="ebi">Bill image URL</Label>
              <Input id="ebi" placeholder="https://..." {...expenseForm.register("billImageUrl")} />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setExpOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addExpMut.isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle up</DialogTitle>
            <DialogDescription>Record a settlement payment between members.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4 py-2"
            onSubmit={settleForm.handleSubmit((values) => settleMut.mutate(values))}
          >
            <div className="space-y-2">
              <Label>From (paid)</Label>
              <Select
                value={settleForm.watch("fromUserId")}
                onValueChange={(value) => {
                  if (!value) return;
                  settleForm.setValue("fromUserId", value, { shouldValidate: true });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {activeMembers.map((member) => (
                    <SelectItem key={memberUserId(member)} value={memberUserId(member)}>
                      {memberDisplayName(member)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To (received)</Label>
              <Select
                value={settleForm.watch("toUserId")}
                onValueChange={(value) => {
                  if (!value) return;
                  settleForm.setValue("toUserId", value, { shouldValidate: true });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {activeMembers.map((member) => (
                    <SelectItem key={memberUserId(member)} value={memberUserId(member)}>
                      {memberDisplayName(member)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settle-amount">Amount</Label>
              <NumberInput
                id="settle-amount"
                min={0}
                step={0.01}
                value={settleForm.watch("amount") ?? ""}
                onValueChange={(value) =>
                  settleForm.setValue("amount", Number(value) || 0, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={settleForm.watch("method")}
                onValueChange={(value) =>
                  value
                    ? settleForm.setValue("method", value as "cash" | "upi" | "bank" | "other", {
                        shouldValidate: true,
                      })
                    : null
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setSettleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={settleMut.isPending}>
                Record settlement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
