import { useId, type ReactNode } from 'react';
import { En, useI18n } from '../../i18n';
import { ChoiceOption } from './ChoiceOption';
import { Feedback } from './Feedback';
import { cx } from './internal/cx';
import './QuestionCard.css';

const LETTERS = 'ABCDEFG';

export interface QuestionCardProps {
  id?: string;
  eyebrow?: string;
  prompt: string;
  options: string[];
  selected?: number;
  result?: 'correct' | 'retry';
  feedback?: string;
  children?: ReactNode;
  /** Drives a real radiogroup from outside: called with the clicked option's index. */
  onSelect?: (index: number) => void;
  className?: string;
  /**
   * The prompt's heading level (default 3, under a stage's "Quick check" h2).
   * A section check question sits straight under the page's h1, so it uses 2.
   * Not in the design-system reference; added so headings never skip a level.
   */
  headingLevel?: 2 | 3;
}

/** A quick-check or section-check question: prompt, options and (once answered) feedback. */
export function QuestionCard({
  id,
  eyebrow,
  prompt,
  options,
  selected,
  result,
  feedback,
  children,
  onSelect,
  className,
  headingLevel = 3,
}: QuestionCardProps) {
  const { contentLang } = useI18n();
  const generatedId = useId();
  const headingId = `${id ?? generatedId}-q`;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className={cx('tw-question', className)}>
      <div className="tw-question-head">
        {eyebrow ? <span className="tw-question-num">{eyebrow}</span> : null}
        <Heading className="tw-question-prompt" id={headingId} {...contentLang}>
          {prompt}
        </Heading>
      </div>
      <div className="tw-question-options" role="radiogroup" aria-labelledby={headingId}>
        {options.map((option, index) => {
          let state: 'idle' | 'selected' | 'correct' | 'retry' = 'idle';
          if (selected === index) {
            state = result === 'correct' ? 'correct' : result === 'retry' ? 'retry' : 'selected';
          }
          return (
            <ChoiceOption
              key={index}
              letter={LETTERS[index] ?? String(index + 1)}
              state={state}
              onClick={onSelect ? () => onSelect(index) : undefined}
            >
              {option}
            </ChoiceOption>
          );
        })}
      </div>
      {feedback ? (
        <Feedback tone={result === 'retry' ? 'retry' : 'correct'}>
          <En>{feedback}</En>
        </Feedback>
      ) : null}
      {children}
    </section>
  );
}
