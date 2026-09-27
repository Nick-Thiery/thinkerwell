import { forwardRef } from 'react';
import { Link, type LinkProps } from 'react-router';
import type { DsLinkComponent } from '../components/ds';

export type RouterDsLinkProps = Omit<LinkProps, 'to'> & { href: string };

/**
 * The design system's `href`-based link, backed by react-router's `Link`
 * (client-side navigation, no full reload). Passed to `DsLinkProvider` once,
 * in AppLayout, so every ds component with an `href` (Button, LessonRow,
 * StagePath, Logo, SiteHeader's nav) uses it automatically.
 */
export const RouterDsLink: DsLinkComponent = forwardRef<HTMLAnchorElement, RouterDsLinkProps>(
  function RouterDsLink({ href, ...rest }, ref) {
    return <Link ref={ref} to={href} {...rest} />;
  },
) as DsLinkComponent;
