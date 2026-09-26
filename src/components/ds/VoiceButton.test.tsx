import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VoiceButton } from './VoiceButton';

describe('VoiceButton', () => {
  it('idle: shows "Say it" and aria-pressed=false', () => {
    render(<VoiceButton state="idle" />);
    const button = screen.getByRole('button', { name: 'Say it' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('listening: shows "Stop" and aria-pressed=true', () => {
    render(<VoiceButton state="listening" />);
    const button = screen.getByRole('button', { name: 'Stop' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('uses custom children and stopLabel when given', () => {
    const { rerender } = render(<VoiceButton state="idle">Talk it through</VoiceButton>);
    expect(screen.getByRole('button', { name: 'Talk it through' })).toBeInTheDocument();

    rerender(
      <VoiceButton state="listening" stopLabel="Stop talking">
        Talk it through
      </VoiceButton>,
    );
    expect(screen.getByRole('button', { name: 'Stop talking' })).toBeInTheDocument();
  });

  it('calls onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<VoiceButton state="idle" onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'Say it' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
