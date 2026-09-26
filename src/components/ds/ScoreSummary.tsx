import { useI18n } from '../../i18n';
import { cx } from './internal/cx';
import './ScoreSummary.css';

export interface ScoreSummarySkill {
  name: string;
  got: number;
  of: number;
}

export interface ScoreSummaryProps {
  skills: ScoreSummarySkill[];
  className?: string;
}

/**
 * Per-skill results after a section check: skill name, bar and count
 * (docs/design-system/components/ScoreSummary.md). Shown next to the total
 * score and a "Review these questions" action. Never compares learners.
 */
export function ScoreSummary({ skills, className }: ScoreSummaryProps) {
  const { t } = useI18n();
  return (
    <div className={cx('tw-score', className)}>
      <ul className="tw-score-skills">
        {skills.map((s) => {
          const pct = s.of ? (s.got / s.of) * 100 : 0;
          return (
            <li key={s.name} className="tw-score-skill">
              <span>{s.name}</span>
              <span className="tw-bar-track" role="img" aria-label={t('ds.course.scoreSummary.skillResult', { got: s.got, of: s.of })}>
                <span className="tw-bar-fill" style={{ display: 'block', width: `${pct}%` }} />
              </span>
              <b>
                {s.got}/{s.of}
              </b>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
