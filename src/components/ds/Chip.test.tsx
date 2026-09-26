import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from './Chip';

describe('Chip (plain, toggle)', () => {
  it('reflects `selected` as aria-pressed and calls onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Chip selected={false} onClick={onClick}>
        Near the river
      </Chip>,
    );

    const chip = screen.getByRole('button', { name: 'Near the river' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(chip).not.toHaveAttribute('aria-checked');

    await user.click(chip);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('Chip (role="radio")', () => {
  /** Three radio chips inside a real radiogroup, with a controlled `value`. */
  function RadioChips() {
    const [value, setValue] = useState('river');
    return (
      <div role="radiogroup" aria-label="Where would you build?">
        {[
          { value: 'river', label: 'Near the river' },
          { value: 'hill', label: 'On the hill' },
          { value: 'forest', label: 'In the forest' },
        ].map((option) => (
          <Chip
            key={option.value}
            role="radio"
            selected={value === option.value}
            onClick={() => setValue(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    );
  }

  it('reflects selection as aria-checked', () => {
    render(<RadioChips />);
    expect(screen.getByRole('radio', { name: 'Near the river' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'On the hill' })).toHaveAttribute('aria-checked', 'false');
  });

  it('moves selection with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<RadioChips />);

    screen.getByRole('radio', { name: 'Near the river' }).focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('radio', { name: 'On the hill' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'On the hill' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Near the river' })).toHaveAttribute('aria-checked', 'false');
  });

  it('wraps from the last option to the first with ArrowRight', async () => {
    const user = userEvent.setup();
    render(<RadioChips />);

    screen.getByRole('radio', { name: 'In the forest' }).focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('radio', { name: 'Near the river' })).toHaveFocus();
  });

  it('moves back with ArrowLeft', async () => {
    const user = userEvent.setup();
    render(<RadioChips />);

    screen.getByRole('radio', { name: 'On the hill' }).focus();
    await user.keyboard('{ArrowLeft}');

    expect(screen.getByRole('radio', { name: 'Near the river' })).toHaveFocus();
  });

  it('gives only the checked chip a tab stop', () => {
    render(<RadioChips />);
    expect(screen.getByRole('radio', { name: 'Near the river' })).toHaveAttribute('tabIndex', '0');
    expect(screen.getByRole('radio', { name: 'On the hill' })).toHaveAttribute('tabIndex', '-1');
    expect(screen.getByRole('radio', { name: 'In the forest' })).toHaveAttribute('tabIndex', '-1');
  });

  it('keeps a tab stop in the group when the checked chip is removed', () => {
    // Regression test: if the checked chip disappears (the group shrinks),
    // no surviving chip's own `checked` prop changes, so a tab-stop
    // calculation keyed only on that would never rerun and every remaining
    // chip would be stuck at tabIndex -1.
    function ShrinkingChips({ options }: { options: string[] }) {
      return (
        <div role="radiogroup" aria-label="Where would you build?">
          {options.map((label) => (
            <Chip key={label} role="radio" selected={label === 'c'}>
              {label}
            </Chip>
          ))}
        </div>
      );
    }

    const { rerender } = render(<ShrinkingChips options={['a', 'b', 'c']} />);
    rerender(<ShrinkingChips options={['a', 'b']} />);

    const options = screen.getAllByRole('radio');
    expect(options.filter((option) => option.tabIndex === 0)).toHaveLength(1);
  });
});

describe('Chip (role="radio", right-to-left)', () => {
  function RadioChipsRtl() {
    const [value, setValue] = useState('river');
    return (
      <div dir="rtl" role="radiogroup" aria-label="Where would you build?">
        {[
          { value: 'river', label: 'Near the river' },
          { value: 'hill', label: 'On the hill' },
          { value: 'forest', label: 'In the forest' },
        ].map((option) => (
          <Chip key={option.value} role="radio" selected={value === option.value} onClick={() => setValue(option.value)}>
            {option.label}
          </Chip>
        ))}
      </div>
    );
  }

  it('moves to the visually-right (previous in DOM order) chip on ArrowRight', async () => {
    const user = userEvent.setup();
    render(<RadioChipsRtl />);

    screen.getByRole('radio', { name: 'On the hill' }).focus();
    await user.keyboard('{ArrowRight}');

    // The chips render in DOM order "river, hill, forest", and in
    // right-to-left the first DOM item sits at the visual right edge, so
    // "river" is to the right of "hill" and "forest" is to its left.
    // ArrowRight (move visually right) from "hill" therefore goes to
    // "river" (DOM index - 1), the mirror image of what ArrowRight does in
    // left-to-right.
    expect(screen.getByRole('radio', { name: 'Near the river' })).toHaveFocus();
  });

  it('moves to the visually-left (next in DOM order) chip on ArrowLeft', async () => {
    const user = userEvent.setup();
    render(<RadioChipsRtl />);

    screen.getByRole('radio', { name: 'On the hill' }).focus();
    await user.keyboard('{ArrowLeft}');

    expect(screen.getByRole('radio', { name: 'In the forest' })).toHaveFocus();
  });

  it('wraps to the visually-left-most chip on ArrowRight from the right-most chip', async () => {
    const user = userEvent.setup();
    render(<RadioChipsRtl />);

    // "Near the river" (DOM index 0) sits at the visual right edge in
    // right-to-left, so pressing ArrowRight from there wraps to the
    // left-most chip ("In the forest"), not to "On the hill" (which is
    // what pressing ArrowRight in left-to-right would do from the first
    // item — the bug this guards against).
    screen.getByRole('radio', { name: 'Near the river' }).focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('radio', { name: 'In the forest' })).toHaveFocus();
  });
});
