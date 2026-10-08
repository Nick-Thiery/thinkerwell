import { useId } from 'react';
import { Icon } from '../../../components/ds';
import type { Activity } from '../../../content';
import { useI18n } from '../../../i18n';
import { AskToolPlayer } from './AskTool';
import { ChartCheckPlayer } from './ChartCheck';
import { CheckClaimPlayer } from './CheckClaim';
import { CompareResultsPlayer } from './CompareResults';
import { DesignPlanPlayer } from './DesignPlan';
import { SortPlayer } from './Sort';
import { SpotSignsPlayer } from './SpotSigns';
import { TrainModelPlayer } from './train-model/TrainModel';

/**
 * A Digital World lesson's activity (docs/content/DIGITAL_WORLD_SPEC.md
 * 5.2), where its lesson file puts it in the stage: its title and
 * instructions, then the player for its type. The rules every player
 * keeps: nothing locked or blocking, no timers, no red ("Not quite" in
 * burnt orange), full keyboard and screen-reader use, 44px targets, 320px
 * wide, offline, no camera, microphone or network, and the same lesson
 * still works without it (its evidence, the print view, the teacher
 * guide's paper version). Finishing it never marks a stage done.
 */
export function ActivityPlayer({ activity }: { activity: Activity }) {
  const { t, contentLang } = useI18n();
  const titleId = useId();
  return (
    <section className="tw-dw-activity" aria-labelledby={titleId} data-activity={activity.type}>
      <div className="tw-dw-activity-head">
        <span className="eyebrow tw-dw-activity-eyebrow">
          <Icon name="Hand" size={16} />
          {t('digitalWorld.activity.eyebrow')}
        </span>
        <h3 id={titleId} className="h3" {...contentLang}>
          {activity.title}
        </h3>
        <p className="body-lg tw-dw-measure" {...contentLang}>
          {activity.instructions}
        </p>
      </div>
      <Player activity={activity} />
    </section>
  );
}

function Player({ activity }: { activity: Activity }) {
  switch (activity.type) {
    case 'sort':
      return <SortPlayer activity={activity} />;
    case 'train-model':
      return <TrainModelPlayer activity={activity} />;
    case 'compare-results':
      return <CompareResultsPlayer activity={activity} />;
    case 'check-claim':
      return <CheckClaimPlayer activity={activity} />;
    case 'spot-signs':
      return <SpotSignsPlayer activity={activity} />;
    case 'ask-tool':
      return <AskToolPlayer activity={activity} />;
    case 'chart-check':
      return <ChartCheckPlayer activity={activity} />;
    case 'design-plan':
      return <DesignPlanPlayer activity={activity} />;
  }
}
