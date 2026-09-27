import { Icon } from '../../components/ds';
import type { ChoiceOptionData } from '../../content';
import { useI18n } from '../../i18n';

export interface AnswerOptionsProps {
  options: readonly ChoiceOptionData[];
  /**
   * What to show under the options: every option's feedback, as learners
   * see it (the answer key), or only why the correct one is right (the
   * teacher guide).
   */
  feedback: 'every' | 'why';
}

/**
 * A question's options in the order the content lists them (learners see
 * them shuffled), with the correct one marked by a tick and the words
 * "Correct answer", in bold and with a heavier border, never by colour alone
 * (design-system README: answers "always come with an icon and a word").
 * On paper the same marks print black.
 */
export function AnswerOptions({ options, feedback }: AnswerOptionsProps) {
  const { t } = useI18n();
  return (
    <ul className="tw-key-options">
      {options.map((option, index) => (
        <li key={index} className={option.correct ? 'tw-key-option tw-key-option-correct' : 'tw-key-option'}>
          <p className="tw-key-option-text">
            {option.correct ? (
              <span className="tw-key-mark">
                <Icon name="Check" size={18} strokeWidth={3} />
                {t('pages.teacherTools.correctAnswer')}
                <span className="tw-visually-hidden">:</span>
              </span>
            ) : null}{' '}
            <span>{option.text}</span>
          </p>
          {feedback === 'every' ? (
            <p className="tw-key-feedback">
              <span className="tw-key-feedback-label">{t('pages.teacherTools.feedback')}</span> {option.feedback}
            </p>
          ) : option.correct ? (
            <p className="tw-key-feedback">
              <span className="tw-key-feedback-label">{t('pages.teacherTools.why')}</span> {option.feedback}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
