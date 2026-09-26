import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { Badge } from './Badge';
import { Button } from './Button';
import { Icon } from './Icon';
import { cx } from './internal/cx';
import './VideoCard.css';

export interface VideoCardProps {
  title: string;
  channel?: string;
  duration?: string;
  captions?: string;
  language?: string;
  readLabel?: string;
  children?: ReactNode;
  /** Tapping "Watch the video" is the only thing that may start playback (CLAUDE.md: never autoplay). */
  onWatch?: () => void;
  /** Tapping "Read instead" shows the written version. */
  onReadInstead?: () => void;
  className?: string;
  /**
   * "Watch the video" button's `Button` variant. Defaults to 'primary',
   * matching the reference; not in the reference's own index.d.ts. README:
   * one ink primary button per view — a page that already has one
   * elsewhere (for example ActionBar's Next) should pass 'secondary' here.
   */
  watchVariant?: 'primary' | 'secondary';
}

/**
 * A video's poster, details and the choice every video must offer: watch it,
 * or read the written version instead. Embedding the player is a later phase.
 */
export function VideoCard({
  title,
  channel,
  duration,
  captions,
  language,
  readLabel,
  children,
  onWatch,
  onReadInstead,
  className,
  watchVariant = 'primary',
}: VideoCardProps) {
  const { t } = useI18n();
  return (
    <section className={cx('tw-video', className)}>
      <div className="tw-video-poster">
        <span className="tw-video-tag">
          <Badge tone="lemon">{t('ds.content.video.optional')}</Badge>
        </span>
        <span className="tw-video-play" aria-hidden="true">
          <Icon name="Play" size={34} />
        </span>
        {duration ? (
          <span className="tw-video-len">
            <Badge tone="ink" icon="Clock">
              {duration}
            </Badge>
          </span>
        ) : null}
      </div>
      <div className="tw-video-body">
        <h3 className="tw-video-title">{title}</h3>
        <div className="tw-video-meta">
          {channel ? (
            <span>
              <Icon name="User" size={16} />
              {channel}
            </span>
          ) : null}
          <span>
            <Icon name="Captions" size={16} />
            {captions || t('ds.content.video.captionsDefault')}
          </span>
          {language ? (
            <span>
              <Icon name="Globe" size={16} />
              {language}
            </span>
          ) : null}
        </div>
        {children}
        <div className="tw-video-actions">
          <Button variant={watchVariant} icon="Play" onClick={onWatch}>
            {t('ds.content.video.watchLabel')}
          </Button>
          <Button variant="secondary" icon="BookOpen" onClick={onReadInstead}>
            {readLabel || t('ds.content.video.readInsteadDefault')}
          </Button>
        </div>
      </div>
    </section>
  );
}
