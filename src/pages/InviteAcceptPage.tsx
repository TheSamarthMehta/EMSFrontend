import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getMe } from "@/api/auth";
import { tryRefreshAccessToken } from "@/api/client";
import { getGroupInvitePreview, postAcceptGroupInvite } from "@/api/groups";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import type { PublicUser } from "@/types/user";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { setPostAuthRedirect } from "@/utils/postAuthRedirect";
import { toast } from "sonner";

export default function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const token = searchParams.get("token")?.trim() || "";
  const sessionQuery = useQuery({
    queryKey: ["session", "invite-accept"],
    queryFn: async (): Promise<PublicUser | null> => {
      let t = useAuthStore.getState().accessToken;
      if (!t) {
        t = await tryRefreshAccessToken();
      }
      if (!t) return null;
      try {
        return await getMe();
      } catch {
        return null;
      }
    },
    enabled: Boolean(token),
    staleTime: 0,
    retry: false,
  });
  const sessionUser = sessionQuery.data ?? undefined;
  const sessionPending = sessionQuery.isPending && Boolean(token);
  const [localError, setLocalError] = useState<string | null>(null);

  const previewQuery = useQuery({
    queryKey: ["group-invite-preview", token],
    queryFn: () => getGroupInvitePreview(token),
    enabled: Boolean(token),
    retry: false,
  });

  const acceptMut = useMutation({
    mutationFn: () => postAcceptGroupInvite(token),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["groups"] });
      await qc.invalidateQueries({ queryKey: ["group"] });
      await qc.invalidateQueries({ queryKey: ["group-invites"] });
      await qc.invalidateQueries({ queryKey: ["my-pending-group-invites"] });
      await qc.invalidateQueries({ queryKey: ["session"] });
      toast.success("You've joined the group!");
      const gid = data.groupId;
      if (gid) {
        navigate(`/groups/${gid}`, { replace: true });
      } else {
        navigate("/groups", { replace: true });
      }
    },
    onError: (e: unknown) => {
      setLocalError(getApiErrorMessage(e, "Could not accept invite"));
    },
  });

  useEffect(() => {
    setLocalError(null);
  }, [token]);

  const authReturnPath = useMemo(
    () => (token ? `/invitations/accept?token=${encodeURIComponent(token)}` : "/invitations/accept"),
    [token]
  );

  const goSignIn = () => {
    setPostAuthRedirect(authReturnPath);
    navigate("/auth", { replace: true });
  };

  if (!token) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center p-6">
        <Card className="w-full max-w-md rounded-xl border">
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
            <CardDescription>This invitation link is missing a token.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/groups" className={cn(buttonVariants({ variant: "secondary" }), "inline-flex rounded-lg")}>
              Back to groups
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (previewQuery.isPending) {
    return (
      <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="text-muted-foreground size-8 animate-spin" aria-hidden />
        <p className="text-muted-foreground text-sm">Checking invitation…</p>
      </div>
    );
  }

  if (previewQuery.isError) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center p-6">
        <Card className="w-full max-w-md rounded-xl border">
          <CardHeader>
            <CardTitle>Invitation not found</CardTitle>
            <CardDescription>{getApiErrorMessage(previewQuery.error, "This link is invalid.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/groups" className={cn(buttonVariants({ variant: "secondary" }), "inline-flex rounded-lg")}>
              Back to groups
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const preview = previewQuery.data;
  const showExpired =
    preview?.expired ||
    preview?.status === "expired" ||
    (preview?.status === "pending" && preview?.usable === false && preview?.expired);

  if (preview && !preview.usable) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center p-6">
        <Card className="w-full max-w-md rounded-xl border">
          <CardHeader>
            <CardTitle>{showExpired ? "Invitation expired" : "Invitation unavailable"}</CardTitle>
            <CardDescription>
              {showExpired
                ? "Ask the group admin to send you a new invitation from the group page."
                : `This invitation is no longer valid (status: ${preview.status}).`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link to="/groups" className={cn(buttonVariants({ variant: "secondary" }), "inline-flex rounded-lg")}>
              Back to groups
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionPending) {
    return (
      <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="text-muted-foreground size-8 animate-spin" aria-hidden />
        <p className="text-muted-foreground text-sm">Loading session…</p>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center p-6">
        <Card className="w-full max-w-md rounded-xl border">
          <CardHeader>
            <CardTitle>Sign in to accept</CardTitle>
            <CardDescription>
              You were invited to <span className="text-foreground font-medium">{preview?.groupName}</span>. Sign in
              with the account that received the email ({preview?.inviteeEmail}).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button type="button" className="rounded-lg" onClick={goSignIn}>
              Continue to sign in
            </Button>
            <Link to="/groups" className={cn(buttonVariants({ variant: "outline" }), "inline-flex rounded-lg")}>
              Cancel
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md rounded-xl border">
        <CardHeader>
          <CardTitle>Join {preview?.groupName}</CardTitle>
          <CardDescription>
            Signed in as <span className="text-foreground font-medium">{sessionUser.email}</span>. Accept to join this
            group.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {localError ? (
            <p className="text-destructive text-sm" role="alert">
              {localError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="rounded-lg"
              disabled={acceptMut.isPending}
              onClick={() => acceptMut.mutate()}
            >
              {acceptMut.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Joining…
                </>
              ) : (
                "Accept invitation"
              )}
            </Button>
            <Link to="/groups" className={cn(buttonVariants({ variant: "outline" }), "inline-flex rounded-lg")}>
              Not now
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
