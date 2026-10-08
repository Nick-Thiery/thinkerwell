/**
 * Read (docs/screens/LessonRead.dc.html, TabletLesson.dc.html,
 * LessonCheck.dc.html): the reading tools, the warm-up, the evidence, then
 * the reading one part at a time, then the quick check. One template for
 * every lesson; all lesson text comes from `lesson` (content/lessons/*.json).
 *
 * - The current part is in the URL (?part=1..n, ?part=check), see useReadPart.
 * - Standard / Simpler follows the player's readingLevel (remembered per
 *   learner). The part's text, its glossary marking and Listen all use the
 *   version on screen.
 * - Listen (./useListen.ts) plays the part's recording of a natural voice
 *   (src/audio/, docs/notes/recorded-audio.md), and reads with the device's
 *   own voice (src/speech/voices.ts: the one chosen in Settings, or the
 *   best one there) where there is no recording to play. It shows where
 *   the lessons' language has recordings or the device has a voice for it.
 *   It reads the part on screen, heading first, one sentence at a time,
 *   marking the sentence with mark.tw-speaking and bringing it into view
 *   when it isn't. At the end of a part it moves on to the next part and
 *   carries on, until the last part ends; it stops at the quick check.
 *   Slow / Normal is the device's listening speed.
 * - The lesson's picture is part of the evidence (LessonEvidence), right
 *   after the warm-up.
 * - When Read counts as done is decided in src/lesson/progressRules.ts: every
 *   choice question answered, or Continue from the quick check.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { recordingRef, sectionKey } from '../../../audio/recordings';
import { ListenBar, ReadingCard, SegmentedControl, ToolToggle } from '../../../components/ds';
import { useI18n } from '../../../i18n';
import { useLessonPlayer } from '../../../lesson';
import { LessonSlot } from '../../../lesson/extras';
import { isSaveDataOn } from '../../../offline';
import { LISTEN_RATES, listenVoiceFor, speechLangFor, useListenVoiceState } from '../../../speech';
import type { ReadingLevel } from '../../../storage';
import { LessonEvidence } from '../evidence/LessonEvidence';
import { StageActionBar } from '../StageActionBar';
import { KeyWordsPanel } from './KeyWordsPanel';
import { QuickCheck } from './QuickCheck';
import { ReadingPassage } from './ReadingPassage';
import { hasGlossaryTerms, listenPieces, sentenceRanges, visibleSectionText } from './readingPieces';
import { useListen } from './useListen';
import { useReadPart, type ReadView } from './useReadPart';
import { WarmUp } from './WarmUp';
import './ReadStage.css';

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Scrolls `element` to the middle of the screen, but only if it isn't comfortably in view already. */
function bringIntoView(element: Element) {
  if (typeof element.scrollIntoView !== 'function') return;
  const rect = element.getBoundingClientRect();
  const height = window.innerHeight || document.documentElement.clientHeight;
  // Room for the sticky header above and the action bar below.
  if (rect.top >= 96 && rect.bottom <= height - 128) return;
  element.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
}

