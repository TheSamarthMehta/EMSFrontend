/**
 * Chart data helpers — keep visual density manageable when category counts are high.
 *
 * Real-world expense apps (Mint/YNAB/Stripe Sigma) cap pie/donut segments and
 * fold the long tail into a single "Other" bucket. Past ~6 visible slices the
 * chart becomes hard to read and the on-slice labels collide.
 */

export interface PieDatum<TExtra extends object = object> {
  name: string;
  value: number;
  count?: number;
  rawCategory: string;
  extra?: TExtra;
}

export interface GroupedPieResult<TExtra extends object = object> {
  data: PieDatum<TExtra>[];
  /** True when at least one row was folded into "Other". */
  truncated: boolean;
  /** Original total across all input rows. */
  total: number;
  /** Number of folded categories (0 when not truncated). */
  hiddenCount: number;
}

const DEFAULT_OTHER_LABEL = "Other";

/**
 * Cap a sorted-by-value list of pie data to the top N segments. Anything beyond
 * N is summed into a single "Other" entry, keeping rendered slice count low.
 */
export function groupTopN<TExtra extends object = object>(
  rows: PieDatum<TExtra>[],
  topN = 6,
  otherLabel: string = DEFAULT_OTHER_LABEL
): GroupedPieResult<TExtra> {
  if (rows.length === 0) {
    return { data: [], truncated: false, total: 0, hiddenCount: 0 };
  }
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((acc, r) => acc + r.value, 0);
  if (sorted.length <= topN) {
    return { data: sorted, truncated: false, total, hiddenCount: 0 };
  }
  const head = sorted.slice(0, topN - 1);
  const tail = sorted.slice(topN - 1);
  const otherValue = tail.reduce((acc, r) => acc + r.value, 0);
  const otherCount = tail.reduce((acc, r) => acc + (r.count ?? 0), 0);
  return {
    data: [
      ...head,
      {
        name: `${otherLabel} (${tail.length})`,
        value: otherValue,
        count: otherCount,
        rawCategory: "__other__",
      },
    ],
    truncated: true,
    total,
    hiddenCount: tail.length,
  };
}
