import { createElement } from 'react';
import { useI18n } from '../../i18n';
import { useDsLinkComponent } from './DsLinkProvider';
import './Logo.css';

export interface LogoProps {
  /** The transparent mascot upload. */
  src: string;
  /** Mascot pixel size. Default 44. */
  size?: number;
  /** false hides the "Thinkerwell" word. */
  wordmark?: boolean;
  href?: string;
}

/**
 * Mascot + Eczar wordmark, links home. Only in the header, footer and
 * printouts. Never stretched, never on a photo.
 */
export function Logo({ src, size = 44, wordmark = true, href = '/' }: LogoProps) {
  const { t } = useI18n();
  const LinkTag = useDsLinkComponent();
  // createElement, not JSX: see the matching comment in Button.tsx.
  return createElement(
    LinkTag,
    { className: 'tw-logo', href, 'aria-label': t('ds.chrome.logo.homeLabel') },
    <img key="img" src={src} alt="" width={size} height={size} style={{ width: size, height: size }} />,
    wordmark === false ? null : <span key="word">Thinkerwell</span>,
  );
}
