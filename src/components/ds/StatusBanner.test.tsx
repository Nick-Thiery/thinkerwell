import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StatusBanner } from './StatusBanner';

describe('StatusBanner', () => {
  it('calls onAction when the action button is pressed', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <StatusBanner tone="back" title="You're back online." action="Dismiss" onAction={onAction}>
        Your work is saved.
      </StatusBanner>,
    );

    const button = screen.getByRole('button', { name: 'Dismiss' });
    await user.click(button);

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render an action button when onAction is missing', () => {
    render(
      <StatusBanner tone="back" title="You're back online." action="Dismiss">
        Your work is saved.
      </StatusBanner>,
    );

    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
  });

  it('never shows an action button on the offline banner, even with a handler', () => {
    render(
      <StatusBanner tone="offline" title="You're offline." action="Dismiss" onAction={vi.fn()}>
        Keep going: your work is saved on this device.
      </StatusBanner>,
    );

    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
  });
});
