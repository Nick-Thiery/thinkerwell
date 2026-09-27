/**
 * Read (docs/screens/LessonRead.dc.html, TabletLesson.dc.html,
 * LessonCheck.dc.html): the reading tools, the warm-up, the evidence, then
 * the reading one part at a time, then the quick check. One template for
 * every lesson; all lesson text comes from `lesson` (content/lessons/*.json).
 *
 * - The current part is in the URL (?part=1..n, ?part=check), see useReadPart.
 * - Standard / Simpler follows the player's readingLevel (remembered per
 *   learner). The part's text and its glossary marking use the version on
 *   screen; so will Listen (phase 5), which goes in the two places marked
 *   below.
 * - The lesson's picture is part of the evidence (LessonEvidence), right
 *   after the warm-up.
 * - When Read counts as done is decided in src/lesson/progressRules.ts: every
 *   choice question answered, or Continue from the quick check.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { ReadingCard, SegmentedControl, ToolToggle } from '../../../components/ds';
import { useI18n } from '../../../i18n';
import { useLessonPlayer } from '../../../lesson';
import type { ReadingLevel } from '../../../storage';
import { LessonEvidence } from '../evidence/LessonEvidence';
import { StageActionBar } from '../StageActionBar';
import { KeyWordsPanel } from './KeyWordsPanel';
import { QuickCheck } from './QuickCheck';
import { ReadingPassage } from './ReadingPassage';
import { hasGlossaryTerms, visibleSectionText } from './readingPieces';
import { useReadPart, type ReadView } from './useReadPart';
import { WarmUp } from './WarmUp';
import './ReadStage.css';

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The Read stage, as LessonPage renders it. */
export function ReadStage() {
  const { t } = useI18n();
  const { lesson, readingLevel, setReadingLevel } = useLessonPlayer();
  const sections = lesson.read.sections;
  const glossary = lesson.read.glossary;
  const total = sections.length;
  const [view, setView] = useReadPart(total);
  const [keyWordsOpen, setKeyWordsOpen] = useState(false);
  const keyWordsId = useId();

  const readingRef = useRef<HTMLDivElement>(null);
  const checkHeadingRef = useRef<HTMLHeadingElement>(null);

  // When the part changes (not on first load), bring the new part into view
  // and move focus to its heading, so keyboard and screen-reader users land
  // on what just appeared.
  const shownView = useRef<ReadView>(view);
  useEffect(() => {
    if (shownView.current === view) return;
    shownView.current = view;
    const scrollTarget = view === 'check' ? checkHeadingRef.current?.closest<HTMLElement>('.tw-read-check') : readingRef.current;
    const heading =
      view === 'check' ? checkHeadingRef.current : readingRef.current?.querySelector<HTMLElement>('.tw-reading-h');
    if (scrollTarget && typeof scrollTarget.scrollIntoView === 'function') {
      scrollTarget.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }, [view]);

  if (view === 'check') {
    return <QuickCheck headingRef={checkHeadingRef} onBack={() => setView(total)} />;
  }

  const part = view;
  const section = sections[part - 1]!;
  const text = visibleSectionText(section, readingLevel);
  const simpler = readingLevel === 'simpler';
  const isLast = part === total;

  return (
    <div className="tw-read">
      <div role="toolbar" aria-label={t('lessonPlayer.read.toolsLabel')} className="tw-read-tools">
        {/* Phase 5: the Listen ToolToggle goes here, first, before the level switch (LessonRead.dc.html). */}
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

      {keyWordsOpen ? <KeyWordsPanel id={keyWordsId} glossary={glossary} /> : null}

      <WarmUp />
      <LessonEvidence evidence={lesson.evidence} visual={lesson.visual} />

      {/* Phase 5: the ListenBar goes here, just above the reading, while Listen is on. */}

      <div ref={readingRef} className="tw-read-part">
        <ReadingCard
          part={t(simpler ? 'lessonPlayer.read.partSimpler' : 'lessonPlayer.read.partLabel', { n: part, total })}
          heading={section.heading}
        >
          {/* Keyed by part and version so open definitions close when either changes. */}
          <ReadingPassage key={`${part}-${readingLevel}`} text={text} glossary={glossary} />
        </ReadingCard>
      </div>

      <StageActionBar
        back={part > 1 ? t('lessonPlayer.read.backPart', { n: part - 1 }) : null}
        onBack={part > 1 ? () => setView(part - 1) : undefined}
        next={isLast ? t('lessonPlayer.read.nextCheck') : t('lessonPlayer.read.nextPart', { n: part + 1 })}
        nextStep={null}
        onNext={() => setView(isLast ? 'check' : part + 1)}
        helper={hasGlossaryTerms(text, glossary) ? t('lessonPlayer.read.glossaryHelper') : undefined}
      />
    </div>
  );
}
