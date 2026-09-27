import { useEffect, useId, useRef, useState, type FocusEvent } from 'react';
import { Button, Icon, StatusBanner, TaskCard, VideoCard } from '../../../components/ds';
import { useI18n } from '../../../i18n';
import { formatDuration, hasText, splitParagraphs, useLessonPlayer } from '../../../lesson';
import { SayItBox, useSayIt } from '../sayIt';
import { StageActionBar } from '../StageActionBar';
import {
  PLAYER_ALLOW,
  PLAYER_LISTEN_INTERVAL_MS,
  PLAYER_LISTENING_MESSAGE,
  PLAYER_REFERRER_POLICY,
  PLAYER_TIMEOUT_MS,
  playerSignal,
  youtubeEmbedUrl,
} from './youtube';
import './WatchStage.css';

/**
 * What the video area shows:
 * - 'poster': the local poster (no request to any video host yet);
 * - 'player': the youtube-nocookie player, created by the learner's tap;
 * - 'written': the written version ("Read instead").
 */
type View = 'poster' | 'player' | 'written';

/**
 * Why the written version is showing, for its message:
 * - 'choice': the learner chose Read instead (remembered);
 * - 'save-data': the device setting (settings.saveData): no video at all;
 * - 'device-save-data': the browser's own data saver (Save-Data): starts on
 *   the written version, but the learner may still choose the video;
 * - 'timeout', 'offline', 'unavailable': the video couldn't play.
 */
type WrittenReason = 'choice' | 'save-data' | 'device-save-data' | 'timeout' | 'offline' | 'unavailable';

