import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/** A reading part (1..n) or the quick check. */
export type ReadView = number | 'check';

export const PART_PARAM = 'part';

/** ?part=2 → 2, ?part=check → 'check'. Missing, invalid or out of range → 1. */
export function parseReadView(value: string | null, total: number): ReadView {
  if (value === 'check') return 'check';
  if (value && /^\d+$/.test(value)) {
    const n = Number(value);
    if (n >= 1 && n <= total) return n;
  }
  return 1;
}

/**
 * Read's current part lives in the URL (?part=1..n, ?part=check), so
 * reload, restore and the browser's Back button all work without adding
 * anything to storage. Moving keeps every other query parameter (such as
 * ?preview=true) and pushes a history entry.
 */
export function useReadPart(total: number): [ReadView, (view: ReadView) => void] {
  const [params, setParams] = useSearchParams();
  const view = parseReadView(params.get(PART_PARAM), total);
  const setView = useCallback(
    (next: ReadView) => {
      setParams((prev) => {
        const updated = new URLSearchParams(prev);
        updated.set(PART_PARAM, String(next));
        return updated;
      });
    },
    [setParams],
  );
  return [view, setView];
}
