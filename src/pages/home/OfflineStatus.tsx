import { settingsPath } from '../../app/lessonUrls';
import { DEFAULT_COURSE_ID } from '../../content/courses';
import { Badge, Button } from '../../components/ds';
import { useI18n } from '../../i18n';
import { useServiceWorker } from '../../offline';
import { useSavedCourses } from '../../offline/useSavedCourses';
import type { PlatformCourse } from './platformProgress';

/**
 * How much of the platform works with no internet on this device. Our World
 * is saved by the first visit; each other course is counted once all of it is
 * saved (Settings' "Courses for offline use"), so the number never promises
 * a lesson that wouldn't open. Nothing shows where this browser can't keep it.
 */
export default function OfflineStatus({ courses }: { courses: readonly PlatformCourse[] }) {
  const { t } = useI18n();
  const { offline } = useServiceWorker();
  const others = courses.filter((course) => course.id !== DEFAULT_COURSE_ID);
  const saved = useSavedCourses(others.map((course) => course.id));
  const total = courses.reduce((sum, course) => sum + course.lessonIds.length, 0);

  if (offline === 'preparing') {
    return (
      <div className="tw-dash-offline">
        <Badge tone="outline" icon="Clock">
          {t('pages.home.dashboard.offlinePreparingBadge')}
        </Badge>
      </div>
    );
  }
  if (offline !== 'ready' || saved === null) return null;

  const ready = courses.reduce((sum, course) => sum + (course.id === DEFAULT_COURSE_ID || saved.has(course.id) ? course.lessonIds.length : 0), 0);
  const all = ready === total;
  return (
    <div className="tw-dash-offline">
      <Badge tone="outline" icon="Download">
        {all ? t('pages.home.dashboard.offlineBadge', { count: total }) : t('pages.home.dashboard.offlinePartBadge', { ready, total })}
      </Badge>
      {all ? null : (
        <Button variant="secondary" icon="Download" href={settingsPath('course-files')}>
          {t('pages.home.dashboard.offlineSaveLink')}
        </Button>
      )}
      <p className="small">{t(all ? 'pages.home.dashboard.offlineHelpDone' : 'pages.home.dashboard.offlineHelp')}</p>
    </div>
  );
}
