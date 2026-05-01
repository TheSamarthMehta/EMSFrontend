import { useEffect } from "react";
import { getAppearanceSettings } from "@/api/settings";
import { applyAppearanceSettings } from "@/lib/applyAppearanceDom";

/** Load server appearance once when the shell mounts so theme/accent match the account. */
export function useBootstrapAppearance(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let canceled = false;
    void (async () => {
      try {
        const s = await getAppearanceSettings();
        if (!canceled) applyAppearanceSettings(s);
      } catch {
        /* unauthenticated or network */
      }
    })();
    return () => {
      canceled = true;
    };
  }, [enabled]);
}
