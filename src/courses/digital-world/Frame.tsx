import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Badge, Icon, StatusBanner } from '../../components/ds';
import { useCatalog } from '../../content/useCatalog';
import { CourseContentProvider } from '../../content/useContent';
import { SOURCE_LOCALE, useI18n } from '../../i18n';
import { useLearnerSession } from '../../session';
import type { OurWorldName } from '../types';
import { COURSE_ID, COURSE_PATH, digitalWorld } from './content';
import { CourseWords } from './i18n';

const OurWorldContext = createContext<OurWorldName>({ title: '', lang: {} });

/**
 * Every Digital World page: its own words and English lessons
 * (./i18n.tsx), its content for the shared lesson pages
 * (CourseContentProvider), and on screen the draft banner above the page.
 * Our World's title is read here, before the course's words take over, so
 * the course choice shows it in the language on screen.
 */
export function DigitalWorldFrame({ children, banner = true }: { children: ReactNode; banner?: boolean }) {
  const { contentLang } = useI18n();
  const title = useCatalog().getCourse().course.title;
  const ourWorld = useMemo(() => ({ title, lang: contentLang }), [title, contentLang]);
  return (
    <OurWorldContext.Provider value={ourWorld}>
      <CourseWords>
        <CourseContentProvider value={digitalWorld}>
          {banner ? <DraftBanner /> : null}
          {children}
        </CourseContentProvider>
      </CourseWords>
    </OurWorldContext.Provider>
  );
}

/** Our World's title in the language on screen (inside DigitalWorldFrame). */
export function useOurWorldName(): OurWorldName {
  return useContext(OurWorldContext);
}

/**
 * "Draft course: not yet reviewed", on every Digital World page, with a
 * way to turn the preview off (which goes back to Our World's map). Never
 * printed: the sheets carry their own note (DraftSheetNote).
 */
export function DraftBanner() {
  const { t, locale } = useI18n();
  const { setPreviewCourse } = useLearnerSession();
  const navigate = useNavigate();
  return (
    <div className="tw-dw-banner tw-no-print">
      <StatusBanner
        tone="info"
        icon="Info"
        title={t('digitalWorld.banner.title')}
        action={t('digitalWorld.banner.turnOff')}
        onAction={() => {
          void navigate('/course');
          setPreviewCourse(COURSE_ID, false).catch((error: unknown) => {
            if (import.meta.env.DEV) console.error(error);
          });
        }}
      >
        {/* In another language the interface is translated but the lessons are English for now: say so. */}
        {t(locale === SOURCE_LOCALE ? 'digitalWorld.banner.body' : 'digitalWorld.banner.bodyEnglishLessons')}
      </StatusBanner>
    </div>
  );
}

/** The draft note at the top of each printed sheet (the print view, the teacher guide). */
export function DraftSheetNote() {
  const { t } = useI18n();
  return (
    <p className="tw-dw-sheet-note">
      <strong>{t('digitalWorld.sheet.draft')}</strong>
    </p>
  );
}

/**
 * The course choice: Our World first, then Digital World, marked as a
 * draft. On a course map the course shown is the current page.
 */
export function CourseChoice({ ourWorld, current }: { ourWorld: OurWorldName; current?: string }) {
  const { t, contentLang } = useI18n();
  const title = digitalWorld.getCourse().course.title;
  const labelId = `tw-dw-choice-${current ?? 'home'}`;
  return (
    <nav className="tw-dw-choice tw-no-print" aria-labelledby={labelId}>
      <span id={labelId} className="eyebrow tw-dw-choice-label">
        {t('digitalWorld.choice.label')}
      </span>
      <ul className="tw-dw-choice-list" role="list">
        <li>
          <Link to="/course" className="tw-dw-choice-link" aria-current={current === 'our-world' ? 'page' : undefined}>
            <Icon name="Globe" size={20} />
            <span {...ourWorld.lang}>{ourWorld.title}</span>
          </Link>
        </li>
        <li>
          <Link to={COURSE_PATH} className="tw-dw-choice-link" aria-current={current === COURSE_ID ? 'page' : undefined}>
            <Icon name="Lightbulb" size={20} />
            <span {...contentLang}>{title}</span>
            <Badge tone="outline">{t('digitalWorld.choice.draft')}</Badge>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
