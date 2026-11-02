import { useEffect, useRef, useState } from 'react';
import { usePageTitle } from '../../app/usePageTitle';
import { Button } from '../../components/ds';
import { useI18n } from '../../i18n';
import { useLearnerSession } from '../../session';
import { usePreviewCourse } from './course';
import { useCourseTitle, useOurWorldName } from './Frame';

/**
 * /preview/<id>: the hidden address (never linked from anywhere, noindex)
 * that turns a preview course on for this device, a device setting
 * (settings.previewCourses). Visiting it turns it on; the page says what
 * that means and how to turn it off again, here or from the banner on any
 * of the course's pages. Inside its PreviewCourseFrame (with the banner only
 * while it is on: ./index.tsx).
 */
export function PreviewSwitch() {
  const { t, tx, contentLang } = useI18n();
  const preview = usePreviewCourse();
  const courseTitle = useCourseTitle();
  const named = { title: <span {...contentLang}>{courseTitle}</span> };
  usePageTitle(t('previewCourse.switch.pageTitle', { title: courseTitle }));
  const { previewCourses, setPreviewCourse, storageAvailable } = useLearnerSession();
  const ourWorld = useOurWorldName();
  // Shown as on from the first frame (this address turns it on as it opens),
  // until someone turns it off here.
  const [offHere, setOffHere] = useState(false);
  const on = previewCourses.includes(preview.id) || !offHere;
  const [failed, setFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const changed = useRef(false);

  const turn = (next: boolean) => {
    setFailed(false);
    setPreviewCourse(preview.id, next).catch(() => setFailed(true));
  };

  // Visiting this address turns the preview on, once, as the page opens.
  // Turning it off here keeps it off until the next visit.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    if (!previewCourses.includes(preview.id)) setPreviewCourse(preview.id, true).catch(() => setFailed(true));
    // Only as the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After a button turns it on or off, the heading changes: move focus to it.
  useEffect(() => {
    if (!changed.current) return;
    changed.current = false;
    headingRef.current?.focus();
  }, [on]);

  const press = (next: boolean) => {
    changed.current = true;
    setOffHere(!next);
    turn(next);
  };

  return (
    <div className="tw-placeholder tw-pc-switch">
      <h1 ref={headingRef} className="h1" tabIndex={-1}>
        {tx(on ? 'previewCourse.switch.onTitle' : 'previewCourse.switch.offTitle', named)}
      </h1>
      {on ? (
        <>
          <p className="body-lg">{t(preview.wordKeys.switchOnBody)}</p>
          <p className="body-lg">{t(preview.wordKeys.switchReviewNote)}</p>
          {storageAvailable ? null : <p className="body">{t('previewCourse.switch.noStorage')}</p>}
          <div className="tw-placeholder-actions">
            <Button variant="primary" size="lg" icon="ArrowRight" href={preview.path}>
              {tx('previewCourse.switch.open', named)}
            </Button>
            <Button variant="secondary" size="lg" icon="Printer" href={preview.printPath}>
              {t('previewCourse.switch.printAll')}
            </Button>
            <Button variant="ghost" size="lg" onClick={() => press(false)}>
              {t('previewCourse.switch.turnOff')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="body-lg">{tx('previewCourse.switch.offBody', named)}</p>
          <div className="tw-placeholder-actions">
            <Button variant="primary" size="lg" onClick={() => press(true)}>
              {t('previewCourse.switch.turnOn')}
            </Button>
            <Button variant="secondary" size="lg" icon="Map" href="/course">
              {tx('previewCourse.switch.goTo', { title: <span {...ourWorld.lang}>{ourWorld.title}</span> })}
            </Button>
          </div>
        </>
      )}
      <p className="body" role="status">
        {failed ? t('previewCourse.switch.saveFailed') : ''}
      </p>
    </div>
  );
}
