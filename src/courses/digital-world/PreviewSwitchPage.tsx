import { useEffect, useRef, useState } from 'react';
import { usePageTitle } from '../../app/usePageTitle';
import { Button } from '../../components/ds';
import { useI18n } from '../../i18n';
import { useLearnerSession } from '../../session';
import { COURSE_ID, COURSE_PATH, COURSE_PRINT_PATH } from './content';
import { DigitalWorldFrame, useOurWorldName } from './Frame';

/**
 * /preview/digital-world: the hidden address (never linked from anywhere,
 * noindex) that turns the Digital World preview on for this device, a
 * device setting (settings.previewCourses). Visiting it turns it on; the
 * page says what that means and how to turn it off again, here or from the
 * banner on any Digital World page.
 */
export function PreviewSwitchPage() {
  const { previewCourses } = useLearnerSession();
  const on = previewCourses.includes(COURSE_ID);
  return (
    <DigitalWorldFrame banner={on}>
      <PreviewSwitch />
    </DigitalWorldFrame>
  );
}

function PreviewSwitch() {
  const { t, tx } = useI18n();
  usePageTitle(t('digitalWorld.switch.pageTitle'));
  const { previewCourses, setPreviewCourse, storageAvailable } = useLearnerSession();
  const ourWorld = useOurWorldName();
  // Shown as on from the first frame (this address turns it on as it opens),
  // until someone turns it off here.
  const [offHere, setOffHere] = useState(false);
  const on = previewCourses.includes(COURSE_ID) || !offHere;
  const [failed, setFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const changed = useRef(false);

  const turn = (next: boolean) => {
    setFailed(false);
    setPreviewCourse(COURSE_ID, next).catch(() => setFailed(true));
  };

  // Visiting this address turns the preview on, once, as the page opens.
  // Turning it off here keeps it off until the next visit.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    if (!previewCourses.includes(COURSE_ID)) setPreviewCourse(COURSE_ID, true).catch(() => setFailed(true));
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
    <div className="tw-placeholder tw-dw-switch">
      <h1 ref={headingRef} className="h1" tabIndex={-1}>
        {t(on ? 'digitalWorld.switch.onTitle' : 'digitalWorld.switch.offTitle')}
      </h1>
      {on ? (
        <>
          <p className="body-lg">{t('digitalWorld.switch.onBody')}</p>
          <p className="body-lg">{t('digitalWorld.switch.reviewNote')}</p>
          {storageAvailable ? null : <p className="body">{t('digitalWorld.switch.noStorage')}</p>}
          <div className="tw-placeholder-actions">
            <Button variant="primary" size="lg" icon="ArrowRight" href={COURSE_PATH}>
              {t('digitalWorld.switch.open')}
            </Button>
            <Button variant="secondary" size="lg" icon="Printer" href={COURSE_PRINT_PATH}>
              {t('digitalWorld.switch.printAll')}
            </Button>
            <Button variant="ghost" size="lg" onClick={() => press(false)}>
              {t('digitalWorld.switch.turnOff')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="body-lg">{t('digitalWorld.switch.offBody')}</p>
          <div className="tw-placeholder-actions">
            <Button variant="primary" size="lg" onClick={() => press(true)}>
              {t('digitalWorld.switch.turnOn')}
            </Button>
            <Button variant="secondary" size="lg" icon="Map" href="/course">
              {tx('digitalWorld.switch.goTo', { title: <span {...ourWorld.lang}>{ourWorld.title}</span> })}
            </Button>
          </div>
        </>
      )}
      <p className="body" role="status">
        {failed ? t('digitalWorld.switch.saveFailed') : ''}
      </p>
    </div>
  );
}
