import { useState } from 'react';
import { usePageTitle } from '../app/usePageTitle';
import { lessonPrintPath } from '../app/lessonUrls';
import { Badge, Button, Chip, Icon } from '../components/ds';
import { getLessons, getSectionLessons, getSections, type SectionId } from '../content';
import { useI18n } from '../i18n';
import './EducatorsPage.css';
import { EducatorLessonRow } from './educators/EducatorLessonRow';
import { SECTION_ICONS } from './course/sectionIcons';

/**
 * For educators (docs/screens/Educators.dc.html): what a teacher or
 * volunteer needs to run a session, how one works, and every lesson to
 * preview (with its teaching notes and sources, docs/PRODUCT.md). Collects
 * nothing: "Tell us what to fix" keeps the "[FEEDBACK EMAIL]" placeholder
 * visible rather than a form (CLAUDE.md's no-accounts-no-collection rule).
 */
export function EducatorsPage() {
  const { t } = useI18n();
  usePageTitle(t('pages.educators.title'));
  const sections = getSections();
  const [sectionId, setSectionId] = useState<SectionId>(sections[0]!.id);
  const lessons = getSectionLessons(sectionId);
  const firstLessonId = getLessons()[0]!.id;

  return (
    <div className="tw-edu-page">
      <section className="tw-edu-hero">
        <div className="tw-edu-hero-text">
          <span className="eyebrow">{t('pages.educators.eyebrow')}</span>
          <h1 className="h1" tabIndex={-1}>
            {t('pages.educators.title')}
          </h1>
          <p className="h2 tw-edu-tagline">{t('pages.educators.heroTitle')}</p>
          <p className="body-lg">{t('pages.educators.heroBody')}</p>
          <div className="tw-edu-hero-actions">
            <Button variant="primary" size="lg" icon="Eye" href="#preview-lessons">
              {t('pages.educators.previewLesson')}
            </Button>
            <Button variant="secondary" size="lg" icon="Printer" href={lessonPrintPath(firstLessonId)}>
              {t('pages.educators.printLesson')}
            </Button>
          </div>
        </div>
        <aside aria-labelledby="need-title" className="tw-edu-need">
          <h2 id="need-title" className="h3">
            {t('pages.educators.needTitle')}
          </h2>
          <span className="tw-edu-need-item">
            <Icon name="Users" size={22} />
            {t('pages.educators.need1')}
          </span>
          <span className="tw-edu-need-item">
            <Icon name="Pencil" size={22} />
            {t('pages.educators.need2')}
          </span>
          <span className="tw-edu-need-item">
            <Icon name="Clock" size={22} />
            {t('pages.educators.need3')}
          </span>
          <span className="tw-edu-need-item">
            <Icon name="WifiOff" size={22} />
            {t('pages.educators.need4')}
          </span>
          <Button variant="ghost" icon="Settings" href="/settings" className="tw-edu-need-settings">
            {t('pages.educators.settingsLink')}
          </Button>
        </aside>
      </section>

      <section aria-labelledby="how-title" className="tw-edu-section">
        <h2 id="how-title" className="h2">
          {t('pages.educators.howTitle')}
        </h2>
        <ol className="tw-edu-steps">
          <li className="tw-edu-step">
            <span className="tw-edu-step-n">1</span>
            <span className="h3">{t('pages.educators.step1Title')}</span>
            <span>{t('pages.educators.step1Body')}</span>
          </li>
          <li className="tw-edu-step">
            <span className="tw-edu-step-n">2</span>
            <span className="h3">{t('pages.educators.step2Title')}</span>
            <span>{t('pages.educators.step2Body')}</span>
          </li>
          <li className="tw-edu-step">
            <span className="tw-edu-step-n">3</span>
            <span className="h3">{t('pages.educators.step3Title')}</span>
            <span>{t('pages.educators.step3Body')}</span>
          </li>
        </ol>
      </section>

      <section id="preview-lessons" aria-labelledby="preview-title" className="tw-edu-section">
        <div className="tw-edu-section-head">
          <h2 id="preview-title" className="h2">
            {t('pages.educators.previewTitle')}
          </h2>
          <span className="small tw-edu-preview-note">{t('pages.educators.previewNote')}</span>
        </div>
        <div role="radiogroup" aria-label={t('pages.educators.sectionLabel')} className="tw-edu-chips">
          {sections.map((section) => (
            <Chip
              key={section.id}
              role="radio"
              icon={SECTION_ICONS[section.id]}
              selected={section.id === sectionId}
              onClick={() => setSectionId(section.id)}
            >
              {section.title}
            </Chip>
          ))}
        </div>
        <div className="tw-edu-lessons">
          {lessons.map((lesson) => (
            <EducatorLessonRow key={lesson.id} lesson={lesson} />
          ))}
        </div>
      </section>

      <div className="tw-edu-cards">
        <section aria-labelledby="codes-title" className="tw-edu-card">
          <Badge tone="lavender">{t('pages.educators.codesTag')}</Badge>
          <h2 id="codes-title" className="h3">
            {t('pages.educators.codesTitle')}
          </h2>
          <p>{t('pages.educators.codesBody')}</p>
        </section>
        <section aria-labelledby="fb-title" className="tw-edu-card tw-edu-card-feedback">
          <h2 id="fb-title" className="h3">
            {t('pages.educators.feedbackTitle')}
          </h2>
          <p>{t('pages.educators.feedbackBody')}</p>
          <span className="tw-edu-feedback-email">{t('pages.educators.feedbackEmail')}</span>
        </section>
      </div>
    </div>
  );
}
