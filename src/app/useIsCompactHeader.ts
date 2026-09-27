import { useEffect, useState } from 'react';

/**
 * SiteHeader's full layout (five nav links plus the learner chip) never
 * shrinks or wraps, so below about 1100px wide (tablets, and some laptops)
 * the caller must switch to `compact` (see SiteHeader's own docstring).
 */
const QUERY = '(max-width: 1099px)';

function matches(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia(QUERY).matches;
  } catch {
    // Some test environments (jsdom without a matchMedia polyfill) throw
    // rather than returning undefined; either way, fall back to the full
    // layout rather than breaking the page.
    return false;
  }
}

/** Whether the header should use its compact (phone) layout right now. */
export function useIsCompactHeader(): boolean {
  const [compact, setCompact] = useState(matches);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia(QUERY);
    } catch {
      return;
    }
    const onChange = () => setCompact(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return compact;
}
