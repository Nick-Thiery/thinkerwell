import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyServiceWorkerUpdate,
  connectServiceWorker,
  getServiceWorkerSnapshot,
  RELOAD_FALLBACK_MS,
  resetServiceWorkerForTests,
  UPDATE_CHECK_MS,
  useServiceWorker,
  type ServiceWorkerEnvironment,
  type WorkboxLike,
} from './serviceWorker';

type Listener = (event: { isExternal?: boolean }) => void;

/** A stand-in for workbox-window's Workbox that the test fires events on. */
function fakeWorkbox(registration: Partial<ServiceWorkerRegistration> | undefined = {}) {
  const listeners = new Map<string, Listener[]>();
  const workbox = {
    addEventListener: vi.fn((type: string, listener: Listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    }),
    register: vi.fn(() => Promise.resolve(registration as ServiceWorkerRegistration | undefined)),
    update: vi.fn(() => Promise.resolve()),
    messageSkipWaiting: vi.fn(),
  } satisfies WorkboxLike;
  const fire = (type: string, event: { isExternal?: boolean } = {}) => {
    for (const listener of listeners.get(type) ?? []) listener(event);
  };
  return { workbox, fire };
}

function environment(workbox: WorkboxLike, overrides: Partial<ServiceWorkerEnvironment> = {}): ServiceWorkerEnvironment {
  return {
    workbox,
    isControlled: () => false,
    reload: vi.fn(),
    isOnline: () => true,
    isVisible: () => true,
    ...overrides,
  };
}

const flush = () => act(() => Promise.resolve());

let disconnect: (() => void) | undefined;
afterEach(() => {
  disconnect?.();
  disconnect = undefined;
  resetServiceWorkerForTests();
  vi.useRealTimers();
});

describe('offline status', () => {
  it('is "unsupported" until a service worker is connected', () => {
    const { result } = renderHook(() => useServiceWorker());
    expect(result.current).toEqual({ offline: 'unsupported', updateReady: false });
  });

  it('first visit: checking, then preparing while the course downloads, then ready', async () => {
    const { workbox, fire } = fakeWorkbox({ active: null, waiting: null });
    const { result } = renderHook(() => useServiceWorker());
    act(() => {
      disconnect = connectServiceWorker(environment(workbox));
    });
    expect(result.current.offline).toBe('checking');
    await flush();
    expect(result.current.offline).toBe('preparing');
    act(() => fire('controlling'));
    act(() => fire('activated'));
    expect(result.current).toEqual({ offline: 'ready', updateReady: false });
  });

  it('a page a worker already controls is ready at once', () => {
    const { workbox } = fakeWorkbox({ active: {} as ServiceWorker });
    disconnect = connectServiceWorker(environment(workbox, { isControlled: () => true }));
    expect(getServiceWorkerSnapshot().offline).toBe('ready');
  });

  it('a later visit with an active worker is ready once registered', async () => {
    const { workbox } = fakeWorkbox({ active: {} as ServiceWorker });
    disconnect = connectServiceWorker(environment(workbox));
    await flush();
    expect(getServiceWorkerSnapshot().offline).toBe('ready');
  });

  it('says so when the first download fails', async () => {
    const { workbox, fire } = fakeWorkbox({ active: null });
    disconnect = connectServiceWorker(environment(workbox));
    await flush();
    act(() => fire('redundant'));
    expect(getServiceWorkerSnapshot().offline).toBe('failed');
  });

  it('is unsupported when registering fails', async () => {
    const { workbox } = fakeWorkbox();
    workbox.register.mockRejectedValueOnce(new Error('SecurityError'));
    disconnect = connectServiceWorker(environment(workbox));
    await flush();
    expect(getServiceWorkerSnapshot().offline).toBe('unsupported');
  });
});

