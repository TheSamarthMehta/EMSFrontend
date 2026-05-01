import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getMe } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { markEmailOtpVerified } from "@/utils/emailGate";
import { toast } from "sonner";

/** OAuth redirect target: ?token=ACCESS_JWT (short-lived handoff; refresh cookie set by server). */
export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  useEffect(() => {
    const token = params.get("token");
    const err = params.get("error");
    if (err) {
      toast.error("Sign-in failed");
      navigate("/login", { replace: true });
      return;
    }
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    setAccessToken(token);
    window.history.replaceState({}, "", "/auth/callback");
    (async () => {
      try {
        const user = await getMe();
        await qc.setQueryData(["session"], user);
        if (user.email) {
          markEmailOtpVerified(user.email);
        }
        navigate(user.isProfileComplete ? "/dashboard" : "/complete-profile", { replace: true });
      } catch {
        toast.error("Could not load profile");
        setAccessToken(null);
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, params, qc, setAccessToken]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-2 p-6">
      <p className="text-foreground font-medium">Signing you in…</p>
      <p className="text-muted-foreground text-sm">Please wait</p>
    </div>
  );
}
