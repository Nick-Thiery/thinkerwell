/**
 * What the consent form and the information sheet both say about the pilot
 * study, from the same messages (pages.pilotStudy), so the two printouts
 * can never promise different things: what the study involves, and what is
 * kept and what isn't. These are promises to families; the measurement
 * build must keep to them, or they change first (docs/notes/partner-kit.md).
 *
 * Also the line to write on that both use where staff left a box empty.
 */
import type { ReactNode } from 'react';
import { useI18n, type MessageKey } from '../../i18n';

/** A line to write on, with the words for it read out to screen readers. */
export function Blank({ label, wide }: { label: string; wide?: boolean }) {
  return (
    <span className={wide ? 'tw-consent-blank tw-consent-blank-wide' : 'tw-consent-blank'}>
      <span className="tw-visually-hidden">{label}</span>
    </span>
  );
}

/** Text staff typed (a name, a date), never translated by us or by the browser; a line to write on when they left it empty. */
export function typedOrBlank(value: string, blankLabel: string): ReactNode {
  const text = value.trim();
  return text ? <strong translate="no">{text}</strong> : <Blank label={blankLabel} />;
}

const STUDY_STEPS: readonly MessageKey[] = ['pages.pilotStudy.questions', 'pages.pilotStudy.writing', 'pages.pilotStudy.faces'];

/** What the study involves: the first and last sessions, what the site notes, and that none of it is a test. */
export function StudyParts() {
  const { t } = useI18n();
  return (
    <>
      <p>{t('pages.pilotStudy.intro')}</p>
      <ul className="tw-consent-list">
        {STUDY_STEPS.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
      <p>{t('pages.pilotStudy.site')}</p>
      <p>{t('pages.pilotStudy.notTest')}</p>
    </>
  );
}

/** What is kept and what isn't, with the organisation's name (or a line for it) where the list names it. */
export function KeepList({ organisation }: { organisation: ReactNode }) {
  const { t, tx } = useI18n();
  const items: ReactNode[] = [
    // An example code, on one line ("HLP-" at the end of one line and "01" on the next would read as two things).
    tx('pages.pilotStudy.keepCode', {
      code: (
        <span className="tw-consent-code" translate="no">
          HLP-01
        </span>
      ),
    }),
    tx('pages.pilotStudy.keepList', { organisation }),
    t('pages.pilotStudy.keepNeverAsk'),
    t('pages.pilotStudy.keepNoDocuments'),
    t('pages.pilotStudy.keepNoPhotos'),
    t('pages.pilotStudy.keepDevice'),
    tx('pages.pilotStudy.keepGroup', { organisation }),
    t('pages.pilotStudy.keepDelete'),
    // The Watch step's own button, in the language on screen.
    t('pages.pilotStudy.keepVideo', { readInstead: t('lessonPlayer.watch.readInstead') }),
  ];
  return (
    <ul className="tw-consent-list">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
