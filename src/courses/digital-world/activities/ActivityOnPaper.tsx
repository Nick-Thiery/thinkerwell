import type { Activity } from '../../../content';
import { useI18n } from '../../../i18n';
import { AskToolOnPaper } from './AskTool';
import { ChartCheckOnPaper } from './ChartCheck';
import { CheckClaimOnPaper } from './CheckClaim';
import { CompareResultsOnPaper } from './CompareResults';
import { DesignPlanOnPaper } from './DesignPlan';
import { SortOnPaper } from './Sort';
import { SpotSignsOnPaper } from './SpotSigns';
import { TrainModelOnPaper } from './train-model/TrainModel';

/**
 * The activity on paper: in the lesson's print view a version a class can
 * do without a device (boxes to tick, lines to write on); in the teacher
 * guide (`forTeachers`) the same with what most people say, the right
 * answers marked with a tick and words, and every hint. So the same result
 * is always there without the activity (spec 5.2).
 */
export function ActivityOnPaper({ activity, forTeachers }: { activity: Activity; forTeachers: boolean }) {
  const { t, contentLang: en } = useI18n();
  return (
    <section className="tw-print-part tw-dw-paper" data-activity={activity.type}>
      <h2>{t(forTeachers ? 'digitalWorld.activity.guideTitle' : 'digitalWorld.activity.eyebrow')}</h2>
      <h3 {...en}>{activity.title}</h3>
      <p {...en}>{activity.instructions}</p>
      {forTeachers ? <p className="tw-print-muted">{t('digitalWorld.activity.guideIntro')}</p> : null}
      <Paper activity={activity} forTeachers={forTeachers} />
    </section>
  );
}

function Paper({ activity, forTeachers }: { activity: Activity; forTeachers: boolean }) {
  switch (activity.type) {
    case 'sort':
      return <SortOnPaper activity={activity} forTeachers={forTeachers} />;
    case 'train-model':
      return <TrainModelOnPaper activity={activity} forTeachers={forTeachers} />;
    case 'compare-results':
      return <CompareResultsOnPaper activity={activity} forTeachers={forTeachers} />;
    case 'check-claim':
      return <CheckClaimOnPaper activity={activity} forTeachers={forTeachers} />;
    case 'spot-signs':
      return <SpotSignsOnPaper activity={activity} forTeachers={forTeachers} />;
    case 'ask-tool':
      return <AskToolOnPaper activity={activity} forTeachers={forTeachers} />;
    case 'chart-check':
      return <ChartCheckOnPaper activity={activity} forTeachers={forTeachers} />;
    case 'design-plan':
      return <DesignPlanOnPaper activity={activity} forTeachers={forTeachers} />;
  }
}
