import { useEffect, useId, useMemo, useRef, useState } from 'react';
import words from 'virtual:thinkerwell/messages/siteVideo';
import { Button, Icon, StatusBanner, VideoCard } from '../../components/ds';
import { useI18n, withWords } from '../../i18n';
import { formatDuration } from '../../lesson/format';
import { isSaveDataOn } from '../../offline/saveData';
import { getStore } from '../../storage';
import { SITE_VIDEOS, type SiteVideoId } from './siteVideos';
import './SiteVideo.css';

/** How long the video may take to show its first frame before the written version takes its place. */
export const SITE_VIDEO_TIMEOUT_MS = 20_000;

const MASCOT_SRC = '/images/thinkerwell-mascot-transparent.png';

/**
 * What shows:
 * - 'poster': drawn here, nothing of the video downloaded yet;
 * - 'player': the video, created by the tap on "Watch the video";
 * - 'written': what the video says ("Read instead").
 */
type View = 'poster' | 'player' | 'written';

/** Why the written version is showing, for its message ('choice': the reader chose it). */
type WrittenReason = 'choice' | 'save-data' | 'timeout' | 'offline' | 'unavailable';

type FocusTarget = 'player' | 'written' | 'watch';

/**
 * The device's "Save data" choice (settings.saveData): null until read, and
 * where this browser window can't store anything. Read once; it changes only
 * on the Settings page.
 */
function useSaveDataChoice(): boolean | null {
  const [choice, setChoice] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    getStore()
      .then((store) => store.getSettings())
      .then(
        (settings) => {
          if (alive) setChoice(settings.saveData);
        },
        () => undefined,
      );
    return () => {
      alive = false;
    };
  }, []);
  return choice;
}

function deviceIsOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** Whether focus is in the video's area (or nowhere), so moving it to the written version won't pull it from elsewhere on the page. */
function focusIsHere(root: HTMLElement | null): boolean {
  const active = document.activeElement;
  return !active || active === document.body || Boolean(root?.contains(active));
}

export interface SiteVideoProps {
  video: SiteVideoId;
  /** 'secondary' where the page already has its one ink primary button. */
  watchVariant?: 'primary' | 'secondary';
  /** On a laptop, the picture and its details side by side (a video across the whole page). */
  wide?: boolean;
}

/**
 * One of Thinkerwell's own videos (./siteVideos.ts), played from this site,
 * with the same promises as a lesson's Watch step (CLAUDE.md):
 *
 * - Nothing of the video downloads until "Watch the video" is tapped; the
 *   poster is drawn here from the mascot already on the site. The tap
 *   starts it (it never plays by itself), with English captions on.
 * - "Read instead" shows what the video says, in the reader's language.
 * - With "Save data" on (Settings, or the browser's data saver until
 *   someone chooses) the written version shows and the video isn't offered.
 * - Offline, or if the first frame hasn't arrived 20 seconds after the tap,
 *   or the file can't play, the written version shows with a kind message
 *   and "Try the video again".
 * - The files are never in the offline copy (vite.config.ts), so the video
 *   costs nothing to anyone who doesn't watch it. Its words are in the
 *   offline copy with this code, so "Read instead" works offline.
 */
