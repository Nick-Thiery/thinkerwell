/**
 * "Courses for offline use" in Settings (/settings#course-files), for
 * teachers: saving the courses other than Our World on the device at once, on
 * good Wi-Fi, so they open with no internet (src/offline/courseFiles.ts).
 * Our World is saved by the first visit; these are built apart so that a
 * first visit stays small.
 *
 * - Lists each course this device shows with how much of it is on the device:
 *   saved, partly saved (a learner opened some of it) or not saved.
 * - One button saves them all (a download that stops, or breaks off, carries
 *   on where it was); progress can be stopped and what has arrived stays.
 * - Offered only once the site itself is kept on the device, and not while
 *   Save data is on: it says so. Nothing downloads until it is tapped.
 * - Pictures, lessons and the pages are saved here; Listen's recordings and
 *   videos are not (see "Lesson audio" below, and videos need the internet).
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { SettingsPart } from '../../app/lessonUrls';
import { Button } from '../../components/ds';
import { courseSummaries } from '../../content/catalog';
import { useI18n, type MessageKey } from '../../i18n';
import { isSaveDataOn, useServiceWorker } from '../../offline';
import {
  canKeepCourses,
  downloadCourses,
  filesOfCourse,
  loadCourseManifest,
  storedCourseFiles,
  totalBytes,
  type CourseDownloadResult,
} from '../../offline/courseFiles';
import type { CourseFilesManifest } from '../../offline/courseCache';
import { useLearnerSession } from '../../session';
import type { DeviceSettingsState } from './useDeviceSettings';

const COURSE_FILES_PART: SettingsPart = 'course-files';

const STATE_TEXT: Record<'saved' | 'part' | 'none', MessageKey> = {
  saved: 'pages.settings.courseFiles.stateSaved',
  part: 'pages.settings.courseFiles.statePart',
  none: 'pages.settings.courseFiles.stateNone',
};

const RESULT_TEXT: Record<Exclude<CourseDownloadResult, 'done'>, MessageKey> = {
  stopped: 'pages.settings.courseFiles.stopped',
  failed: 'pages.settings.courseFiles.failed',
};

interface CourseState {
  id: string;
  total: number;
  stored: number;
}

export function CourseFilesSetting({ deviceSettings }: { deviceSettings: DeviceSettingsState }) {
  const { t, tx, contentLang, contentLocale } = useI18n();
  const { settings } = deviceSettings;
  const { previewCourses } = useLearnerSession();
  const { offline } = useServiceWorker();
  const headingId = useId();
  const [manifest, setManifest] = useState<CourseFilesManifest | null>(null);
  const [courses, setCourses] = useState<CourseState[] | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<CourseDownloadResult | null>(null);
  const stopper = useRef<AbortController | null>(null);
  const idsKey = previewCourses.join(' ');

  useEffect(() => {
    const controller = new AbortController();
    void loadCourseManifest(controller.signal).then((loaded) => {
      if (!controller.signal.aborted) setManifest(loaded);
    });
    return () => controller.abort();
  }, []);

  const ids = useMemo(() => (idsKey ? idsKey.split(' ') : []), [idsKey]);
  const allFiles = useMemo(() => (manifest ? [...new Map(ids.flatMap((id) => filesOfCourse(manifest, id)).map((file) => [file.url, file])).values()] : []), [manifest, ids]);

  useEffect(() => {
    if (!manifest) return undefined;
    let current = true;
    void Promise.all(
      ids.map(async (id): Promise<CourseState> => {
        const files = filesOfCourse(manifest, id);
        const own = manifest.courses[id] ?? [];
        // A course counts what is its own; what the courses share is saved with every course.
        const stored = await storedCourseFiles(own);
        return { id, total: totalBytes(files), stored: stored.bytes };
      }),
    ).then((next) => {
      if (current) setCourses(next);
    });
    return () => {
      current = false;
    };
  }, [manifest, ids, result]);

  // Leaving the page stops a download (what has arrived stays).
  useEffect(() => () => stopper.current?.abort(), []);

  if (ids.length === 0 || !manifest || allFiles.length === 0) return null;

  const total = totalBytes(allFiles);
  const size = (bytes: number) => (bytes < 10_000_000 ? Math.round(bytes / 100_000) / 10 : Math.round(bytes / 1_000_000));
  const saveData = isSaveDataOn(settings?.saveData ?? null);
  const supported = canKeepCourses() && offline !== 'unsupported';
  const ready = offline === 'ready';
  const downloading = progress !== null;
  const ownTotals = new Map(ids.map((id) => [id, totalBytes(manifest.courses[id] ?? [])]));
  const allSaved = courses !== null && courses.every((course) => course.stored >= (ownTotals.get(course.id) ?? 0));

  const start = () => {
    const controller = new AbortController();
    stopper.current = controller;
    setResult(null);
    setProgress(0);
    void downloadCourses(allFiles, { signal: controller.signal, onProgress: ({ done }) => setProgress(done) }).then((outcome) => {
      if (stopper.current === controller) stopper.current = null;
      setProgress(null);
      setResult(outcome);
    });
  };
  const stop = () => stopper.current?.abort();

  return (
    <section id={COURSE_FILES_PART} className="tw-settings-card" aria-labelledby={headingId}>
      <h2 id={headingId} className="tw-settings-h2" tabIndex={-1}>
        {t('pages.settings.courseFiles.title')}
      </h2>
      <p className="tw-settings-text">{t('pages.settings.courseFiles.intro')}</p>
      <p className="tw-settings-text">{t('pages.settings.courseFiles.size', { size: size(total) })}</p>

      {!supported ? (
        <p className="tw-settings-status">{t('pages.settings.courseFiles.unsupported')}</p>
      ) : (
        <div className="tw-settings-field tw-lesson-audio">
          <ul className="tw-settings-list" role="list">
            {(courses ?? []).map((course) => {
              const own = ownTotals.get(course.id) ?? 0;
              const summary = courseSummaries[course.id];
              const translated = summary?.titles[contentLocale.code];
              const name = translated ?? summary?.titles.en ?? course.id;
              const state = course.stored >= own ? 'saved' : course.stored === 0 ? 'none' : 'part';
              return (
                <li key={course.id}>
                  {tx(STATE_TEXT[state], { course: <span {...(translated ? contentLang : {})}>{name}</span>, size: size(own) })}
                </li>
              );
            })}
          </ul>
          <p className="tw-settings-status" role="status">
            {downloading ? t('pages.settings.courseFiles.progress', { done: size(progress), total: size(total) }) : allSaved ? t('pages.settings.courseFiles.savedAll') : ''}
          </p>
          {downloading ? (
            <progress className="tw-lesson-audio-progress" max={total} value={progress} aria-label={t('pages.settings.courseFiles.progressLabel')} />
          ) : null}
          {downloading ? (
            <Button variant="secondary" icon="Square" onClick={stop}>
              {t('pages.settings.courseFiles.stop')}
            </Button>
          ) : allSaved ? null : (
            <Button variant="secondary" icon="Download" disabled={!ready || saveData} onClick={start}>
              {t('pages.settings.courseFiles.download')}
            </Button>
          )}
          {!downloading && !allSaved && saveData ? <p className="tw-settings-help">{t('pages.settings.courseFiles.saveData')}</p> : null}
          {!downloading && !allSaved && !saveData && !ready ? <p className="tw-settings-help">{t('pages.settings.courseFiles.notReady')}</p> : null}
          {!downloading && result && result !== 'done' && !allSaved ? <p className="tw-settings-help">{t(RESULT_TEXT[result])}</p> : null}
        </div>
      )}
    </section>
  );
}
