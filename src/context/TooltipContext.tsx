import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { TOUR_CONFIG, type TourStep } from "@/features/tour/tourConfig";

const K_ONBOARDING = "emt_hasSeenOnboarding";
const K_SEEN_PAGES = "emt_seenPages";

type TooltipContextValue = {
  isOnboardingActive: boolean;
  currentOnboardingStep: number;
  startOnboarding: () => void;
  nextOnboardingStep: () => void;
  prevOnboardingStep: () => void;
  skipOnboarding: () => void;
  isPageTourActive: boolean;
  currentPageTourStep: number;
  startPageTour: (route: string) => void;
  nextPageTourStep: () => void;
  prevPageTourStep: () => void;
  skipPageTour: () => void;
  activePageRoute: string;
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

function readSeenPages(): string[] {
  try {
    const raw = localStorage.getItem(K_SEEN_PAGES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function markPageSeen(route: string): void {
  const set = new Set(readSeenPages());
  set.add(route);
  localStorage.setItem(K_SEEN_PAGES, JSON.stringify(Array.from(set)));
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  const [isOnboardingActive, setOnboardingActive] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0);
  const [isPageTourActive, setPageTourActive] = useState(false);
  const [currentPageTourStep, setCurrentPageTourStep] = useState(0);
  const [activePageRoute, setActivePageRoute] = useState("");

  const onboardingSteps = TOUR_CONFIG.global ?? [];

  const startOnboarding = useCallback(() => {
    setOnboardingActive(true);
    setCurrentOnboardingStep(0);
  }, []);

  const skipOnboarding = useCallback(() => {
    localStorage.setItem(K_ONBOARDING, "true");
    setOnboardingActive(false);
    setCurrentOnboardingStep(0);
  }, []);

  const nextOnboardingStep = useCallback(() => {
    setCurrentOnboardingStep((s) => {
      const next = s + 1;
      if (next >= onboardingSteps.length) {
        localStorage.setItem(K_ONBOARDING, "true");
        setOnboardingActive(false);
        return 0;
      }
      return next;
    });
  }, [onboardingSteps.length]);

  const prevOnboardingStep = useCallback(() => {
    setCurrentOnboardingStep((s) => Math.max(0, s - 1));
  }, []);

  const startPageTour = useCallback((route: string) => {
    const steps = TOUR_CONFIG[route];
    if (!steps?.length) return;
    setActivePageRoute(route);
    setCurrentPageTourStep(0);
    setPageTourActive(true);
  }, []);

  const skipPageTour = useCallback(() => {
    if (activePageRoute) markPageSeen(activePageRoute);
    setPageTourActive(false);
    setCurrentPageTourStep(0);
  }, [activePageRoute]);

  const nextPageTourStep = useCallback(() => {
    const steps = TOUR_CONFIG[activePageRoute] ?? [];
    setCurrentPageTourStep((s) => {
      const next = s + 1;
      if (next >= steps.length) {
        if (activePageRoute) markPageSeen(activePageRoute);
        setPageTourActive(false);
        return 0;
      }
      return next;
    });
  }, [activePageRoute]);

  const prevPageTourStep = useCallback(() => {
    setCurrentPageTourStep((s) => Math.max(0, s - 1));
  }, []);

  const value = useMemo<TooltipContextValue>(() => ({
    isOnboardingActive,
    currentOnboardingStep,
    startOnboarding,
    nextOnboardingStep,
    prevOnboardingStep,
    skipOnboarding,
    isPageTourActive,
    currentPageTourStep,
    startPageTour,
    nextPageTourStep,
    prevPageTourStep,
    skipPageTour,
    activePageRoute,
  }), [
    isOnboardingActive,
    currentOnboardingStep,
    startOnboarding,
    nextOnboardingStep,
    prevOnboardingStep,
    skipOnboarding,
    isPageTourActive,
    currentPageTourStep,
    startPageTour,
    nextPageTourStep,
    prevPageTourStep,
    skipPageTour,
    activePageRoute,
  ]);

  return <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>;
}

export function useTooltipContext(): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error("useTooltipContext must be used within TooltipProvider");
  return ctx;
}

export function clearTourStorage(): void {
  localStorage.removeItem(K_ONBOARDING);
  localStorage.removeItem(K_SEEN_PAGES);
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (k?.startsWith("ems.pageHelp.v1:")) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

export function getRouteTourSteps(route: string): TourStep[] {
  return TOUR_CONFIG[route] ?? [];
}

export function getGlobalTourSteps(): TourStep[] {
  return TOUR_CONFIG.global ?? [];
}

