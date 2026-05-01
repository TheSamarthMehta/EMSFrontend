export interface PageHelpRouteFlags {
  newWelcomeShown?: boolean;
  /** Last away session epoch this route acknowledged (see `PageHelpPersistedState.awaySessionEpoch`). */
  awayEpochAck?: number;
}

export interface PageHelpPersistedState {
  lastPingAt: string;
  /**
   * Incremented whenever the user returns after `AWAY_MIN_MS` of inactivity.
   * Used so each "welcome back" wave can surface once per route.
   */
  awaySessionEpoch: number;
  routes: Record<string, PageHelpRouteFlags>;
}