describe('a new version', () => {
  it('waits for "Update now" and never reloads by itself', async () => {
    const { workbox, fire } = fakeWorkbox({ active: {} as ServiceWorker, waiting: null });
    const env = environment(workbox, { isControlled: () => true });
    disconnect = connectServiceWorker(env);
    await flush();
    act(() => fire('waiting', { isExternal: true }));
    expect(getServiceWorkerSnapshot().updateReady).toBe(true);
    expect(workbox.messageSkipWaiting).not.toHaveBeenCalled();
    expect(env.reload).not.toHaveBeenCalled();
  });

  it('shows at once when one was already waiting before the page opened', async () => {
    const { workbox } = fakeWorkbox({ active: {} as ServiceWorker, waiting: {} as ServiceWorker });
    disconnect = connectServiceWorker(environment(workbox, { isControlled: () => true }));
    await flush();
    expect(getServiceWorkerSnapshot().updateReady).toBe(true);
  });

  it('"Update now" lets it take over, then reloads this tab', async () => {
    const { workbox, fire } = fakeWorkbox({ active: {} as ServiceWorker, waiting: {} as ServiceWorker });
    const env = environment(workbox, { isControlled: () => true });
    disconnect = connectServiceWorker(env);
    await flush();
    applyServiceWorkerUpdate();
    expect(workbox.messageSkipWaiting).toHaveBeenCalledTimes(1);
    expect(env.reload).not.toHaveBeenCalled();
    fire('controlling');
    expect(env.reload).toHaveBeenCalledTimes(1);
  });

  it('reloads anyway if the new version is slow to take over', async () => {
    vi.useFakeTimers();
    const { workbox } = fakeWorkbox({ active: {} as ServiceWorker, waiting: {} as ServiceWorker });
    const env = environment(workbox, { isControlled: () => true });
    disconnect = connectServiceWorker(env);
    await flush();
    applyServiceWorkerUpdate();
    vi.advanceTimersByTime(RELOAD_FALLBACK_MS);
    expect(env.reload).toHaveBeenCalledTimes(1);
  });

  it('another tab taking the update never reloads this one; it keeps offering it', async () => {
    const { workbox, fire } = fakeWorkbox({ active: {} as ServiceWorker, waiting: {} as ServiceWorker });
    const env = environment(workbox, { isControlled: () => true });
    disconnect = connectServiceWorker(env);
    await flush();
    act(() => fire('controlling'));
    expect(env.reload).not.toHaveBeenCalled();
    expect(getServiceWorkerSnapshot().updateReady).toBe(true);
  });

  it('the first install taking charge of the page is not an update', async () => {
    const { workbox, fire } = fakeWorkbox({ active: null, waiting: null });
    const env = environment(workbox);
    disconnect = connectServiceWorker(env);
    await flush();
    act(() => fire('controlling'));
    expect(env.reload).not.toHaveBeenCalled();
    expect(getServiceWorkerSnapshot().updateReady).toBe(false);
  });

  it('"Update now" after another tab already switched just reloads', async () => {
    const registration = { active: {} as ServiceWorker, waiting: {} as ServiceWorker | null };
    const { workbox } = fakeWorkbox(registration);
    const env = environment(workbox, { isControlled: () => true });
    disconnect = connectServiceWorker(env);
    await flush();
    registration.waiting = null;
    applyServiceWorkerUpdate();
    expect(workbox.messageSkipWaiting).not.toHaveBeenCalled();
    expect(env.reload).toHaveBeenCalledTimes(1);
  });

  it('checks for a new version every hour, only when online and on screen', async () => {
    vi.useFakeTimers();
    let online = true;
    let visible = true;
    const { workbox } = fakeWorkbox({ active: {} as ServiceWorker });
    disconnect = connectServiceWorker(
      environment(workbox, { isControlled: () => true, isOnline: () => online, isVisible: () => visible }),
    );
    await flush();
    vi.advanceTimersByTime(UPDATE_CHECK_MS);
    expect(workbox.update).toHaveBeenCalledTimes(1);
    online = false;
    vi.advanceTimersByTime(UPDATE_CHECK_MS);
    online = true;
    visible = false;
    vi.advanceTimersByTime(UPDATE_CHECK_MS);
    expect(workbox.update).toHaveBeenCalledTimes(1);
  });
});
