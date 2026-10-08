import { useId, useState } from 'react';
import { SegmentedControl } from '../../../components/ds';
import type { ChartCheckActivity } from '../../../content';
import { useI18n } from '../../../i18n';
import { ActivityQuestion } from './ActivityQuestion';
import { PaperQuestion } from './CompareResults';
import { useActivityState } from './state';

type View = ChartCheckActivity['views'][number];

/**
 * `chart-check` (Lesson 9): the same numbers drawn as a bar chart on each
 * of the lesson's scales ("Stall A's poster", "Start at zero"), switched
 * with a pair of buttons. Every bar has its number written on it, so its
 * height and colour are never the only clue, and the chart's name says
 * the numbers and the scale for screen readers. Then the question, which
 * is always there. Saves the views opened and the answer.
 */
export function ChartCheckPlayer({ activity }: { activity: ChartCheckActivity }) {
  const { t, contentLang } = useI18n();
  const { see } = useActivityState();
  const [viewId, setViewId] = useState(activity.views[0]?.id ?? '');
  const view = activity.views.find((v) => v.id === viewId) ?? activity.views[0];
  const noteId = useId();
  if (!view) return null;
  return (
    <div className="tw-dw-chart">
      <SegmentedControl
        label={t('digitalWorld.chart.viewsLabel')}
        options={activity.views.map((v) => ({ label: v.label, value: v.id }))}
        value={view.id}
        onChange={(id) => {
          setViewId(id);
          see(id);
        }}
      />
      <figure className="tw-dw-chart-figure" aria-describedby={noteId}>
        <BarChart activity={activity} view={view} />
        <figcaption id={noteId} className="body" {...contentLang}>
          {view.note}
        </figcaption>
      </figure>
      <ActivityQuestion answerKey="question" seedIndex={0} question={activity.question.question} options={activity.question.options} />
    </div>
  );
}

const WIDTH = 360;
const HEIGHT = 240;
const LEFT = 44;
const BOTTOM = 196;
const TOP = 16;

/** One view of the chart: an SVG drawn from the lesson's numbers, every bar labelled with its value. */
export function BarChart({ activity, view }: { activity: ChartCheckActivity; view: View }) {
  const { t, formatNumber, formatList } = useI18n();
  const span = view.axisEnd - view.axisStart;
  const y = (value: number) => BOTTOM - ((value - view.axisStart) / span) * (BOTTOM - TOP);
  const slot = (WIDTH - LEFT) / activity.bars.length;
  const barWidth = Math.min(96, slot * 0.6);
  const description = t('digitalWorld.chart.figureLabel', {
    measure: activity.measure,
    bars: formatList(activity.bars.map((bar) => t('digitalWorld.chart.bar', { label: bar.label, value: bar.value }))),
    start: view.axisStart,
    end: view.axisEnd,
  });
  return (
    <svg className="tw-dw-chart-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={description}>
      <text className="tw-dw-chart-axis" x={LEFT - 8} y={TOP + 5} textAnchor="end">
        {formatNumber(view.axisEnd)}
      </text>
      <text className="tw-dw-chart-axis" x={LEFT - 8} y={BOTTOM + 5} textAnchor="end">
        {formatNumber(view.axisStart)}
      </text>
      <line className="tw-dw-chart-grid" x1={LEFT} x2={WIDTH} y1={TOP} y2={TOP} />
      <line className="tw-dw-chart-line" x1={LEFT} x2={LEFT} y1={TOP} y2={BOTTOM} />
      <line className="tw-dw-chart-line" x1={LEFT} x2={WIDTH} y1={BOTTOM} y2={BOTTOM} />
      {activity.bars.map((bar, index) => {
        const x = LEFT + slot * index + (slot - barWidth) / 2;
        const top = y(bar.value);
        return (
          <g key={index}>
            <rect className="tw-dw-chart-bar" x={x} y={top} width={barWidth} height={Math.max(0, BOTTOM - top)} />
            <text className="tw-dw-chart-value" x={x + barWidth / 2} y={top - 6} textAnchor="middle">
              {formatNumber(bar.value)}
            </text>
            <text className="tw-dw-chart-label" x={x + barWidth / 2} y={BOTTOM + 24} textAnchor="middle">
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** On paper: both views drawn, with their notes, and the question. */
export function ChartCheckOnPaper({ activity, forTeachers }: { activity: ChartCheckActivity; forTeachers: boolean }) {
  const { contentLang: en } = useI18n();
  return (
    <>
      <p {...en}>{activity.measure}</p>
      <div className="tw-dw-paper-charts">
        {activity.views.map((view) => (
          <figure key={view.id} className="tw-print-keep tw-dw-chart-figure">
            <p>
              <strong {...en}>{view.label}</strong>
            </p>
            <BarChart activity={activity} view={view} />
            <figcaption {...en}>{view.note}</figcaption>
          </figure>
        ))}
      </div>
      <PaperQuestion question={activity.question.question} options={activity.question.options} forTeachers={forTeachers} />
    </>
  );
}
