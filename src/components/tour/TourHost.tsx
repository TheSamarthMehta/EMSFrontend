import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useTooltipContext, getGlobalTourSteps, getRouteTourSteps } from "@/context/TooltipContext";
import { positionTooltip } from "@/features/tour/positionTooltip";
import { SpotlightOverlay } from "@/components/tour/SpotlightOverlay";
import { TooltipCard } from "@/components/tour/TooltipCard";
import { useLocation } from "react-router-dom";

function useTargetRect(selector: string | null) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [selector]);

  return rect;
}

function ActiveTourOverlay({
  steps,
  step,
  onNext,
  onPrev,
  onSkip,
  onDoneLabel = "Get started",
  skipLabel,
  keyboardArrows,
}: {
  steps: { target: string; title: string; body: string }[];
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onDoneLabel?: string;
  skipLabel: string;
  keyboardArrows?: boolean;
}) {
  const current = steps[step];
  const rect = useTargetRect(current?.target ?? null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ top: 24, left: 24 });
  const [positionReady, setPositionReady] = useState(false);

  useEffect(() => {
    if (!current) return;
    setPositionReady(false);
    const el = document.querySelector(current.target) as HTMLElement | null;
    if (!el) {
      console.warn(`[tour] missing selector: ${current.target}`);
      onNext();
      return;
    }
    const inView = el.getBoundingClientRect().top >= 0 && el.getBoundingClientRect().bottom <= window.innerHeight;
    if (!inView) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      const t = window.setTimeout(() => setPositionReady(true), 400);
      return () => window.clearTimeout(t);
    }
    setPositionReady(true);
  }, [current, onNext]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
      if (!keyboardArrows) return;
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNext, onPrev, onSkip, keyboardArrows]);

  useLayoutEffect(() => {
    if (!positionReady || !rect || !tooltipRef.current) return;
    const el = document.querySelector(current.target) as HTMLElement | null;
    if (!el) return;
    setPos(positionTooltip(el, tooltipRef.current));
  }, [rect, current, positionReady]);

  if (!current) return null;
  const isLast = step >= steps.length - 1;

  return createPortal(
    <>
      <SpotlightOverlay targetRect={rect} />
      <div
        ref={tooltipRef}
        style={{ top: pos.top, left: pos.left, position: "fixed", zIndex: 9999, maxWidth: "calc(100vw - 32px)" }}
      >
        <TooltipCard title={current.title} body={current.body} stepText={`Step ${step + 1} of ${steps.length}`}>
          <div className="flex gap-2">
            <Button variant="ghost" size="xs" className="h-11 min-h-11 px-3" onClick={onSkip}>
              {skipLabel}
            </Button>
            <Button variant="outline" size="xs" className="h-11 min-h-11 px-3" onClick={onPrev} disabled={step === 0}>
              Previous
            </Button>
          </div>
          <Button size="xs" className="h-11 min-h-11 px-3" onClick={onNext}>
            {isLast ? onDoneLabel : "Next"}
          </Button>
        </TooltipCard>
      </div>
    </>,
    document.body
  );
}

export function TourHost() {
  const location = useLocation();
  const {
    isOnboardingActive,
    currentOnboardingStep,
    nextOnboardingStep,
    prevOnboardingStep,
    skipOnboarding,
    isPageTourActive,
    currentPageTourStep,
    nextPageTourStep,
    prevPageTourStep,
    skipPageTour,
    activePageRoute,
  } = useTooltipContext();

  const onboardingSteps = getGlobalTourSteps();
  const pageSteps = getRouteTourSteps(activePageRoute || location.pathname);

  return (
    <>
      {isOnboardingActive ? (
        <ActiveTourOverlay
          steps={onboardingSteps}
          step={currentOnboardingStep}
          onNext={nextOnboardingStep}
          onPrev={prevOnboardingStep}
          onSkip={skipOnboarding}
          skipLabel="Skip tour"
          onDoneLabel="Get started"
          keyboardArrows
        />
      ) : null}
      {isPageTourActive ? (
        <ActiveTourOverlay
          steps={pageSteps}
          step={currentPageTourStep}
          onNext={nextPageTourStep}
          onPrev={prevPageTourStep}
          onSkip={skipPageTour}
          skipLabel="Skip page tour"
          onDoneLabel="Finish"
        />
      ) : null}
    </>
  );
}
