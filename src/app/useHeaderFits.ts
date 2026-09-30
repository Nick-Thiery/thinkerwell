import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

/**
 * How much of SiteHeader fits its row, measured rather than assumed: the
 * links, the language switch and the learner's name are longer in some
 * languages (Indonesian) and for some names, so a width that fits one
 * doesn't fit another.
 *
 * - `full`: every link, the language by name, the learner's name.
 * - `tight`: every link still, but the language as its short code and the
 *   learner as their avatar only, with smaller gaps.
 * - `compact`: the phone layout (logo, language, avatar, menu button).
 *
 * Each time the language, the learner's name or the window's width changes,
 * the full layout is tried and measured before the browser paints; if it's
 * wider than its row, the tight one is tried and measured the same way, and
 * only if that doesn't fit either does the header fall back to compact. The
 * links stay visible whenever they can, because hiding them behind a menu
 * button on a laptop looks like they have disappeared. `key` says what
 * changed (for example `${locale}|${learnerName}`).
 */
export type HeaderLevel = 'full' | 'tight' | 'compact';

export function useHeaderLevel(area: RefObject<HTMLElement | null>, key: string, measure: boolean): HeaderLevel {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 0 : window.innerWidth));
  const [state, setState] = useState<{ key: string; level: HeaderLevel; settled: boolean } | null>(null);
  const full = `${key}|${width}`;
  const current = state?.key === full ? state : null;
  // Unknown for this key yet: try the full layout first, so it can be measured.
  const level: HeaderLevel = current ? current.level : 'full';
  const settled = current?.settled ?? false;

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useLayoutEffect(() => {
    if (!measure || settled) return;
    const row = area.current?.querySelector<HTMLElement>('.tw-header-inner');
    if (!row) return;
    // Measuring what just rendered before it's painted, one step at a time.
    const fits = row.scrollWidth <= row.clientWidth + 1;
    if (fits) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ key: full, level, settled: true });
    } else if (level === 'full') {
      setState({ key: full, level: 'tight', settled: false });
    } else {
      setState({ key: full, level: 'compact', settled: true });
    }
  }, [measure, settled, level, full, area]);

  return level;
}
