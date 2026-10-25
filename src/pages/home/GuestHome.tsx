import { lessonPath } from '../../app/lessonUrls';
import type { LessonSummary } from '../../content/catalog';
import { Button, ContinueCard } from '../../components/ds';
import { useCatalog } from '../../content/useCatalog';
import { useI18n } from '../../i18n';

export interface GuestHomeProps {
  lesson1: LessonSummary;
}

/** Look-around mode's home: browse without saving, pointed straight at LessonSummary 1. */
export function GuestHome({ lesson1 }: GuestHomeProps) {
  const { t } = useI18n();
  const catalog = useCatalog();
  return (
    <div className="tw-home-message">
      <h1 className="h1" tabIndex={-1}>
        {t('pages.home.guest.title')}
      </h1>
      <p className="body-lg">{t('pages.home.guest.body')}</p>
      <ContinueCard
        title={lesson1.title}
        eyebrow={t('pages.home.dashboard.startHere')}
        current="read"
        stages={catalog.stagesFor(lesson1)}
        stageLabel={t('lesson.nextStep', { stage: t('stages.read') })}
        cta={t('pages.home.dashboard.startCta')}
        href={lessonPath(lesson1.id, 'read')}
      />
      <Button variant="secondary" href="/course">
        {t('pages.home.dashboard.finishedCta')}
      </Button>
    </div>
  );
}
