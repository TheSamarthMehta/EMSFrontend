import type { PageHelpPersistedState, PageHelpRouteFlags } from "@/types/pageHelp";

const AWAY_MIN_MS = 3 * 24 * 60 * 60 * 1000;
const NEW_USER_MAX_MS = 48 * 60 * 60 * 1000;

function storageKey(userId: string): string {
  return `ems.pageHelp.v1:${userId}`;
}

function defaultState(): PageHelpPersistedState {
  return {
    lastPingAt: new Date(0).toISOString(),
    awaySessionEpoch: 0,
    routes: {},
  };
}

export function readPageHelpState(userId: string): PageHelpPersistedState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<PageHelpPersistedState>;
    if (!parsed || typeof parsed !== "object") return defaultState();
    return {
      lastPingAt: typeof parsed.lastPingAt === "string" ? parsed.lastPingAt : defaultState().lastPingAt,
      awaySessionEpoch:
        typeof parsed.awaySessionEpoch === "number" && Number.isFinite(parsed.awaySessionEpoch)
          ? parsed.awaySessionEpoch
          : 0,
      routes:
        parsed.routes && typeof parsed.routes === "object" && !Array.isArray(parsed.routes)
          ? (parsed.routes as Record<string, PageHelpRouteFlags>)
          : {},
    };
  } catch {
    return defaultState();
  }
}

function writePageHelpState(userId: string, state: PageHelpPersistedState): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(state));
}

export type PageHelpSessionFlavor = "new" | "away" | "regular";

export function openPageHelpSession(
  userId: string,
  accountCreatedAtIso: string
): { state: PageHelpPersistedState; flavor: PageHelpSessionFlavor } {
  const now = Date.now();
  const prev = readPageHelpState(userId);
  const lastMs = Date.parse(prev.lastPingAt);
  const hasPing = Number.isFinite(lastMs) && lastMs > 0;
  const gapMs = hasPing ? now - lastMs : 0;

  let awaySessionEpoch = prev.awaySessionEpoch;
  if (hasPing && gapMs >= AWAY_MIN_MS) {
    awaySessionEpoch += 1;
  }

  const accountAgeMs = now - Date.parse(accountCreatedAtIso);
  const flavor: PageHelpSessionFlavor =
    Number.isFinite(accountAgeMs) && accountAgeMs < NEW_USER_MAX_MS
      ? "new"
      : hasPing && gapMs >= AWAY_MIN_MS
        ? "away"
        : "regular";

  const next: PageHelpPersistedState = {
    ...prev,
    lastPingAt: new Date(now).toISOString(),
    awaySessionEpoch,
  };
  writePageHelpState(userId, next);
  return { state: next, flavor };
}

export function pingPageHelpActivity(userId: string): void {
  const prev = readPageHelpState(userId);
  writePageHelpState(userId, {
    ...prev,
    lastPingAt: new Date().toISOString(),
  });
}

export function markPageHelpRouteDismissed(
  userId: string,
  routeKey: string,
  flavor: PageHelpSessionFlavor,
  awaySessionEpoch: number
): void {
  const prev = readPageHelpState(userId);
  const prevFlags = prev.routes[routeKey] ?? {};
  const nextFlags: PageHelpRouteFlags = { ...prevFlags };
  if (flavor === "new") {
    nextFlags.newWelcomeShown = true;
  } else if (flavor === "away") {
    nextFlags.awayEpochAck = awaySessionEpoch;
  }
  writePageHelpState(userId, {
    ...prev,
    routes: { ...prev.routes, [routeKey]: nextFlags },
  });
}

export function shouldAutoOpenPageHelp(
  state: PageHelpPersistedState,
  routeKey: string,
  flavor: PageHelpSessionFlavor
): boolean {
  const flags = state.routes[routeKey] ?? {};
  if (flavor === "new") {
    return !flags.newWelcomeShown;
  }
  if (flavor === "away") {
    return (flags.awayEpochAck ?? 0) < state.awaySessionEpoch;
  }
  return false;
}

export function clearPageHelpForUser(userId: string): void {
  localStorage.removeItem(storageKey(userId));
}

export function clearAllPageHelpStorage(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (k?.startsWith("ems.pageHelp.v1:")) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

export { AWAY_MIN_MS, NEW_USER_MAX_MS };
