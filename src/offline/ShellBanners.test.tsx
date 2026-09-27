import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BACK_ONLINE_MS, ConnectionBanner, UpdateBanner } from './ShellBanners';
import { connectServiceWorker, resetServiceWorkerForTests, type WorkboxLike } from './serviceWorker';

let online = true;

function goOffline() {
  online = false;
  act(() => {
    window.dispatchEvent(new Event('offline'));
  });
}

function goOnline() {
  online = true;
  act(() => {
    window.dispatchEvent(new Event('online'));
  });
}

beforeEach(() => {
  online = true;
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
});

let disconnect: (() => void) | undefined;
afterEach(() => {
  disconnect?.();
  disconnect = undefined;
  resetServiceWorkerForTests();
  vi.useRealTimers();
});

/** Connects a fake service worker whose registration looks like `registration`. */
async function connect(registration: Partial<ServiceWorkerRegistration>, controlled = true) {
  const listeners = new Map<string, Array<() => void>>();
  const messageSkipWaiting = vi.fn();
  const workbox: WorkboxLike = {
    addEventListener: (type, listener) => listeners.set(type, [...(listeners.get(type) ?? []), () => listener({})]),
    register: () => Promise.resolve(registration as ServiceWorkerRegistration),
    update: () => Promise.resolve(),
    messageSkipWaiting,
  };
  const reload = vi.fn();
  await act(async () => {
    disconnect = connectServiceWorker({
      workbox,
      isControlled: () => controlled,
      reload,
      isOnline: () => true,
      isVisible: () => true,
    });
    await Promise.resolve();
  });
  return { messageSkipWaiting, reload, fire: (type: string) => act(() => listeners.get(type)?.forEach((l) => l())) };
}

describe('ConnectionBanner', () => {
  it('shows nothing while online', () => {
    const { container } = render(<ConnectionBanner learner inLesson={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offline: the ink banner, telling a learner their work is saved', () => {
    render(<ConnectionBanner learner inLesson={false} />);
    goOffline();
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent("You're offline. Keep going: your work is saved on this device.");
    expect(banner).toHaveClass('tw-status-offline');
  });

  it('offline in a lesson, with the course saved: says the lesson is saved too', async () => {
    await connect({ active: {} as ServiceWorker });
    render(<ConnectionBanner learner inLesson />);
    goOffline();
    expect(screen.getByRole('status')).toHaveTextContent(
      "You're offline. Keep going: this lesson is saved, and your work is saved on this device.",
    );
  });

  it('never tells a guest their work is saved', async () => {
    const { rerender } = render(<ConnectionBanner learner={false} inLesson />);
    goOffline();
    expect(screen.getByRole('status')).toHaveTextContent("You're offline. You can keep reading what's open.");
    await connect({ active: {} as ServiceWorker });
    rerender(<ConnectionBanner learner={false} inLesson />);
    expect(screen.getByRole('status')).toHaveTextContent("You're offline. Keep going: the lessons work without the internet.");
    expect(screen.getByRole('status')).not.toHaveTextContent(/saved/);
  });

  it('back online: the teal banner for a few seconds, then nothing', () => {
    vi.useFakeTimers();
    const { container } = render(<ConnectionBanner learner inLesson={false} />);
    goOffline();
    goOnline();
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent("You're back online. Your work is saved.");
    expect(banner).toHaveClass('tw-status-back');
    act(() => {
      vi.advanceTimersByTime(BACK_ONLINE_MS - 1);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('starts offline: the offline banner at once, and "back" only after a real return', () => {
    online = false;
    render(<ConnectionBanner learner inLesson={false} />);
    expect(screen.getByRole('status')).toHaveTextContent("You're offline.");
    goOnline();
    expect(screen.getByRole('status')).toHaveTextContent("You're back online.");
  });
});

describe('UpdateBanner', () => {
  it('shows nothing without a waiting version', async () => {
    await connect({ active: {} as ServiceWorker, waiting: null });
    const { container } = render(<UpdateBanner learner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers the new version; only "Update now" switches to it', async () => {
    const user = userEvent.setup();
    const { messageSkipWaiting, reload, fire } = await connect({ active: {} as ServiceWorker, waiting: {} as ServiceWorker });
    render(<UpdateBanner learner />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'A new version is ready. It starts the next time Thinkerwell opens. Your work is saved.',
    );
    expect(reload).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Update now' }));
    expect(messageSkipWaiting).toHaveBeenCalledTimes(1);
    fire('controlling');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("doesn't promise a guest their work is saved", async () => {
    await connect({ active: {} as ServiceWorker, waiting: {} as ServiceWorker });
    render(<UpdateBanner learner={false} />);
    expect(screen.getByRole('status')).toHaveTextContent('A new version is ready. It starts the next time Thinkerwell opens.');
    expect(screen.getByRole('status')).not.toHaveTextContent(/saved/);
  });
});
