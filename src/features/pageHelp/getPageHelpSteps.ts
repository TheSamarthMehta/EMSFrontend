import { TOUR_CONFIG, type TourStep } from "@/features/tour/tourConfig";
import { tourRouteKey } from "@/features/pageHelp/tourRouteKey";

export function getPageHelpSteps(pathname: string): TourStep[] {
  const key = tourRouteKey(pathname);
  return TOUR_CONFIG[key] ?? [];
}
