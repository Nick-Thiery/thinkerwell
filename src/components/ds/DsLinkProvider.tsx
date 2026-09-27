import { createContext, useContext, type AnchorHTMLAttributes, type ReactNode } from 'react';

/**
 * A component that renders an internal link given `href` (plus the usual
 * anchor props). The app supplies one backed by react-router's `Link` (see
 * src/app/RouterDsLink.tsx); it maps `href` to `to` itself so this file never
 * imports react-router.
 */
export type DsLinkComponent = React.ComponentType<AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>;

const DsLinkContext = createContext<DsLinkComponent | null>(null);

export interface DsLinkProviderProps {
  /** The router-aware link component every internal href renders through. */
  link: DsLinkComponent;
  children: ReactNode;
}

/**
 * Makes every design-system component that takes an `href` (Button,
 * LessonRow, StagePath, Logo, SiteHeader's nav) render a client-side link
 * instead of a plain `<a>`, so navigating inside the app never reloads the
 * page or loses in-memory state (like "Just look around").
 *
 * Without a provider (a component rendered on its own, in a test, or in the
 * dev component gallery's isolated frames) every href still renders a plain
 * `<a href>`: nothing breaks, it just isn't router-aware.
 */
export function DsLinkProvider({ link, children }: DsLinkProviderProps) {
  return <DsLinkContext.Provider value={link}>{children}</DsLinkContext.Provider>;
}

/**
 * The element type to render an internal link with: the provided
 * router-aware component, or the plain anchor tag `'a'` when there is none.
 * Assign the result to a capitalised variable (`const LinkTag = ...`) before
 * using it in JSX — `<a>` works either way, but a lowercase JSX tag name is
 * always read as a literal string by the compiler, never as this variable.
 */
export function useDsLinkComponent(): DsLinkComponent | 'a' {
  return useContext(DsLinkContext) ?? 'a';
}
