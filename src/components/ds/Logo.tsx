import { useI18n } from '../../i18n';
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
  return (
    <a className="tw-logo" href={href} aria-label={t('ds.chrome.logo.homeLabel')}>
      <img src={src} alt="" width={size} height={size} style={{ width: size, height: size }} />
      {wordmark === false ? null : <span>Thinkerwell</span>}
    </a>
  );
}
