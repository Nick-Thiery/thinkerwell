import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Whether SiteHeader's full layout fits its row, measured rather than
 * assumed: the links, the language switch and the learner's name are longer
 * in some languages (Indonesian) and for some names, so a width that fits
 * one doesn't fit another. Each time the language, the learner's name or
 * the window's width changes, the full layout is tried and measured before
 * the browser paints; if it's wider than its row, the caller shows the
 * compact one instead. `key` says what changed (for example
 * `${locale}|${learnerName}`).
 */
export function useHeaderFits(area: RefObject<HTMLElement | null>, key: string, measure: boolean): boolean {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 0 : window.innerWidth));
  const [fit, setFit] = useState<{ key: string; fits: boolean } | null>(null);
  const full = `${key}|${width}`;

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useLayoutEffect(() => {
    if (!measure || fit?.key === full) return;
    const row = area.current?.querySelector<HTMLElement>('.tw-header-inner');
    if (!row) return;
    // Measuring what just rendered (the full layout) before it's painted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFit({ key: full, fits: row.scrollWidth <= row.clientWidth + 1 });
  }, [measure, fit?.key, full, area]);

  // Unknown for this key yet: try the full layout, so it can be measured.
  return fit?.key === full ? fit.fits : true;
}
