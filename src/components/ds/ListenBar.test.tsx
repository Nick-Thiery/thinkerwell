import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ListenBar } from './ListenBar';

describe('ListenBar', () => {
  it('playing: shows Pause and Normal is the pressed speed', () => {
    render(<ListenBar state="playing" speed="normal" />);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Normal' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Slow' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('paused: shows Play', () => {
    render(<ListenBar state="paused" />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('shows a custom label, and uses it for the group\'s accessible name too', () => {
    render(<ListenBar label="Reading aloud · part 1 of 3" />);
    expect(screen.getByText('Reading aloud · part 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Reading aloud · part 1 of 3' })).toBeInTheDocument();
  });

  it('falls back to "Reading aloud" for both the visible label and the accessible name', () => {
    render(<ListenBar />);
    expect(screen.getByText('Reading aloud')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Reading aloud' })).toBeInTheDocument();
  });

  it('calls onPlayPause, onSpeedChange and onStop from the right control', async () => {
    const user = userEvent.setup();
    const onPlayPause = vi.fn();
    const onSpeedChange = vi.fn();
    const onStop = vi.fn();
    render(
      <ListenBar
        state="playing"
        speed="normal"
        onPlayPause={onPlayPause}
        onSpeedChange={onSpeedChange}
        onStop={onStop}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(onPlayPause).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Slow' }));
    expect(onSpeedChange).toHaveBeenCalledWith('slow');

    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
