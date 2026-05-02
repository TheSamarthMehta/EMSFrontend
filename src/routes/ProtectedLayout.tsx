import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageProvider } from "@/context/LanguageContext";
import { TooltipProvider } from "@/context/TooltipContext";
import { PageHelpDock } from "@/components/page-help/PageHelpDock";
import { TourHost } from "@/components/tour/TourHost";
import { useBootstrapAppearance } from "@/hooks/useBootstrapAppearance";
import { useSession } from "@/hooks/useSession";
import { isEmailOtpVerifiedFor, markEmailOtpPending } from "@/utils/emailGate";

export function ProtectedLayout() {
  const { data: user, isPending, isError } = useSession(true);
  const location = useLocation();

  if (isPending) {
    return (
      <div className="flex min-h-svh flex-col gap-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full max-w-3xl rounded-xl" />
      </div>
    );
  }

  if (isError || !user) {
    return <Navigate to="/auth" replace />;
  }

  const emailGateSatisfied =
    user.isEmailVerified || (user.email ? isEmailOtpVerifiedFor(user.email) : true);
  if (user.email && !emailGateSatisfied) {
    markEmailOtpPending(user.email);
    return <Navigate to="/verify-email-code" replace />;
  }

  if (!user.isProfileComplete && location.pathname !== "/complete-profile") {
    return <Navigate to="/complete-profile" replace />;
  }

  if (location.pathname === "/complete-profile") {
    return (
      <OnboardingShell user={user}>
        <Outlet />
      </OnboardingShell>
    );
  }

  return (
    <ProtectedShell user={user}>
      <Outlet />
    </ProtectedShell>
  );
}

function OnboardingShell({ user, children }: { user: import("@/types/user").PublicUser; children: ReactNode }) {
  useBootstrapAppearance(true);
  return (
    <LanguageProvider language={user.language}>
      <div className="min-h-svh w-full">{children}</div>
    </LanguageProvider>
  );
}

function ProtectedShell({ user, children }: { user: import("@/types/user").PublicUser; children: ReactNode }) {
  useBootstrapAppearance(true);
  return (
    <LanguageProvider language={user.language}>
      <TooltipProvider>
        <AppLayout user={user}>
          {children}
          <TourHost />
          <PageHelpDock user={user} />
        </AppLayout>
      </TooltipProvider>
    </LanguageProvider>
  );
}
