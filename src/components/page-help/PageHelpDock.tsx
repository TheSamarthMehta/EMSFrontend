"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useTooltipContext } from "@/context/TooltipContext";
import { getPageHelpSteps } from "@/features/pageHelp/getPageHelpSteps";
import {
  markPageHelpRouteDismissed,
  openPageHelpSession,
  pingPageHelpActivity,
  readPageHelpState,
  shouldAutoOpenPageHelp,
  type PageHelpSessionFlavor,
} from "@/features/pageHelp/pageHelpStorage";
import { tourRouteKey } from "@/features/pageHelp/tourRouteKey";
import { cn } from "@/lib/utils";
import type { PublicUser } from "@/types/user";

const PING_MS = 120_000;

function contextualTitle(routeKey: string, flavor: PageHelpSessionFlavor): string {
  if (flavor === "new") {
    return "Welcome — quick tips for this page";
  }
  if (flavor === "away") {
    return "Welcome back — here's what this page does";
  }
  return `Help · ${routeKey}`;
}

function contextualLead(flavor: PageHelpSessionFlavor): string {
  if (flavor === "new") {
    return "You're new here. Tap the help icon anytime for a short overview of this screen.";
  }
  if (flavor === "away") {
    return "It's been a few days since you last used the app. We've highlighted help so you can get oriented again.";
  }
  return "Use this panel for a concise overview or start a guided walkthrough.";
}

interface PageHelpDockProps {
  user: PublicUser;
}

export function PageHelpDock({ user }: PageHelpDockProps) {
  const location = useLocation();
  const { startPageTour, startOnboarding } = useTooltipContext();
  const pathname = location.pathname;
  const routeKey = tourRouteKey(pathname);
  const isDashboardRoute = routeKey === "/dashboard";
  const steps = getPageHelpSteps(pathname);

  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [sessionFlavor, setSessionFlavor] = useState<PageHelpSessionFlavor>("regular");
  const awayEpochRef = useRef(0);

  useLayoutEffect(() => {
    const { state, flavor } = openPageHelpSession(user.id, user.createdAt);
    setSessionFlavor(flavor);
    awayEpochRef.current = state.awaySessionEpoch;

    const id = window.setInterval(() => {
      pingPageHelpActivity(user.id);
    }, PING_MS);
    return () => window.clearInterval(id);
  }, [user.id, user.createdAt]);

  useEffect(() => {
    if (!isDashboardRoute) {
      setOpen(false);
      setPulse(false);
      return;
    }

    if (sessionFlavor === "regular") {
      setOpen(false);
      setPulse(true);
      return;
    }

    const state = readPageHelpState(user.id);
    if (!shouldAutoOpenPageHelp(state, routeKey, sessionFlavor)) {
      setOpen(false);
      setPulse(false);
      return;
    }

    const t = window.setTimeout(() => {
      setOpen(true);
      setPulse(true);
    }, 450);
    return () => window.clearTimeout(t);
  }, [isDashboardRoute, pathname, routeKey, user.id, sessionFlavor]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        if (open && (sessionFlavor === "new" || sessionFlavor === "away")) {
          markPageHelpRouteDismissed(user.id, routeKey, sessionFlavor, awayEpochRef.current);
        }
        setPulse(false);
      }
      setOpen(next);
    },
    [open, routeKey, sessionFlavor, user.id]
  );

  const startTour = useCallback(() => {
    startPageTour(routeKey);
    setOpen(false);
    setPulse(false);
  }, [routeKey, startPageTour]);

  const replayAppTour = useCallback(() => {
    startOnboarding();
    setOpen(false);
    setPulse(false);
  }, [startOnboarding]);

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[45] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6"
      aria-live="polite"
    >
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          type="button"
          data-page-help-trigger
          aria-label="Page help and guided tour"
          className={cn(
            "pointer-events-auto flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md ring-offset-background transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            pulse && "animate-pulse ring-2 ring-indigo-500/80 ring-offset-2 ring-offset-background"
          )}
        >
          <CircleHelp className="size-5" />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={10}
          className="pointer-events-auto w-[min(22rem,calc(100vw-2rem))] gap-3 p-3 sm:p-4"
        >
          <PopoverHeader className="space-y-1.5">
            <PopoverTitle>{contextualTitle(routeKey, sessionFlavor)}</PopoverTitle>
            <PopoverDescription>{contextualLead(sessionFlavor)}</PopoverDescription>
          </PopoverHeader>

          {steps.length > 0 ? (
            <>
              <Separator />
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">This page</p>
              <ul className="max-h-[220px] space-y-2 overflow-y-auto pr-0.5 text-xs">
                {steps.map((s) => (
                  <li key={s.target} className="border-border/80 rounded-md border bg-muted/30 px-2 py-1.5">
                    <p className="text-foreground font-medium">{s.title}</p>
                    <p className="text-muted-foreground mt-0.5 leading-snug">{s.body}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted-foreground text-xs">
              No scripted tips for this screen yet. Use the app tour for a full walkthrough of the main layout.
            </p>
          )}

          <Separator />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            {steps.length > 0 ? (
              <Button type="button" size="sm" variant="default" className="w-full sm:w-auto" onClick={startTour}>
                Start page tour
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" onClick={replayAppTour}>
              App overview tour
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => handleOpenChange(false)}
            >
              Got it
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
