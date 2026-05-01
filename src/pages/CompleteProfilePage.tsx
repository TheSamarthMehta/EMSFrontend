import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import OnboardingFlow from "@/features/onboarding/OnboardingFlow";
import { useSession } from "@/hooks/useSession";
import { consumePostAuthRedirect } from "@/utils/postAuthRedirect";

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const { data: user, isPending } = useSession(true);

  useEffect(() => {
    if (!user) return;
    if (user.isProfileComplete) {
      navigate(consumePostAuthRedirect() || "/dashboard", { replace: true });
    }
  }, [navigate, user]);

  if (isPending || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[hsl(222_47%_7%)] px-6 text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-[hsl(252_87%_67%)]/30 border-t-[hsl(252_87%_67%)]" />
          <p className="text-sm leading-relaxed">Loading your setup…</p>
        </div>
      </div>
    );
  }

  return <OnboardingFlow user={user} />;
}
