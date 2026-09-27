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
  /**
   * The embedded player, shown in place of the poster (same 16:9 area). Not
   * in the reference, which only draws the poster. The caller creates it
   * only after the learner taps "Watch the video", so nothing loads from the
   * video host before that (CLAUDE.md: privacy, bad internet).
   */
  player?: ReactNode;
  /** True while the player shows: hides the "Watch the video" button. Not in the reference. */
  watching?: boolean;
  /** Extra buttons after "Watch the video" and "Read instead" (for example "Close the video"). Not in the reference. */
  actions?: ReactNode;
}

/**
 * A video's poster, details and the choice every video must offer: watch it,
 * or read the written version instead. The poster is drawn locally, never a
 * thumbnail from the video host; pass `player` to show the embed in its place.
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
  player,
  watching = false,
  actions,
}: VideoCardProps) {
  const { t } = useI18n();
  return (
    <section className={cx('tw-video', className)}>
      {player ? (
        <div className="tw-video-player">{player}</div>
      ) : (
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
      )}
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
          {watching ? null : (
            <Button variant={watchVariant} icon="Play" onClick={onWatch}>
              {t('ds.content.video.watchLabel')}
            </Button>
          )}
          <Button variant="secondary" icon="BookOpen" onClick={onReadInstead}>
            {readLabel || t('ds.content.video.readInsteadDefault')}
          </Button>
          {actions}
        </div>
      </div>
    </section>
  );
}
