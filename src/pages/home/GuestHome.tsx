import { lessonPath } from '../../app/lessonUrls';
import type { Lesson } from '../../content';
import { Button, ContinueCard } from '../../components/ds';
import { useI18n } from '../../i18n';

export interface GuestHomeProps {
  lesson1: Lesson;
}

/** Look-around mode's home: browse without saving, pointed straight at Lesson 1. */
export function GuestHome({ lesson1 }: GuestHomeProps) {
  const { t } = useI18n();
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
