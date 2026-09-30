/**
 * The certificate itself: the sheet with the mascot and wordmark, the name,
 * what was finished, the section's lessons (or the course's four sections),
 * the date and a line for a teacher to sign. Its layout, on screen and on one
 * landscape page (`@page tw-certificate`), is in ./CertificatePage.css.
 *
 * Shown on a certificate's own page (./CertificatePage.tsx, with an h1) and,
 * several to a page, on "Print all certificates"
 * (src/pages/educators/AllCertificatesPage.tsx, with h2s). Its ids come from
 * useId, so any number can share a page.
 */
import { useId } from 'react';
import { SectionBadge } from '../../components/ds';
import { englishCatalog, type Catalog, type LessonSummary, type Section } from '../../content/catalog';
import { useCatalog } from '../../content/useCatalog';
import { En, useI18n } from '../../i18n';

const MASCOT_SRC = '/images/thinkerwell-mascot-transparent.png';

export type CertificateScope = { kind: 'section'; section: Section } | { kind: 'course' };

/** The lessons a certificate is for: a section's, or all 24. */
export function certificateLessons(scope: CertificateScope, catalog: Catalog = englishCatalog): readonly LessonSummary[] {
  return scope.kind === 'section' ? catalog.getSectionLessons(scope.section.id) : catalog.getLessons();
}

/** How big the name is printed: smaller for a longer name, so it stays on two lines at most. */
export function certificateNameSize(name: string): 'l' | 'm' | 's' {
  const length = name.trim().length;
  return length <= 22 ? 'l' : length <= 36 ? 'm' : 's';
}

export interface CertificateProps {
  scope: CertificateScope;
  /** The name to print. Blank leaves a line to write one on by hand. */
  name: string;
  /** When the last of its lessons was finished (the date printed). */
  finishedAt: string;
  /**
   * 1 on a certificate's own page, where "Certificate" is the page's heading;
   * 2 where several certificates share a page under its own h1.
   */
  headingLevel?: 1 | 2;
  /** The certificate's accessible name, where "Certificate" alone wouldn't tell several apart. */
  label?: string;
}

export function Certificate({ scope, name, finishedAt, headingLevel = 1, label }: CertificateProps) {
  const { t, tx, formatDate } = useI18n();
  const catalog = useCatalog();
  const titleId = useId();
  const shownName = name.trim();
  // Course text (the course's and a section's names) stays marked as English.
  const course = <En>{catalog.getCourse().course.title}</En>;
  const date = formatDate(finishedAt, { day: 'numeric', month: 'long', year: 'numeric' });
  const Title = headingLevel === 1 ? 'h1' : 'h2';

  return (
    <article className="tw-cert" aria-labelledby={label ? undefined : titleId} aria-label={label}>
      <header className="tw-cert-head">
        <p className="tw-cert-brand">
          <img className="tw-cert-mascot" src={MASCOT_SRC} alt="" width={422} height={423} />
          <span className="tw-cert-wordmark">{t('app.name')}</span>
        </p>
        <Title id={titleId} className="tw-cert-title" tabIndex={headingLevel === 1 ? -1 : undefined}>
          {t('certificates.sheet.title')}
        </Title>
      </header>

      <div className="tw-cert-who">
        {shownName ? (
          <p className={`tw-cert-name tw-cert-name-${certificateNameSize(shownName)}`}>{shownName}</p>
        ) : (
          // No name: a line to write one on by hand.
          <div className="tw-cert-name-blank">
            <p className="tw-cert-line" />
            <p className="tw-cert-label">{t('certificates.sheet.blankName')}</p>
          </div>
        )}
        <p className="tw-cert-finished">
          {scope.kind === 'section'
            ? tx('certificates.sheet.finishedSection', { section: <En>{scope.section.title}</En>, course })
            : tx('certificates.sheet.finishedCourse', { count: catalog.getLessons().length, course })}
        </p>
      </div>

      {scope.kind === 'section' ? (
        <SectionLessons section={scope.section} headingLevel={headingLevel} />
      ) : (
        <CourseSections />
      )}

      <footer className="tw-cert-foot">
        <div className="tw-cert-signs">
          <div className="tw-cert-sign">
            <p className="tw-cert-line">{date}</p>
            <p className="tw-cert-label">{t('certificates.sheet.date')}</p>
          </div>
          <div className="tw-cert-sign">
            <p className="tw-cert-line" />
            <p className="tw-cert-label">{t('certificates.sheet.signature')}</p>
          </div>
        </div>
        <p className="tw-cert-about">{tx('certificates.sheet.about', { course })}</p>
      </footer>
    </article>
  );
}

/** A section certificate's contents: the section (its colour only beside its icon and name) and its lessons. */
function SectionLessons({ section, headingLevel }: { section: Section; headingLevel: 1 | 2 }) {
  const { contentLang } = useI18n();
  const catalog = useCatalog();
  const headingId = useId();
  const Heading = headingLevel === 1 ? 'h2' : 'h3';
  return (
    <section className="tw-cert-contents" aria-labelledby={headingId}>
      <Heading id={headingId} className="tw-cert-contents-title">
        <SectionBadge section={section.id} number={section.number} name={<En>{section.title}</En>} />
      </Heading>
      <ol className="tw-cert-lessons" role="list">
        {catalog.getSectionLessons(section.id).map((lesson) => (
          <li key={lesson.id}>
            <span className="tw-cert-lesson-number">{lesson.number}</span>
            <span {...contentLang}>{lesson.title}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The course certificate's contents: the four sections. */
function CourseSections() {
  const catalog = useCatalog();
  return (
    <ul className="tw-cert-sections" role="list">
      {catalog.getSections().map((section) => (
        <li key={section.id}>
          <SectionBadge section={section.id} number={section.number} name={<En>{section.title}</En>} />
        </li>
      ))}
    </ul>
  );
}