/** The Read stage, as LessonPage renders it. */
export function ReadStage() {
  const { t, contentLocale } = useI18n();
  const { lesson, readingLevel, setReadingLevel, settings, setListeningSpeed } = useLessonPlayer();
  const sections = lesson.read.sections;
  const glossary = lesson.read.glossary;
  const total = sections.length;
  const [view, setView] = useReadPart(total);
  const [keyWordsOpen, setKeyWordsOpen] = useState(false);
  const keyWordsId = useId();
  const listenToolId = useId();
  const listenBarId = useId();

  const readingRef = useRef<HTMLDivElement>(null);
  const listenBarRef = useRef<HTMLDivElement>(null);
  const checkHeadingRef = useRef<HTMLHeadingElement>(null);
  /** Plays the recordings (in the page, hidden, so tests can see its speed). */
  const audioRef = useRef<HTMLAudioElement>(null);
  /** True when Listen (not the learner) moved on to the next part: don't move focus. */
  const listenMovedOn = useRef(false);

  // What Listen reads: the part on screen, heading first, then each sentence.
  const section = view === 'check' ? null : sections[view - 1]!;
  const text = section ? visibleSectionText(section, readingLevel) : '';
  const sentences = useMemo(() => sentenceRanges(text), [text]);
  const listenItems = useMemo(() => (section ? listenPieces(section.heading, text, sentences) : []), [section, sentences, text]);
  // Reads in the lesson's language (id-ID for Indonesian lessons), never with another language's voice,
  // with the voice chosen for it in Settings when that is still on this device.
  const speechLang = speechLangFor(contentLocale);
  const { voice, settled: voicesListed } = useListenVoiceState(speechLang, listenVoiceFor(settings, speechLang));
  // The part's recording (null for a language without recordings), and the next part's, to download ahead.
  const partNumber = typeof view === 'number' ? view : 0;
  const recording = useMemo(
    () => (section ? recordingRef(speechLang, sectionKey(lesson.id, readingLevel, partNumber), listenItems) : null),
    [section, speechLang, lesson.id, readingLevel, partNumber, listenItems],
  );
  const nextSection = typeof view === 'number' ? sections[view] : undefined;
  const nextRecording = useMemo(() => {
    if (!nextSection) return null;
    const nextText = visibleSectionText(nextSection, readingLevel);
    const nextItems = listenPieces(nextSection.heading, nextText, sentenceRanges(nextText));
    return recordingRef(speechLang, sectionKey(lesson.id, readingLevel, partNumber + 1), nextItems);
  }, [nextSection, readingLevel, speechLang, lesson.id, partNumber]);
  const focusListenTool = () => document.getElementById(listenToolId)?.focus();
  const listen = useListen({
    voice,
    items: listenItems,
    itemsKey: `${String(view)}:${readingLevel}`,
    recording,
    next: nextRecording,
    lang: speechLang,
    saveData: isSaveDataOn(settings.saveData),
    media: () => audioRef.current,
    rate: LISTEN_RATES[settings.listeningSpeed],
    onPartEnd: () => {
      if (typeof view === 'number' && view < total) {
        listenMovedOn.current = true;
        setView(view + 1);
        return true;
      }
      // The end of the last part: the bar goes, so focus must not go with it.
      if (listenBarRef.current?.contains(document.activeElement)) focusListenTool();
      return false;
    },
  });
  const { stop: stopListening } = listen;

  // Listen reads the reading only: it stops at the quick check.
  useEffect(() => {
    if (view === 'check') stopListening();
  }, [view, stopListening]);

  // When the part changes (not on first load), bring the new part into view
  // and move focus to its heading, so keyboard and screen-reader users land
  // on what just appeared. When Listen moved on by itself, focus stays put.
  const shownView = useRef<ReadView>(view);
  useEffect(() => {
    if (shownView.current === view) return;
    shownView.current = view;
    const byListen = listenMovedOn.current;
    listenMovedOn.current = false;
    const scrollTarget = view === 'check' ? checkHeadingRef.current?.closest<HTMLElement>('.tw-read-check') : readingRef.current;
    const heading =
      view === 'check' ? checkHeadingRef.current : readingRef.current?.querySelector<HTMLElement>('.tw-reading-h');
    if (scrollTarget && typeof scrollTarget.scrollIntoView === 'function') {
      scrollTarget.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }
    if (heading && !byListen) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }, [view]);

  // Keep the piece being read in view, gently: only when it isn't already.
  const reading = listen.current;
  useEffect(() => {
    if (reading === null) return;
    const root = readingRef.current;
    const target = root?.querySelector(reading === 0 ? '.tw-reading-h' : 'mark.tw-speaking');
    if (target) bringIntoView(target);
  }, [reading]);

  if (view === 'check' || !section) {
    return <QuickCheck headingRef={checkHeadingRef} onBack={() => setView(total)} />;
  }

  const part = view;
  const simpler = readingLevel === 'simpler';
  const isLast = part === total;
  const listening = listen.state !== 'off';
  const highlight = reading !== null && reading > 0 ? (sentences[reading - 1] ?? null) : null;

  return (
    <div className="tw-read">
      <div role="toolbar" aria-label={t('lessonPlayer.read.toolsLabel')} className="tw-read-tools">
        {voice || recording ? (
          <ToolToggle
            id={listenToolId}
            icon="Volume2"
            pressed={listening}
            aria-controls={listening ? listenBarId : undefined}
            onClick={() => (listening ? listen.stop() : listen.start())}
          >
            {t('lessonPlayer.read.listen')}
          </ToolToggle>
        ) : null}
        <SegmentedControl
          label={t('lessonPlayer.read.levelLabel')}
          options={[
            { label: t('lessonPlayer.read.levelStandard'), value: 'standard' },
            { label: t('lessonPlayer.read.levelSimpler'), value: 'simpler' },
          ]}
          value={readingLevel}
          onChange={(value) => setReadingLevel(value as ReadingLevel)}
        />
        <ToolToggle
          icon="Search"
          tone="support"
          pressed={keyWordsOpen}
          aria-controls={keyWordsOpen ? keyWordsId : undefined}
          onClick={() => setKeyWordsOpen((open) => !open)}
        >
          {t('lessonPlayer.read.keyWords')}
        </ToolToggle>
      </div>
      {/* English lessons simply hide Listen without a voice or recordings; a translated lesson says why it isn't there. */}
      {!voice && !recording && voicesListed && contentLocale.content ? (
        <p className="tw-read-listen-note">{t('lessonPlayer.read.listenNoVoice')}</p>
      ) : null}
      {listen.unavailable ? (
        <p className="tw-read-listen-note" role="status">
          {t('lessonPlayer.read.listenUnavailable')}
        </p>
      ) : null}
      {/* Plays the recordings; never shown (the ListenBar is the controls). Its captions are the
          reading itself: the part on screen, with the sentence being played marked. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="auto" hidden className="tw-read-audio" />

      {keyWordsOpen ? <KeyWordsPanel id={keyWordsId} glossary={glossary} /> : null}

      <WarmUp />
      <LessonEvidence evidence={lesson.evidence} visual={lesson.visual} />
      {/* A course's own activity, where its lesson file puts it (src/lesson/extras.tsx); nothing in Our World. */}
      <LessonSlot name="read:after-evidence" />

      {listening ? (
        <div ref={listenBarRef} id={listenBarId}>
          <ListenBar
            state={listen.state === 'paused' ? 'paused' : 'playing'}
            speed={settings.listeningSpeed}
            label={t(listen.loading ? 'lessonPlayer.read.listenLoading' : 'lessonPlayer.read.listenLabel', { n: part, total })}
            onPlayPause={() => (listen.state === 'playing' ? listen.pause() : listen.play())}
            onSpeedChange={setListeningSpeed}
            onStop={() => {
              listen.stop();
              focusListenTool();
            }}
          />
        </div>
      ) : null}

      <div ref={readingRef} className="tw-read-part">
        <ReadingCard
          part={t(simpler ? 'lessonPlayer.read.partSimpler' : 'lessonPlayer.read.partLabel', { n: part, total })}
          heading={section.heading}
        >
          {/* Keyed by part and version so open definitions close when either changes. */}
          <ReadingPassage key={`${part}-${readingLevel}`} text={text} glossary={glossary} highlight={highlight} />
        </ReadingCard>
      </div>

      <StageActionBar
        back={part > 1 ? t('lessonPlayer.read.backPart', { n: part - 1 }) : null}
        onBack={part > 1 ? () => setView(part - 1) : undefined}
        next={isLast ? t('lessonPlayer.read.nextCheck') : t('lessonPlayer.read.nextPart', { n: part + 1 })}
        nextStep={null}
        onNext={() => setView(isLast ? 'check' : part + 1)}
        helper={hasGlossaryTerms(text, glossary, contentLocale.code) ? t('lessonPlayer.read.glossaryHelper') : undefined}
      />
    </div>
  );
}
