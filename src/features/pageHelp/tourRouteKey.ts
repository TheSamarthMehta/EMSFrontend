/** Normalizes the URL to keys used in `TOUR_CONFIG` (and page-help). */
export function tourRouteKey(pathname: string): string {
  if (pathname.startsWith("/groups/") && pathname !== "/groups") {
    return "/group-detail";
  }
  return pathname;
}
