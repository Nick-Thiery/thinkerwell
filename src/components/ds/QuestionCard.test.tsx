import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import { QuestionCard } from './QuestionCard';

const OPTIONS = ['Rivers bring water and food', 'Rivers are always warm', 'Rivers have no floods'];

function renderCard(onSelect = vi.fn()) {
  render(
    <I18nProvider>
      <QuestionCard id="q1" prompt="Why do towns often start near rivers?" options={OPTIONS} onSelect={onSelect} />
    </I18nProvider>,
  );
  return { onSelect, options: screen.getAllByRole('radio') };
}

describe('QuestionCard', () => {
  it('calls onSelect when an option is clicked', async () => {
    const user = userEvent.setup();
    const { onSelect, options } = renderCard();

    await user.click(options[1]!);

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('does not call onSelect while arrowing between options, only on Enter/Space', async () => {
    // Regression test: a keyboard or screen-reader user pressing ArrowDown
    // to hear the next option must not thereby answer it — a check has no
    // separate "Check answer" step, so a click-on-arrow would show "Not
    // quite" (and, in a real lesson, save a wrong answer) for every option
    // the learner passed over on the way to the one they meant to choose.
    const user = userEvent.setup();
    const { onSelect, options } = renderCard();

    options[0]!.focus();
    await user.keyboard('{ArrowDown}');
    expect(options[1]).toHaveFocus();
    expect(onSelect).not.toHaveBeenCalled();

    await user.keyboard('{ArrowDown}');
    expect(options[2]).toHaveFocus();
    expect(onSelect).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('keeps a tab stop in the group when the question changes and the previously-checked option is gone', () => {
    // Regression test: QuestionCard is reused (same DOM position) for the
    // next question, which can have fewer options than the one the learner
    // just answered. If the checked option (say, index 3 of a 4-option
    // question) does not exist in the next, 3-option question, some option
    // must still be a tab stop, or a keyboard user can no longer Tab into
    // the group at all.
    const { rerender } = render(
      <I18nProvider>
        <QuestionCard
          id="q1"
          prompt="Four-option question"
          options={['A', 'B', 'C', 'D']}
          selected={3}
          result="correct"
        />
      </I18nProvider>,
    );

    rerender(
      <I18nProvider>
        <QuestionCard id="q1" prompt="Three-option question" options={['X', 'Y', 'Z']} />
      </I18nProvider>,
    );

    const options = screen.getAllByRole('radio');
    expect(options.filter((option) => option.tabIndex === 0)).toHaveLength(1);
  });
});
