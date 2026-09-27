import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import { GlossaryTerm } from './GlossaryTerm';

function renderTerm() {
  render(
    <I18nProvider>
      <p>
        Before{' '}
        <GlossaryTerm word="fertile" definition="Good for growing lots of plants and food." example="The land is fertile.">
          fertile
        </GlossaryTerm>{' '}
        after
      </p>
    </I18nProvider>,
  );
  return screen.getByRole('button', { name: 'fertile' });
}

describe('GlossaryTerm', () => {
  it('opens on click', async () => {
    const user = userEvent.setup();
    const trigger = renderTerm();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Good for growing lots of plants and food.')).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Good for growing lots of plants and food.')).toBeInTheDocument();
  });

  it('opens on keyboard activation', async () => {
    const user = userEvent.setup();
    const trigger = renderTerm();

    await user.tab();
    expect(trigger).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Good for growing lots of plants and food.')).toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const trigger = renderTerm();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Good for growing lots of plants and food.')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('opens and closes a second time with nothing left over', async () => {
    const user = userEvent.setup();
    const trigger = renderTerm();

    await user.click(trigger);
    await user.keyboard('{Escape}');
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByText('Good for growing lots of plants and food.')).toHaveLength(1);

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Good for growing lots of plants and food.')).not.toBeInTheDocument();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not produce invalid HTML nesting when opened inside a paragraph', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const trigger = renderTerm();

    await user.click(trigger);
    expect(screen.getByText('Good for growing lots of plants and food.')).toBeInTheDocument();

    const nestingWarning = errorSpy.mock.calls.some((call) =>
      call.some((arg) => typeof arg === 'string' && arg.includes('cannot be a descendant of') || (typeof arg === 'string' && arg.includes('cannot contain a nested'))),
    );
    expect(nestingWarning).toBe(false);
  });

  it('closes on clicking its own close button and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const trigger = renderTerm();

    await user.click(trigger);
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Good for growing lots of plants and food.')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes on an outside click', async () => {
    const user = userEvent.setup();
    const trigger = renderTerm();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(document.body);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes without moving focus when focus moves elsewhere', async () => {
    // A keyboard user who tabs past the popover's own controls lands on
    // whatever comes next in the page. Left open, the popover can sit on
    // top of that next element (for example another glossary word right
    // after this one in running text), so it must close as soon as focus
    // leaves — without stealing focus back.
    render(
      <I18nProvider>
        <input aria-label="Elsewhere" />
        <p>
          <GlossaryTerm word="fertile" definition="Good for growing lots of plants and food." example="The land is fertile.">
            fertile
          </GlossaryTerm>
        </p>
      </I18nProvider>,
    );
    const user = userEvent.setup();
    const trigger = screen.getByRole('button', { name: 'fertile' });
    const elsewhere = screen.getByRole('textbox', { name: 'Elsewhere' });

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    act(() => {
      elsewhere.focus();
    });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Good for growing lots of plants and food.')).not.toBeInTheDocument();
    expect(elsewhere).toHaveFocus();
  });

  it('closes a still-open popover when focus tabs past it to another glossary term', async () => {
    render(
      <I18nProvider>
        <p>
          <GlossaryTerm word="fertile" definition="Good for growing lots of plants and food." example="The land is fertile.">
            fertile
          </GlossaryTerm>{' '}
          <GlossaryTerm word="settlement" definition="A place where people live together, like a village or town.">
            settlement
          </GlossaryTerm>
        </p>
      </I18nProvider>,
    );
    const user = userEvent.setup();
    const fertileTrigger = screen.getByRole('button', { name: 'fertile' });
    const settlementTrigger = screen.getByRole('button', { name: 'settlement' });

    await user.click(fertileTrigger);
    expect(fertileTrigger).toHaveAttribute('aria-expanded', 'true');

    // Simulates tabbing through the popover's own buttons (Close, Hear it)
    // and landing on the next term's trigger.
    act(() => {
      settlementTrigger.focus();
    });

    expect(fertileTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Good for growing lots of plants and food.')).not.toBeInTheDocument();
    expect(settlementTrigger).toHaveFocus();
  });

  it('closes with Escape while focus is inside its own popover', async () => {
    const user = userEvent.setup();
    const trigger = renderTerm();

    await user.click(trigger);
    const closeButton = screen.getByRole('button', { name: /close/i });
    closeButton.focus();

    await user.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('stays open when the definition text inside it is clicked', async () => {
    // Regression test: clicking plain text (nothing focusable) blurs the
    // trigger with relatedTarget === null. That must not be treated as
    // focus leaving the wrapper, or the popover disappears the instant a
    // learner touches the meaning they are reading.
    const user = userEvent.setup();
    const trigger = renderTerm();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByText('Good for growing lots of plants and food.'));

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Good for growing lots of plants and food.')).toBeInTheDocument();
  });

  it('stays open when the example text inside it is clicked', async () => {
    const user = userEvent.setup();
    const trigger = renderTerm();

    await user.click(trigger);
    await user.click(screen.getByText('The land is fertile.'));

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onListen and reflects listening as the "Hear it" pressed state', async () => {
    const user = userEvent.setup();
    const onListen = vi.fn();
    render(
      <I18nProvider>
        <p>
          <GlossaryTerm word="fertile" definition="Good for growing lots of plants and food." onListen={onListen} listening={false}>
            fertile
          </GlossaryTerm>
        </p>
      </I18nProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'fertile' }));
    const hearIt = screen.getByRole('button', { name: /hear it/i });
    expect(hearIt).toHaveAttribute('aria-pressed', 'false');

    await user.click(hearIt);
    expect(onListen).toHaveBeenCalledTimes(1);
  });

  it('does not render "Hear it" when no onListen is given', async () => {
    const user = userEvent.setup();
    const trigger = renderTerm();

    await user.click(trigger);

    expect(screen.queryByRole('button', { name: /hear it/i })).not.toBeInTheDocument();
  });

  it('opens its popover placed (not left parked for measuring)', async () => {
    const user = userEvent.setup();
    const trigger = renderTerm();

    await user.click(trigger);

    const popover = screen.getByRole('dialog');
    expect(popover).toHaveClass('tw-def-float');
    expect(popover).not.toHaveAttribute('data-placing');
    expect(trigger).toHaveAttribute('aria-controls', popover.id);
  });
});
