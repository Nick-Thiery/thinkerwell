import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import { ChoiceOption } from './ChoiceOption';

function RadioGroup() {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div role="radiogroup" aria-label="Pick one">
      {['River', 'Mountain', 'Desert'].map((label, index) => (
        <ChoiceOption key={label} letter={'ABC'[index]!} state={selected === index ? 'selected' : 'idle'} onClick={() => setSelected(index)}>
          {label}
        </ChoiceOption>
      ))}
    </div>
  );
}

function renderOptions() {
  render(
    <I18nProvider>
      <RadioGroup />
    </I18nProvider>,
  );
  return screen.getAllByRole('radio');
}

describe('ChoiceOption', () => {
  it('reflects state through role and aria-checked', () => {
    render(
      <I18nProvider>
        <div role="radiogroup" aria-label="Pick one">
          <ChoiceOption letter="A" state="idle">
            Idle
          </ChoiceOption>
          <ChoiceOption letter="B" state="correct">
            Correct
          </ChoiceOption>
          <ChoiceOption letter="C" state="retry">
            Retry
          </ChoiceOption>
        </div>
      </I18nProvider>,
    );

    const [idle, correct, retry] = screen.getAllByRole('radio');
    expect(idle).toHaveAttribute('aria-checked', 'false');
    expect(correct).toHaveAttribute('aria-checked', 'true');
    expect(retry).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Correct', { selector: '.tw-option-state' })).toBeInTheDocument();
    expect(screen.getByText('Not quite', { selector: '.tw-option-state' })).toBeInTheDocument();
  });

  it('fires onClick when an idle option is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <I18nProvider>
        <div role="radiogroup" aria-label="Pick one">
          <ChoiceOption letter="A" onClick={onClick}>
            Idle
          </ChoiceOption>
        </div>
      </I18nProvider>,
    );

    await user.click(screen.getByRole('radio'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('moves focus between sibling options with arrow keys without selecting them', async () => {
    // Activation is manual (WAI-ARIA APG): a quick check shows "Not quite"
    // and (in a real lesson) saves the answer as soon as an option is
    // chosen, so a learner arrowing through the options to hear them must
    // not answer every one they pass over.
    const user = userEvent.setup();
    const options = renderOptions();

    options[0]!.focus();
    expect(options[0]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(options[1]).toHaveFocus();
    expect(options[1]).toHaveAttribute('aria-checked', 'false');
    expect(options[0]).toHaveAttribute('aria-checked', 'false');

    await user.keyboard('{ArrowDown}');
    expect(options[2]).toHaveFocus();
    expect(options[2]).toHaveAttribute('aria-checked', 'false');

    await user.keyboard('{ArrowDown}');
    expect(options[0]).toHaveFocus();
    expect(options[0]).toHaveAttribute('aria-checked', 'false');

    await user.keyboard('{ArrowUp}');
    expect(options[2]).toHaveFocus();
    expect(options[2]).toHaveAttribute('aria-checked', 'false');
  });

  it('also moves with ArrowRight and ArrowLeft, still without answering', async () => {
    const user = userEvent.setup();
    const options = renderOptions();

    options[0]!.focus();
    await user.keyboard('{ArrowRight}');
    expect(options[1]).toHaveFocus();
    expect(options[1]).toHaveAttribute('aria-checked', 'false');
    await user.keyboard('{ArrowLeft}');
    expect(options[0]).toHaveFocus();
    expect(options[0]).toHaveAttribute('aria-checked', 'false');
  });

  it('selects the focused option with Space or Enter, after arrowing to it', async () => {
    const user = userEvent.setup();
    const options = renderOptions();

    options[0]!.focus();
    await user.keyboard('{ArrowDown}');
    expect(options[1]).toHaveFocus();
    expect(options[1]).toHaveAttribute('aria-checked', 'false');

    await user.keyboard('{Enter}');
    expect(options[1]).toHaveAttribute('aria-checked', 'true');
    expect(options[0]).toHaveAttribute('aria-checked', 'false');
    expect(options[2]).toHaveAttribute('aria-checked', 'false');
  });

  it('gives only the checked (or first) radio a tab stop', () => {
    const options = renderOptions();
    expect(options[0]).toHaveAttribute('tabIndex', '0');
    expect(options[1]).toHaveAttribute('tabIndex', '-1');
    expect(options[2]).toHaveAttribute('tabIndex', '-1');
  });
});

describe('ChoiceOption (type="checkbox")', () => {
  it('renders checkbox role and semantics, and stays independently tabbable', () => {
    render(
      <I18nProvider>
        <div role="group" aria-label="Pick any">
          <ChoiceOption letter="A" type="checkbox" state="idle">
            First
          </ChoiceOption>
          <ChoiceOption letter="B" type="checkbox" state="selected">
            Second
          </ChoiceOption>
        </div>
      </I18nProvider>,
    );

    const [first, second] = screen.getAllByRole('checkbox');
    expect(first).toHaveAttribute('aria-checked', 'false');
    expect(second).toHaveAttribute('aria-checked', 'true');
    // Unlike the radio group, every checkbox keeps its own tab stop.
    expect(first).toHaveAttribute('tabIndex', '0');
    expect(second).toHaveAttribute('tabIndex', '0');
  });
});
