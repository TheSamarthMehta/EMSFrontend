import { useEffect, useState, type ComponentType } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Receipt,
  Users,
  PiggyBank,
  FileBarChart,
  Settings,
  LogOut,
  Menu,
  X,
  Wallet,
} from "lucide-react";
import { postLogout } from "@/api/auth";
import { buttonVariants } from "@/components/ui/button";
import { useMyPendingGroupInvites } from "@/hooks/useGroup";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_NAME } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
import type { PublicUser } from "@/types/user";
import { cn } from "@/lib/utils";
import { clearEmailOtpState } from "@/utils/emailGate";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AiAssistant } from "@/components/AiAssistant";
import { useI18n, type I18nKey } from "@/context/LanguageContext";

const nav: Array<{ to: string; key: I18nKey; icon: ComponentType<{ className?: string }> }> = [
  { to: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { to: "/expenses", key: "nav.expenses", icon: Receipt },
  { to: "/groups", key: "nav.groups", icon: Users },
  { to: "/budget", key: "nav.budget", icon: PiggyBank },
  { to: "/reports", key: "nav.reports", icon: FileBarChart },
  { to: "/settings", key: "nav.settings", icon: Settings },
];

function PendingGroupInvitesBanner() {
  const { t } = useI18n();
  const { data, isPending } = useMyPendingGroupInvites();
  if (isPending || !data?.length) return null;
  const first = data[0];
  return (
    <div className="border-border bg-muted/40 text-foreground flex flex-wrap items-center justify-center gap-2 border-b px-3 py-1.5 text-xs md:justify-between">
      <span>{t("layout.groupInvite")}</span>
      <Link
        to={`/invitations/accept?token=${encodeURIComponent(first.token)}`}
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "shrink-0 rounded-lg")}
      >
        {t("layout.view")}
      </Link>
    </div>
  );
}

export function AppLayout({
  user,
  children,
}: {
  user: PublicUser;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    try {
      await postLogout();
    } catch {
      /* still clear client */
    }
    setAccessToken(null);
    clearEmailOtpState();
    await qc.removeQueries({ queryKey: ["session"] });
    navigate("/login", { replace: true });
  }

  function isActiveNav(to: string): boolean {
    return (
      location.pathname === to ||
      (to !== "/dashboard" && location.pathname.startsWith(`${to}/`))
    );
  }

  return (
    <div className="bg-background flex min-h-screen w-full min-w-0 flex-col text-sm">

      {/* ── Backdrop overlay ── */}
      <div
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/65 backdrop-blur-[10px] transition-opacity duration-300",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* ── Sidebar drawer ── */}
      <aside
        aria-label="Navigation"
        aria-hidden={!sidebarOpen}
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col",
          "bg-[hsl(var(--card))] border-r border-white/[0.06]",
          "shadow-2xl shadow-black/40",
          "transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 min-w-0"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 ring-1 ring-indigo-500/30">
              <Wallet className="size-3.5 text-indigo-400" />
            </span>
            <span className="text-foreground text-sm font-semibold tracking-tight truncate">
              {APP_NAME}
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
            Menu
          </p>
          {nav.map(({ to, key, icon: Icon }) => {
            const active = isActiveNav(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/20"
                    : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    active ? "text-indigo-400" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {t(key)}
                {active && (
                  <span className="ml-auto size-1.5 rounded-full bg-indigo-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[11px] font-semibold text-indigo-300 ring-1 ring-indigo-500/30 uppercase">
              {user.name?.[0] ?? "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{user.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/[0.04] hover:text-foreground transition-colors"
          >
            <LogOut className="size-4 shrink-0" />
            {t("layout.logout")}
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Pinned top bar: root must not use overflow-x-hidden (it breaks sticky in WebKit/Chromium). */}
        <div className="border-border bg-card/95 supports-[backdrop-filter]:bg-card/80 sticky top-0 z-30 shrink-0 border-b backdrop-blur-md backdrop-saturate-150">
          <PendingGroupInvitesBanner />

          <header className="flex min-h-[2.75rem] items-center justify-between gap-2 px-3 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {/* Hamburger */}
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
            >
              <Menu className="size-4" />
            </button>

            {/* Logo + name */}
            <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-indigo-500/20 ring-1 ring-indigo-500/30">
                <Wallet className="size-3 text-indigo-400" />
              </span>
              <span className="text-foreground truncate text-xs font-semibold tracking-tight">
                {APP_NAME}
              </span>
            </Link>
          </div>

          {/* Right controls */}
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-muted-foreground hidden max-w-[200px] truncate text-[11px] lg:inline">
              {t("layout.signedInAs")}{" "}
              <span className="text-foreground font-medium">{user.name}</span>
            </span>
            <AiAssistant />
            <InstallPrompt />
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-7 px-2.5 text-[11px] max-w-[140px] shrink-0 hover:shadow-sm transition-shadow focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
                )}
              >
                <span className="truncate">{user.name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  {t("nav.settings")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 size-3.5" />
                  {t("layout.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </header>
        </div>

        <main className="flex-1 overflow-x-hidden px-3 py-3 sm:px-4 sm:py-3 lg:px-5 lg:py-4">
          <div className="mx-auto w-full max-w-[1100px] xl:max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
