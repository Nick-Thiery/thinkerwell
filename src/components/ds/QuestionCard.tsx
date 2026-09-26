import { useId, type ReactNode } from 'react';
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
}: QuestionCardProps) {
  const generatedId = useId();
  const headingId = `${id ?? generatedId}-q`;
  return (
    <section className={cx('tw-question', className)}>
      <div className="tw-question-head">
        {eyebrow ? <span className="tw-question-num">{eyebrow}</span> : null}
        <h3 className="tw-question-prompt" id={headingId}>
          {prompt}
        </h3>
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
      {feedback ? <Feedback tone={result === 'retry' ? 'retry' : 'correct'}>{feedback}</Feedback> : null}
      {children}
    </section>
  );
}
