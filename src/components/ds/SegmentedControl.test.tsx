import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl', () => {
  it('gives the group its accessible name from `label`', () => {
    render(<SegmentedControl label="Reading level" options={['Standard', 'Simpler']} value="Standard" />);
    expect(screen.getByRole('group', { name: 'Reading level' })).toBeInTheDocument();
  });

  it('reflects `value` as aria-pressed on the matching option', () => {
    render(<SegmentedControl label="Reading level" options={['Standard', 'Simpler']} value="Simpler" />);
    expect(screen.getByRole('button', { name: 'Standard' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Simpler' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChange with the clicked option value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Writing help"
        options={[
          { label: 'Write', value: 'write' },
          { label: 'Starters', value: 'starters' },
        ]}
        value="write"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Starters' }));
    expect(onChange).toHaveBeenCalledWith('starters');
  });
});
