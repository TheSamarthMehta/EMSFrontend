import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List, Plus, Users } from "lucide-react";
import { postFriendRequest, postAcceptRequest, postRejectRequest } from "@/api/friends";
import { postGroup } from "@/api/groups";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { GroupCard } from "@/features/groups/list/GroupCard";
import { GroupsToolbar } from "@/features/groups/list/GroupsToolbar";
import {
  createGroupSchema,
  type CreateGroupFormValues,
} from "@/features/groups/schemas/groupForms";
import { useFriends, useIncomingRequests } from "@/hooks/useFriends";
import { useGroups } from "@/hooks/useGroups";
import { CURRENCY_OPTIONS } from "@/lib/currencies";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useI18n } from "@/context/LanguageContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function GroupsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "archived">("all");
  const [sortBy, setSortBy] = useState<"recent" | "spent" | "members" | "name">("recent");
  const [groupsView, setGroupsView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const {
    data: groupsPayload,
    isPending,
    isError,
    error,
  } = useGroups({
    q: debouncedSearch || undefined,
    status: statusFilter,
    sortBy,
    limit: 20,
  });
  const groups = groupsPayload?.groups || [];
  const { data: friends } = useFriends();
  const { data: incoming } = useIncomingRequests();

  const groupForm = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      description: "",
      avatarUrl: "",
      currency: "INR",
    },
  });

  const createMut = useMutation({
    mutationFn: (values: CreateGroupFormValues) =>
      postGroup({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        avatarUrl: values.avatarUrl?.trim() || undefined,
        currency: values.currency,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Group created");
      setOpen(false);
      groupForm.reset();
    },
    onError: (e: unknown) => {
      toast.error(getApiErrorMessage(e, "Could not create group"));
    },
  });
  const canCreateGroup = groupForm.formState.isValid && !createMut.isPending;

  const requestMut = useMutation({
    mutationFn: (email: string) => postFriendRequest(email),
    onSuccess: async () => {
      toast.success("Friend request sent");
      setInviteEmail("");
    },
    onError: (e: unknown) => {
      toast.error(getApiErrorMessage(e, "Request failed"));
    },
  });

  const acceptMut = useMutation({
    mutationFn: (id: string) => postAcceptRequest(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["friends"] });
      await qc.invalidateQueries({ queryKey: ["friend-requests-incoming"] });
      toast.success("Request accepted");
    },
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => postRejectRequest(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["friend-requests-incoming"] });
      toast.success("Request declined");
    },
  });

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full max-w-lg rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {getApiErrorMessage(error, "Could not load groups")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">{t("page.groups.title")}</h1>
          <p className="text-muted-foreground text-xs">{t("page.groups.subtitle")}</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 shrink-0">
          <Plus className="size-4" />
          {t("page.groups.newGroup")}
        </Button>
      </div>

      <Card className="w-full rounded-xl border-white/10 bg-[#161b22]">
        <CardHeader>
          <CardTitle className="text-lg text-white">Friends</CardTitle>
          <CardDescription className="text-gray-400">
            Invite by email, then add friends to groups.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
            <Input
              type="email"
              placeholder="friend@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 border-white/10 bg-[#0d1117] text-white placeholder:text-gray-500"
            />
            <Button
              type="button"
              variant="secondary"
              className="shrink-0 sm:w-auto"
              disabled={!inviteEmail.trim() || requestMut.isPending}
              onClick={() => requestMut.mutate(inviteEmail.trim())}
            >
              Invite
            </Button>
          </div>
          {incoming && incoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Incoming</p>
              {incoming.map((r) => (
                <div
                  key={r.friendshipId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0d1117]/80 p-3"
                >
                  <span className="text-sm text-white">{r.from.displayName}</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => acceptMut.mutate(r.friendshipId)}
                      disabled={acceptMut.isPending}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/15"
                      onClick={() => rejectMut.mutate(r.friendshipId)}
                      disabled={rejectMut.isPending}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Your friends ({friends?.length ?? 0})
            </p>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-gray-300">
              {friends?.map((f) => (
                <li key={f.friendshipId} className="rounded-md px-1 py-0.5 hover:bg-white/5">
                  {f.user.displayName}
                </li>
              ))}
              {friends?.length === 0 && <li className="italic text-gray-500">No friends yet</li>}
            </ul>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4" aria-labelledby="groups-heading">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="groups-heading" className="text-lg font-semibold text-white">
              Your groups
            </h2>
            <div
              className="inline-flex shrink-0 self-start rounded-lg border border-white/10 bg-[#0d1117] p-1 sm:self-auto"
              role="group"
              aria-label="Group layout"
            >
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  "size-9 rounded-md text-gray-400 transition-colors hover:bg-white/5 hover:text-white",
                  groupsView === "grid" && "bg-white/10 text-white"
                )}
                aria-pressed={groupsView === "grid"}
                aria-label="Card grid view"
                onClick={() => setGroupsView("grid")}
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  "size-9 rounded-md text-gray-400 transition-colors hover:bg-white/5 hover:text-white",
                  groupsView === "list" && "bg-white/10 text-white"
                )}
                aria-pressed={groupsView === "list"}
                aria-label="List view"
                onClick={() => setGroupsView("list")}
              >
                <List className="size-4" />
              </Button>
            </div>
          </div>
          <GroupsToolbar
            search={search}
            onSearchChange={setSearch}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </div>

        {groups.length === 0 ? (
          <Card className="rounded-xl border border-dashed border-white/15 bg-[#161b22]">
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-gray-400">
              <Users className="size-10 opacity-50" />
              <p>No groups yet. Create one to share expenses.</p>
            </CardContent>
          </Card>
        ) : groupsView === "grid" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <GroupCard key={g._id} group={g} layout="grid" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((g) => (
              <GroupCard key={g._id} group={g} layout="list" />
            ))}
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create group</DialogTitle>
            <DialogDescription>Create a group with branding and default currency.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3 py-2"
            onSubmit={groupForm.handleSubmit((values) => createMut.mutate(values))}
          >
            <div className="space-y-2">
              <Label htmlFor="gname">Name</Label>
              <Input id="gname" placeholder="Weekend trip" {...groupForm.register("name")} />
              {groupForm.formState.errors.name ? (
                <p className="text-destructive text-xs">{groupForm.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gdesc">Description (optional)</Label>
              <Textarea id="gdesc" rows={3} placeholder="What is this group for?" {...groupForm.register("description")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gavatar">Avatar URL (optional)</Label>
              <Input id="gavatar" placeholder="https://..." {...groupForm.register("avatarUrl")} />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={groupForm.watch("currency")}
                onValueChange={(value) => {
                  if (!value) return;
                  groupForm.setValue("currency", value, { shouldValidate: true });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canCreateGroup}>
                {createMut.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
