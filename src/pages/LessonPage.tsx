import type { Lesson, LessonStep } from '../content';
import { useI18n } from '../i18n';
import { PlaceholderPage } from './PlaceholderPage';

interface LessonPageProps {
  lesson: Lesson;
  step: LessonStep;
}

/** One stage of a lesson (or the "complete" step). The lesson player comes in phase 4. */
export function LessonPage({ lesson, step }: LessonPageProps) {
  const { t } = useI18n();
  return (
    <PlaceholderPage title={t('pages.lesson.title', { number: lesson.number, stage: t(`stages.${step}`) })}>
      <p className="body">{lesson.title}</p>
    </PlaceholderPage>
  );
}
