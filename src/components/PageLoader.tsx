import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "@/components/PageLoader.module.css";

export interface PageLoaderProps {
  /** When true, shows the full-page skeleton overlay. When false, completes progress and fades out (~200ms). */
  isLoading: boolean;
  children?: ReactNode;
}

const FADE_MS = 200;
const COMPLETE_HOLD_MS = 120;

/**
 * Full-page skeleton loader for route transitions (SpendWise-style expense tracker).
 * Use with React Router: `const nav = useNavigation();` then `isLoading={nav.state !== "idle"}`.
 */
export default function PageLoader({ isLoading, children }: PageLoaderProps) {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [progressPhase, setProgressPhase] = useState<"idle" | "to85" | "to100">("idle");
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const overlayWasShownRef = useRef(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    if (isLoading) {
      clearTimers();
      overlayWasShownRef.current = true;
      setFadeOut(false);
      setOverlayVisible(true);
      setProgressPhase("idle");

      const to85Soon = setTimeout(() => {
        setProgressPhase("to85");
      }, 0);
      const fallback = setTimeout(() => {
        setProgressPhase((p) => (p === "idle" ? "to85" : p));
      }, 120);
      timersRef.current.push(to85Soon, fallback);

      return () => {
        clearTimers();
      };
    }

    if (!overlayWasShownRef.current) {
      return;
    }

    setProgressPhase("to100");
    const t1 = setTimeout(() => {
      setFadeOut(true);
    }, COMPLETE_HOLD_MS);
    const t2 = setTimeout(() => {
      setOverlayVisible(false);
      setFadeOut(false);
      setProgressPhase("idle");
      overlayWasShownRef.current = false;
    }, COMPLETE_HOLD_MS + FADE_MS);
    timersRef.current.push(t1, t2);

    return () => {
      clearTimers();
    };
  }, [isLoading, clearTimers]);

  const progressClass =
    progressPhase === "to100"
      ? styles.progressBarTo100
      : progressPhase === "to85"
        ? styles.progressBarTo85
        : "";

  return (
    <div className={styles.root}>
      {children ? <div className={styles.children}>{children}</div> : null}
      {overlayVisible ? (
        <>
          <div className={styles.progressTrack} aria-hidden>
            <div className={`${styles.progressBar} ${progressClass}`.trim()} />
          </div>
          <div
            className={`${styles.overlay} ${fadeOut ? styles.overlayFadeOut : ""}`.trim()}
            role="status"
            aria-live="polite"
            aria-busy={isLoading}
            aria-label="Loading page"
          >
            <div className={styles.inner}>
              <div className={styles.brandRow}>
                <div className={styles.brandMark} aria-hidden />
                <div className={styles.brandLines}>
                  <div
                    className={`${styles.shimmer} ${styles.shimmerCard}`}
                    style={{ height: "0.65rem", width: "40%" }}
                  />
                  <div
                    className={`${styles.shimmer} ${styles.shimmerCard}`}
                    style={{ height: "0.5rem", width: "28%" }}
                  />
                </div>
              </div>

              <div className={`${styles.shimmer} ${styles.shimmerCard} ${styles.headerBar}`} />

              <div className={styles.statRow}>
                <div className={`${styles.shimmer} ${styles.shimmerCard} ${styles.statCard}`} />
                <div className={`${styles.shimmer} ${styles.shimmerCard} ${styles.statCard}`} />
              </div>

              <div className={`${styles.shimmer} ${styles.shimmerCard} ${styles.chartBlock}`} />

              <div className={styles.tableBlock}>
                <div className={`${styles.shimmer} ${styles.tableRow}`} />
                <div className={`${styles.shimmer} ${styles.tableRow}`} />
                <div className={`${styles.shimmer} ${styles.tableRow} ${styles.tableRowNarrow}`} />
                <div className={`${styles.shimmer} ${styles.tableRow}`} />
                <div className={`${styles.shimmer} ${styles.tableRow} ${styles.tableRowNarrow}`} />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
