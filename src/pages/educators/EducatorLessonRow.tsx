import { useState } from 'react';
import { lessonPath } from '../../app/lessonUrls';
import { Button, LessonRow } from '../../components/ds';
import type { Lesson } from '../../content';
import { useI18n } from '../../i18n';
import './EducatorLessonRow.css';

interface EducatorLessonRowProps {
  lesson: Lesson;
}

/**
 * One lesson in the Educators preview list: LessonRow itself, opening the
 * lesson with `?preview=true` so it starts look-around no matter who (if
 * anyone) is chosen on this device — "Previews never save anything"
 * (docs/screens/Educators.dc.html) has to hold even when a learner is
 * mid-lesson on the same device.
 *
 * Below it, a disclosure for the lesson's teaching notes and sources
 * (docs/PRODUCT.md: `educatorNotes` and `sources` reach the bundle "for the
 * Educators page... where the sources are meant to be shown"), closed by
 * default so the list stays scannable. Left out entirely for a lesson with
 * neither.
 */
export function EducatorLessonRow({ lesson }: EducatorLessonRowProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const hasNotes = lesson.sensitiveNotes.length > 0 || lesson.educatorNotes.length > 0 || lesson.sources.length > 0;
  const bodyId = `${lesson.id}-notes`;
  const [min, max] = lesson.estimatedMinutes;

  return (
    <div className="tw-edu-lesson">
      <LessonRow
        number={lesson.number}
        title={lesson.title}
        question={lesson.essentialQuestion}
        time={t('lesson.minutes', { min, max })}
        cta={t('pages.educators.previewCta')}
        href={`${lessonPath(lesson.id)}?preview=true`}
      />
      {hasNotes ? (
        <>
          <Button variant="ghost" size="md" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={bodyId}>
            {t(open ? 'pages.educators.notesHide' : 'pages.educators.notesShow')}
          </Button>
          <div id={bodyId} hidden={!open} className="tw-edu-notes">
            {lesson.sensitiveNotes.length > 0 ? (
              <div className="tw-edu-notes-part">
                <p className="small tw-edu-notes-title">{t('pages.educators.sensitiveTitle')}</p>
                <ul>
                  {lesson.sensitiveNotes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {lesson.educatorNotes.length > 0 ? (
              <div className="tw-edu-notes-part">
                <p className="small tw-edu-notes-title">{t('pages.educators.notesTitle')}</p>
                <ul>
                  {lesson.educatorNotes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {lesson.sources.length > 0 ? (
              <div className="tw-edu-notes-part">
                <p className="small tw-edu-notes-title">{t('pages.educators.sourcesTitle')}</p>
                <ul>
                  {lesson.sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
