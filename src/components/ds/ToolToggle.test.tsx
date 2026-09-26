import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToolToggle } from './ToolToggle';

describe('ToolToggle', () => {
  it('has no aria-pressed when `pressed` is omitted (a plain action)', () => {
    render(<ToolToggle icon="Search">Key words</ToolToggle>);
    expect(screen.getByRole('button', { name: 'Key words' })).not.toHaveAttribute('aria-pressed');
  });

  it('reflects `pressed` as aria-pressed', () => {
    const { rerender } = render(<ToolToggle pressed={false}>Listen</ToolToggle>);
    expect(screen.getByRole('button', { name: 'Listen' })).toHaveAttribute('aria-pressed', 'false');

    rerender(<ToolToggle pressed={true}>Listen</ToolToggle>);
    expect(screen.getByRole('button', { name: 'Listen' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onClick when pressed', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ToolToggle pressed={false} onClick={onClick}>
        Listen
      </ToolToggle>,
    );

    await user.click(screen.getByRole('button', { name: 'Listen' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