export function SiteVideo({ video: id, watchVariant = 'primary', wide = false }: SiteVideoProps) {
  // The videos' words (`siteVideo` in en.json and id.json) load with this
  // code, not with the app (src/i18n/lazyGroups.ts): a first visit to the
  // home page never downloads the transcripts.
  const parent = useI18n();
  const { t, formatNumber, englishLang } = useMemo(() => withWords(parent, words), [parent]);
  const saveData = isSaveDataOn(useSaveDataChoice());
  const video = SITE_VIDEOS[id];
  const title = t(video.title);

  const [view, setView] = useState<View>(() => (deviceIsOffline() ? 'written' : 'poster'));
  const [reason, setReason] = useState<WrittenReason | null>(() => (deviceIsOffline() ? 'offline' : null));
  /** Bumped on every tap of Watch, so a retry makes a fresh player and a fresh timer. */
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const writtenHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusNext = useRef<FocusTarget | null>(null);
  const writtenId = useId();

  // Save data can't be overridden here: no player, whatever the state says.
  const shownView: View = saveData ? 'written' : view;
  const shownReason: WrittenReason | null = saveData ? 'save-data' : reason;

  // Move focus after the view changes, so it never sits on a removed button.
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === 'player') videoRef.current?.focus();
    else if (target === 'written') writtenHeadingRef.current?.focus();
    else if (target === 'watch') rootRef.current?.querySelector<HTMLButtonElement>('.tw-video-actions button')?.focus();
  }, [shownView, attempt]);

  // The tap on "Watch the video" starts it. If the browser won't (some ask
  // for a tap on the video itself), its own play button is there.
  useEffect(() => {
    if (shownView !== 'player') return;
    const element = videoRef.current;
    if (!element || typeof element.play !== 'function') return;
    try {
      void Promise.resolve(element.play()).catch(() => undefined);
    } catch {
      // Not playable here (a test environment); the controls stay.
    }
  }, [shownView, attempt]);

  // Until the first frame arrives: the 20-second fallback, and going offline.
  useEffect(() => {
    if (shownView !== 'player' || loaded) return undefined;
    const fallBack = (why: WrittenReason) => {
      if (focusIsHere(rootRef.current)) focusNext.current = 'written';
      setAnnouncement('');
      setReason(why);
      setView('written');
    };
    const onOffline = () => fallBack('offline');
    window.addEventListener('offline', onOffline);
    const timer = setTimeout(() => fallBack('timeout'), SITE_VIDEO_TIMEOUT_MS);
    return () => {
      window.removeEventListener('offline', onOffline);
      clearTimeout(timer);
    };
  }, [shownView, loaded, attempt]);

  const watchVideo = () => {
    if (saveData) return;
    if (deviceIsOffline()) {
      focusNext.current = 'written';
      setReason('offline');
      setView('written');
      return;
    }
    focusNext.current = 'player';
    setLoaded(false);
    setReason(null);
    setAttempt((n) => n + 1);
    setView('player');
    setAnnouncement(t('siteVideo.playerOpened'));
  };

  const readInstead = () => {
    focusNext.current = 'written';
    setAnnouncement('');
    setReason('choice');
    setView('written');
  };

  const closeVideo = () => {
    focusNext.current = 'watch';
    setAnnouncement('');
    setView('poster');
  };

  const onVideoError = () => {
    if (focusIsHere(rootRef.current)) focusNext.current = 'written';
    setAnnouncement('');
    setReason('unavailable');
    setView('written');
  };

  const videoFailed = shownReason === 'timeout' || shownReason === 'offline' || shownReason === 'unavailable';
  const banner: { icon: 'WifiOff' | 'Clock' | 'Info'; title: string } | null =
    shownReason === 'save-data'
      ? { icon: 'WifiOff', title: t('siteVideo.saveDataTitle') }
      : shownReason === 'offline'
        ? { icon: 'WifiOff', title: t('siteVideo.offlineTitle') }
        : shownReason === 'timeout'
          ? { icon: 'Clock', title: t('siteVideo.timeoutTitle') }
          : shownReason === 'unavailable'
            ? { icon: 'Info', title: t('siteVideo.unavailableTitle') }
            : null;

  return (
    <div ref={rootRef} className={wide ? 'tw-sitevideo tw-sitevideo-wide' : 'tw-sitevideo'}>
      {shownView === 'written' ? (
        <div className="tw-sitevideo-written-wrap">
          {banner ? (
            <StatusBanner tone="info" icon={banner.icon} title={banner.title}>
              {t('siteVideo.sameWords')}
            </StatusBanner>
          ) : null}
          <article className="tw-sitevideo-written" aria-labelledby={writtenId}>
            <span className="eyebrow tw-sitevideo-written-part">{t('siteVideo.writtenPart')}</span>
            <h3 id={writtenId} ref={writtenHeadingRef} className="tw-sitevideo-written-h" tabIndex={-1}>
              {title}
            </h3>
            <div className="tw-sitevideo-written-text">
              {video.words.map((key) => (
                <p key={key}>{t(key)}</p>
              ))}
            </div>
            {video.sources ? <p className="small tw-sitevideo-sources">{t(video.sources)}</p> : null}
            {saveData ? null : (
              <div className="tw-sitevideo-written-actions">
                <Button variant="secondary" icon={videoFailed ? 'RotateCcw' : 'Play'} onClick={watchVideo}>
                  {t(videoFailed ? 'siteVideo.tryAgain' : 'siteVideo.watchInstead')}
                </Button>
              </div>
            )}
          </article>
        </div>
      ) : (
        <VideoCard
          title={title}
          titleInEnglish={false}
          duration={formatDuration(video.seconds, formatNumber)}
          captions={t('siteVideo.captions')}
          watchVariant={watchVariant}
          onWatch={watchVideo}
          onReadInstead={readInstead}
          watching={shownView === 'player'}
          posterArt={<img className="tw-sitevideo-mascot" src={MASCOT_SRC} alt="" width={422} height={423} />}
          player={
            shownView === 'player' ? (
              <video
                key={attempt}
                ref={videoRef}
                src={video.src}
                controls
                playsInline
                // Focusable everywhere (most browsers make a video with
                // controls focusable; this makes sure), so focus can move
                // to it from the removed "Watch the video" button.
                tabIndex={0}
                preload="auto"
                aria-label={title}
                onLoadedData={() => setLoaded(true)}
                onError={onVideoError}
              >
                <track kind="captions" src={video.captions} srcLang="en" label={t('siteVideo.captionsTrack')} default />
              </video>
            ) : undefined
          }
          actions={
            shownView === 'player' ? (
              <Button variant="ghost" icon="X" onClick={closeVideo}>
                {t('siteVideo.closeVideo')}
              </Button>
            ) : undefined
          }
        >
          <p className="tw-sitevideo-blurb">{t(video.blurb)}</p>
          <p className="small tw-sitevideo-data">{t('siteVideo.dataUse', { mb: video.megabytes })}</p>
          {/* The video is in English; say so when the page isn't. */}
          {englishLang.lang ? (
            <p className="tw-sitevideo-language">
              <Icon name="Globe" size={20} />
              <span>{t('siteVideo.inEnglish')}</span>
            </p>
          ) : null}
        </VideoCard>
      )}
      <p className="tw-visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
