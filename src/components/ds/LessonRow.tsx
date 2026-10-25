import { createElement, type ReactNode } from 'react';
import { STAGES } from '../../content/stages';
import { useI18n } from '../../i18n';
import { useDsLinkComponent } from './DsLinkProvider';
import { Icon } from './Icon';
import { cx } from './internal/cx';
import type { StageId } from './types';
import './LessonRow.css';

export interface LessonRowProps {
  number?: number;
  /** The lesson's title: course text, marked as English. For the section check (`kind="quiz"`), an interface message. Also used in the row's name for screen readers. */
  title: string;
  /** What the row shows instead of `title`, when that holds course text marked with <En> (the section check's row). */
  displayTitle?: ReactNode;
  /** The lesson's guiding question: course text. For the section check, an interface message. */
  question?: string;
  time?: string;
  status?: 'not-started' | 'in-progress' | 'completed';
  done?: StageId[];
  /** The lesson's steps: all five unless it has none of one (StagePath's `stages`). Counts "2 of 4 steps". */
  stages?: readonly StageId[];
  /** The reference's: which step the stage dots marked as current. Kept for the same props; the row now says where the learner is in words. */
  current?: StageId;
  highlight?: boolean;
  kind?: 'lesson' | 'quiz';
  cta?: string;
  href?: string;
  meta?: string;
  className?: string;
}

/**
 * One lesson (or the section check) on the course page: number, title,
 * guiding question, time, where the learner is in words ("Not started",
 * "In progress · 2 of 5 steps", "Done"; the five unlabelled stage dots
 * were too small to read, docs/notes/simpler-lessons.md) and a Start /
 * Continue / Review action (docs/design-system/components/LessonRow.md).
 * Always a link; nothing is locked.
 */
export function LessonRow({
  number,
  title,
  displayTitle,
  question,
  time,
  status = 'not-started',
  done,
  stages = STAGES,
  highlight,
  kind,
  cta,
  href,
  meta,
  className,
}: LessonRowProps) {
  const { t, contentLang } = useI18n();
  const isQuiz = kind === 'quiz';
  const ctaText =
    cta ||
    t(
      status === 'completed'
        ? 'ds.course.lessonRow.cta.review'
        : status === 'in-progress'
          ? 'ds.course.lessonRow.cta.continue'
          : 'ds.course.lessonRow.cta.start',
    );
  const statusText = t(
    status === 'completed'
      ? 'ds.course.lessonRow.status.completed'
      : status === 'in-progress'
        ? 'ds.course.lessonRow.status.inProgress'
        : 'ds.course.lessonRow.status.notStarted',
  );
  // Everything visible inside the link (title, guiding question, time,
  // stage dots, cta) is `aria-hidden` on its icons only, but the row's own
  // `aria-label` fully replaces the accessible name (WCAG 2.5.3), so it
  // must repeat the question and the action verb itself, not just the
  // status, or a screen-reader or voice-control user loses them.
  // The title and question are course text, which stays English; an
  // attribute can't mark part of itself as English (docs/notes/languages.md).
  const ariaLabel = isQuiz
    ? t('ds.course.lessonRow.ariaLabelQuiz', { title, status: statusText, cta: ctaText })
    : question
      ? t('ds.course.lessonRow.ariaLabelLessonQuestion', { number: number ?? '', title, status: statusText, cta: ctaText, question })
      : t('ds.course.lessonRow.ariaLabelLesson', { number: number ?? '', title, status: statusText, cta: ctaText });
  const doneStages = (done || (status === 'completed' ? [...stages] : [])).filter((stage) => stages.includes(stage));
  const LinkTag = useDsLinkComponent();

  const rowContent = (
    <>
      <span className="tw-row-num" aria-hidden="true">
        {isQuiz ? (
          <Icon name="ClipboardCheck" size={22} />
        ) : status === 'completed' ? (
          <Icon name="Check" size={22} strokeWidth={3} />
        ) : (
          number
        )}
      </span>
      <span className="tw-row-main">
        <span className="tw-row-title" {...(isQuiz || displayTitle !== undefined ? {} : contentLang)}>
          {displayTitle ?? title}
        </span>
        {question ? (
          <span className="tw-row-q" {...(isQuiz ? {} : contentLang)}>
            {question}
          </span>
        ) : null}
        <span className="tw-row-meta">
          {time ? (
            <span>
              <Icon name="Clock" size={16} />
              {time}
            </span>
          ) : null}
          {isQuiz ? null : (
            <span className={cx('tw-row-status', `tw-row-status-${status}`)}>
              {status === 'completed'
                ? t('ds.course.lessonRow.badge.completed')
                : status === 'in-progress'
                  ? t('ds.course.lessonRow.badge.inProgress', { count: doneStages.length, total: stages.length })
                  : t('ds.course.lessonRow.badge.notStarted')}
            </span>
          )}
          {meta ? <span>{meta}</span> : null}
        </span>
      </span>
      <span className="tw-row-cta" aria-hidden="true">
        {ctaText}
        <Icon name="ArrowRight" size={18} />
      </span>
    </>
  );

  // createElement, not JSX: see the matching comment in Button.tsx.
  return createElement(
    LinkTag,
    {
      href: href || '#',
      className: cx('tw-row', status === 'completed' && 'tw-row-done', highlight && 'tw-row-now', isQuiz && 'tw-row-quiz', className),
      'aria-label': ariaLabel,
    },
    rowContent,
  );
}