/** True when the browser or the operating system asks sites to save data (the Save-Data hint). */
function browserSavesData(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

type FocusTarget = 'player' | 'written' | 'watch';

/**
 * Watch (optional): a short video or its written version, with a question
 * before and after. Done when the after answer is saved (on blur) or the
 * learner continues (src/lesson/progressRules.ts).
 *
 * Privacy and bad internet (CLAUDE.md):
 * - Until the learner taps "Watch the video", nothing is requested from any
 *   YouTube or Google host: the poster is drawn locally from the content's
 *   title, channel and duration, never a thumbnail.
 * - The tap creates a youtube-nocookie iframe with no autoplay; the learner
 *   starts the video with the player's own play button.
 * - If the player hasn't said it is ready 20 seconds after the tap, or the
 *   device is (or goes) offline, Watch shows the written version with a
 *   kind message. "Ready" means a postMessage from the youtube-nocookie
 *   player itself (./youtube.ts playerSignal), never the frame's load
 *   event, which also fires for the browser's own "can't connect" page.
 *   If the player reports it can't play the video, the same happens.
 * - With "Save data" on (settings.saveData), Watch opens on the written
 *   version and doesn't offer the video at all. With the browser's own
 *   Save-Data hint on, it opens on the written version but still offers
 *   the video (phase 6's setting may use the hint as its default).
 * - A learner who chose "Read instead" comes back to the written version.
 */
export function WatchStage() {
  const { t } = useI18n();
  const { lesson, progress, update, stageEvent, settings } = useLessonPlayer();
  const { watch } = lesson;
  const saveData = settings.saveData;

  const [view, setView] = useState<View>(() =>
    saveData || progress.watch.readInstead || browserSavesData() ? 'written' : 'poster',
  );
  const [reason, setReason] = useState<WrittenReason | null>(() =>
    saveData ? 'save-data' : progress.watch.readInstead ? 'choice' : browserSavesData() ? 'device-save-data' : null,
  );
  /** Bumped on every tap of Watch, so a retry creates a fresh player and a fresh timer. */
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const mediaRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const writtenHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusNext = useRef<FocusTarget | null>(null);

  const sayIt = useSayIt();
  const ids = useId();
  const thinkId = `${ids}-think`;
  const afterId = `${ids}-after`;
  const writtenId = `${ids}-written`;

  // Save data can't be overridden here: no player, whatever the state says.
  const shownView: View = saveData ? 'written' : view;
  const shownReason: WrittenReason | null = saveData ? 'save-data' : reason;

  // Move focus after the view changes, so it never sits on a removed button.
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === 'player') iframeRef.current?.focus();
    else if (target === 'written') writtenHeadingRef.current?.focus();
    else if (target === 'watch') mediaRef.current?.querySelector<HTMLButtonElement>('.tw-video-actions button')?.focus();
  }, [shownView, attempt]);

  // The 20-second fallback, and every other way the video can fail while the
  // player is open. The timer is cleared only when the player itself says it
  // is ready, when the view changes and when the stage unmounts.
  useEffect(() => {
    if (shownView !== 'player') return undefined;

    const fallBack = (why: WrittenReason) => {
      const active = document.activeElement;
      const focusWasHere =
        !active || active === document.body || Boolean(mediaRef.current?.contains(active)) || active === iframeRef.current;
      if (focusWasHere) focusNext.current = 'written';
      setAnnouncement('');
      setReason(why);
      setView('written');
    };

    const onMessage = (event: MessageEvent) => {
      const signal = playerSignal(event, iframeRef.current?.contentWindow);
      if (signal === 'ready') setLoaded(true);
      else if (signal === 'error') fallBack('unavailable');
    };
    window.addEventListener('message', onMessage);

    if (loaded) {
      return () => window.removeEventListener('message', onMessage);
    }

    const onOffline = () => fallBack('offline');
    window.addEventListener('offline', onOffline);
    const timer = setTimeout(() => fallBack('timeout'), PLAYER_TIMEOUT_MS);
    // Ask the player to talk until it does (see PLAYER_LISTENING_MESSAGE).
    // '*' because until the player's page arrives the frame holds a blank or
    // error page, and a named origin would log an error for each try; the
    // message itself is a constant that says nothing about the learner.
    const listen = setInterval(() => {
      try {
        iframeRef.current?.contentWindow?.postMessage(PLAYER_LISTENING_MESSAGE, '*');
      } catch {
        // The frame went away between ticks; the next tick or the cleanup handles it.
      }
    }, PLAYER_LISTEN_INTERVAL_MS);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('offline', onOffline);
      clearTimeout(timer);
      clearInterval(listen);
    };
  }, [shownView, loaded, attempt]);

  const watchVideo = () => {
    if (saveData) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
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
    setAnnouncement(t('lessonPlayer.watch.playerOpened'));
  };

  const readInstead = () => {
    focusNext.current = 'written';
    setAnnouncement('');
    setReason('choice');
    setView('written');
    // The learner's own choice is remembered, so Watch opens on the written
    // version next time. (Save data and the fallback don't set it.)
    update((p) => (p.watch.readInstead ? p : { ...p, watch: { ...p.watch, readInstead: true } }), { immediate: true });
  };

  const closeVideo = () => {
    focusNext.current = 'watch';
    setAnnouncement('');
    setView('poster');
  };

  const onAfterBlur = (event: FocusEvent<HTMLTextAreaElement>) => {
    if (hasText(event.currentTarget.value)) stageEvent({ stage: 'watch', kind: 'after-answered' });
  };
  const beforeBoxId = `${ids}-before`;
  const afterBoxId = `${ids}-after-answer`;

  const duration = watch.durationSeconds === null ? undefined : formatDuration(watch.durationSeconds);
  const videoFailed = shownReason === 'timeout' || shownReason === 'offline' || shownReason === 'unavailable';
  const writtenBanner: { icon: 'WifiOff' | 'Clock' | 'Info'; title: string } | null =
    shownReason === 'offline'
      ? { icon: 'WifiOff', title: t('lessonPlayer.watch.offlineTitle') }
      : shownReason === 'timeout'
        ? { icon: 'Clock', title: t('lessonPlayer.watch.timeoutTitle') }
        : shownReason === 'unavailable'
          ? { icon: 'Info', title: t('lessonPlayer.watch.unavailableTitle') }
          : shownReason === 'device-save-data'
            ? { icon: 'WifiOff', title: t('lessonPlayer.watch.deviceSaveDataTitle') }
            : null;

  return (
    <>
      <TaskCard eyebrow={t('lessonPlayer.watch.eyebrow')} icon="Play">
        {t('lessonPlayer.watch.task')}
      </TaskCard>

      {saveData ? (
        <StatusBanner className="tw-watch-banner" tone="info" icon="WifiOff" title={t('lessonPlayer.watch.saveDataTitle')}>
          {t('lessonPlayer.watch.sameIdeas')}
        </StatusBanner>
      ) : shownView !== 'written' ? (
        <StatusBanner className="tw-watch-banner" tone="info" icon="WifiOff" title={t('lessonPlayer.watch.slowTitle')}>
          {t('lessonPlayer.watch.slowBody')}
        </StatusBanner>
      ) : null}

      {/*
        The before question with a short optional answer box (saved to
        progress.watch.beforeAnswer). The screen shows the question as text
        only; the box is optional and never needed to continue.
      */}
      <section className="tw-watch-panel tw-watch-think" aria-labelledby={thinkId}>
        <h3 id={thinkId} className="eyebrow tw-watch-eyebrow">
          {t('lessonPlayer.watch.thinkFirst')}
        </h3>
        <SayItBox
          sayIt={sayIt}
          id={beforeBoxId}
          label={watch.beforeQuestion}
          optional
          rows={2}
          placeholder={t('lessonPlayer.watch.beforePlaceholder')}
          value={progress.watch.beforeAnswer}
          onValueChange={(text) => update((p) => ({ ...p, watch: { ...p.watch, beforeAnswer: text } }))}
        />
      </section>

      <div ref={mediaRef} className="tw-watch-media">
        {shownView === 'written' ? (
          <>
            {writtenBanner ? (
              <StatusBanner className="tw-watch-banner" tone="info" icon={writtenBanner.icon} title={writtenBanner.title}>
                {t('lessonPlayer.watch.sameIdeas')}
              </StatusBanner>
            ) : null}
            <article className="tw-watch-written" aria-labelledby={writtenId}>
              <span className="eyebrow tw-watch-written-part">{t('lessonPlayer.watch.writtenPart')}</span>
              <h3 id={writtenId} ref={writtenHeadingRef} className="tw-watch-written-h" tabIndex={-1}>
                {watch.title}
              </h3>
              <div className="tw-watch-written-text">
                {splitParagraphs(watch.summary).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              <h4 className="tw-watch-keypoints-h">{t('lessonPlayer.watch.keyPoints')}</h4>
              <ul className="tw-watch-keypoints">
                {watch.keyPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
              {saveData ? null : (
                <div className="tw-watch-written-actions">
                  <Button variant="secondary" icon={videoFailed ? 'RotateCcw' : 'Play'} onClick={watchVideo}>
                    {t(videoFailed ? 'lessonPlayer.watch.tryAgain' : 'lessonPlayer.watch.watchInstead')}
                  </Button>
                </div>
              )}
            </article>
          </>
        ) : (
          <VideoCard
            title={watch.title}
            channel={watch.channel}
            duration={duration}
            readLabel={t('lessonPlayer.watch.readInstead')}
            watchVariant="secondary"
            onWatch={watchVideo}
            onReadInstead={readInstead}
            watching={shownView === 'player'}
            player={
              shownView === 'player' ? (
                <iframe
                  key={attempt}
                  ref={iframeRef}
                  src={youtubeEmbedUrl(watch.youtubeId, window.location.origin)}
                  title={watch.title}
                  allow={PLAYER_ALLOW}
                  allowFullScreen
                  loading="eager"
                  referrerPolicy={PLAYER_REFERRER_POLICY}
                />
              ) : undefined
            }
            actions={
              shownView === 'player' ? (
                <Button variant="ghost" icon="X" onClick={closeVideo}>
                  {t('lessonPlayer.watch.closeVideo')}
                </Button>
              ) : undefined
            }
          >
            <p className="tw-watch-why">{watch.why}</p>
          </VideoCard>
        )}
        <p className="tw-visually-hidden" aria-live="polite">
          {announcement}
        </p>
      </div>

      <section className="tw-watch-panel" aria-labelledby={afterId}>
        <h3 id={afterId} className="eyebrow tw-watch-eyebrow">
          {t('lessonPlayer.watch.afterEyebrow')}
        </h3>
        <SayItBox
          sayIt={sayIt}
          id={afterBoxId}
          label={watch.afterQuestion}
          optional
          rows={3}
          placeholder={t('lessonPlayer.watch.afterPlaceholder')}
          value={progress.watch.afterAnswer}
          onValueChange={(text) => update((p) => ({ ...p, watch: { ...p.watch, afterAnswer: text } }))}
          // A spoken answer counts like a typed one (which counts on blur).
          onDictationDone={(text) => {
            if (hasText(text)) stageEvent({ stage: 'watch', kind: 'after-answered' });
          }}
          onBlur={onAfterBlur}
        />
      </section>

      {watch.contentNote ? (
        <details className="tw-watch-teachers">
          <summary>
            <Icon name="GraduationCap" size={20} />
            <span>{t('lessonPlayer.watch.forTeachers')}</span>
            <Icon name="ChevronDown" size={20} className="tw-watch-teachers-chevron" />
          </summary>
          <p className="body">{watch.contentNote}</p>
        </details>
      ) : null}

      {sayIt.announcer}

      <StageActionBar
        onNext={() => stageEvent({ stage: 'watch', kind: 'continue' })}
        helper={t('lessonPlayer.watch.helper')}
      />
    </>
  );
}
