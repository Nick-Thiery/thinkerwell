import { lessonPath, teacherGuidePath } from '../../app/lessonUrls';
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
 * Below it, the lesson's teacher guide (/educators/lesson/:id), which has
 * its teaching notes (sensitive topics first) and sources along with the
 * session plan and the answers. It replaces the list's old "Show teaching
 * notes and sources" disclosure, which held a part of the same.
 */
export function EducatorLessonRow({ lesson }: EducatorLessonRowProps) {
  const { t } = useI18n();
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
      <Button
        variant="ghost"
        icon="GraduationCap"
        href={teacherGuidePath(lesson.id)}
        aria-label={t('pages.educators.teacherGuideLabel', { number: lesson.number })}
        className="tw-edu-lesson-guide"
      >
        {t('pages.educators.teacherGuide')}
      </Button>
    </div>
  );
}
