export type TooltipPlacement = "below" | "above" | "right" | "left";

export function positionTooltip(targetEl: HTMLElement, tooltipEl: HTMLElement): { top: number; left: number; placement: TooltipPlacement } {
  tooltipEl.style.visibility = "hidden";
  tooltipEl.style.display = "block";

  const GAP = 12;
  const EDGE_MARGIN = 16;
  const target = targetEl.getBoundingClientRect();
  const tip = tooltipEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const candidates: Array<{ placement: TooltipPlacement; top: number; left: number }> = [
    {
      placement: "below",
      top: target.bottom + GAP,
      left: target.left + target.width / 2 - tip.width / 2,
    },
    {
      placement: "above",
      top: target.top - GAP - tip.height,
      left: target.left + target.width / 2 - tip.width / 2,
    },
    {
      placement: "right",
      top: target.top + target.height / 2 - tip.height / 2,
      left: target.right + GAP,
    },
    {
      placement: "left",
      top: target.top + target.height / 2 - tip.height / 2,
      left: target.left - GAP - tip.width,
    },
  ];

  let chosen = candidates[0];
  for (const c of candidates) {
    const fitsH = c.left >= EDGE_MARGIN && c.left + tip.width <= vw - EDGE_MARGIN;
    const fitsV = c.top >= EDGE_MARGIN && c.top + tip.height <= vh - EDGE_MARGIN;
    if (fitsH && fitsV) {
      chosen = c;
      break;
    }
  }

  chosen.left = Math.min(Math.max(chosen.left, EDGE_MARGIN), vw - tip.width - EDGE_MARGIN);
  chosen.top = Math.min(Math.max(chosen.top, EDGE_MARGIN), vh - tip.height - EDGE_MARGIN);

  tooltipEl.style.visibility = "visible";

  return { top: chosen.top, left: chosen.left, placement: chosen.placement };
}

