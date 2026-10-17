import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  applyServiceWorkerUpdate,
  connectServiceWorker,
  getServiceWorkerSnapshot,
  resetServiceWorkerForTests,
  UPDATE_CHECK_MS,
  UPDATE_POLL_MS,
  UPDATE_WAIT_MS,
  useServiceWorker,
  type ServiceWorkerEnvironment,
  type WorkboxLike,
} from './serviceWorker';

type Listener = (event: { isExternal?: boolean }) => void;

/** A stand-in for workbox-window's Workbox that the test fires events on. */
function fakeWorkbox(registration: Partial<ServiceWorkerRegistration> | ReturnType<typeof liveRegistration> | undefined = {}) {
  const listeners = new Map<string, Listener[]>();
  const workbox = {
    addEventListener: vi.fn((type: string, listener: Listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    }),
    register: vi.fn(() => Promise.resolve(registration as unknown as ServiceWorkerRegistration | undefined)),
    update: vi.fn(() => Promise.resolve()),
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

interface FakeWorker {
  postMessage: Mock<(message: unknown) => void>;
}

/** A stand-in service worker that records what the page sends it. */
function worker(): FakeWorker {
  return { postMessage: vi.fn() };
}

/** A registration the test changes as the browser would (it is read live, never copied). */
function liveRegistration(active: FakeWorker | null, waiting: FakeWorker | null) {
  return { active, waiting };
}

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
    expect(result.current).toEqual({ offline: 'unsupported', updateReady: false, updating: false });
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
    expect(result.current).toEqual({ offline: 'ready', updateReady: false, updating: false });
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
    expect(env.reload).not.toHaveBeenCalled();
  });

  it('shows at once when one was already waiting before the page opened', async () => {
    const { workbox } = fakeWorkbox({ active: {} as ServiceWorker, waiting: {} as ServiceWorker });
    disconnect = connectServiceWorker(environment(workbox, { isControlled: () => true }));
    await flush();
    expect(getServiceWorkerSnapshot().updateReady).toBe(true);
  });

  it('"Update now" lets it take over, then reloads this tab', async () => {
    const next = worker();
    const { workbox, fire } = fakeWorkbox(liveRegistration(worker(), next));
    const env = environment(workbox, { isControlled: () => true });
    disconnect = connectServiceWorker(env);
    await flush();
    act(() => applyServiceWorkerUpdate());
    expect(next.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(getServiceWorkerSnapshot().updating).toBe(true);
    expect(env.reload).not.toHaveBeenCalled();
    fire('controlling');
    expect(env.reload).toHaveBeenCalledTimes(1);
  });

  it('reloads once the new version is active, even if the page missed the takeover event', async () => {
    vi.useFakeTimers();
    const old = worker();
    const next = worker();
    const registration = liveRegistration(old, next);
    const { workbox } = fakeWorkbox(registration);
    const env = environment(workbox, { isControlled: () => true });
    disconnect = connectServiceWorker(env);
    await flush();
    act(() => applyServiceWorkerUpdate());
    vi.advanceTimersByTime(UPDATE_POLL_MS * 4);
    expect(env.reload).not.toHaveBeenCalled();
    registration.active = next;
    registration.waiting = null;
    vi.advanceTimersByTime(UPDATE_POLL_MS);
    expect(env.reload).toHaveBeenCalledTimes(1);
  });

  it('asks the newest waiting version, not the one the banner first appeared for', async () => {
    vi.useFakeTimers();
    const second = worker();
    const third = worker();
    const registration = liveRegistration(worker(), second);
    const { workbox, fire } = fakeWorkbox(registration);
    const env = environment(workbox, { isControlled: () => true });
    disconnect = connectServiceWorker(env);
    await flush();
    // A third version finished installing while the banner showed.
    registration.waiting = third;
    act(() => fire('waiting', { isExternal: true }));
    act(() => applyServiceWorkerUpdate());
    expect(second.postMessage).not.toHaveBeenCalled();
    expect(third.postMessage).toHaveBeenCalledTimes(1);
    fire('controlling');
    expect(env.reload).toHaveBeenCalledTimes(1);
  });

  it('a newer version that replaces the one just asked is asked too', async () => {
    vi.useFakeTimers();
    const second = worker();
    const third = worker();
    const registration = liveRegistration(worker(), second);
    const { workbox } = fakeWorkbox(registration);
    const env = environment(workbox, { isControlled: () => true });
    disconnect = connectServiceWorker(env);
    await flush();
    act(() => applyServiceWorkerUpdate());
    expect(second.postMessage).toHaveBeenCalledTimes(1);
    registration.waiting = third;
    vi.advanceTimersByTime(UPDATE_POLL_MS);
    expect(third.postMessage).toHaveBeenCalledTimes(1);
    expect(second.postMessage).toHaveBeenCalledTimes(1);
  });

  it('never reloads onto the old version: if the new one is slow to take over, it offers the button again', async () => {
    vi.useFakeTimers();
    const next = worker();
    const { workbox, fire } = fakeWorkbox(liveRegistration(worker(), next));
    const env = environment(workbox, { isControlled: () => true });
    disconnect = connectServiceWorker(env);
    await flush();
    act(() => applyServiceWorkerUpdate());
    act(() => {
      vi.advanceTimersByTime(UPDATE_WAIT_MS);
    });
    expect(env.reload).not.toHaveBeenCalled();
    expect(getServiceWorkerSnapshot()).toMatchObject({ updateReady: true, updating: false });
    // It takes over later: no reload without a new tap, and the banner stays.
    act(() => fire('controlling'));
    expect(env.reload).not.toHaveBeenCalled();
    expect(getServiceWorkerSnapshot().updateReady).toBe(true);
  });

  it('tapping again while it waits asks again and waits the full time again', async () => {
    vi.useFakeTimers();
    const next = worker();
    const { workbox, fire } = fakeWorkbox(liveRegistration(worker(), next));
    const env = environment(workbox, { isControlled: () => true });
    disconnect = connectServiceWorker(env);
    await flush();
    act(() => applyServiceWorkerUpdate());
    act(() => {
      vi.advanceTimersByTime(UPDATE_WAIT_MS - 1000);
    });
    act(() => applyServiceWorkerUpdate());
    expect(next.postMessage).toHaveBeenCalledTimes(2);
    act(() => {
      vi.advanceTimersByTime(UPDATE_WAIT_MS - 1000);
    });
    expect(getServiceWorkerSnapshot().updating).toBe(true);
    fire('controlling');
    expect(env.reload).toHaveBeenCalledTimes(1);
  });

  it('reloads only once', async () => {
    vi.useFakeTimers();
    const next = worker();
    const registration = liveRegistration(worker(), next);
    const { workbox, fire } = fakeWorkbox(registration);
    const env = environment(workbox, { isControlled: () => true });
    disconnect = connectServiceWorker(env);
    await flush();
    act(() => applyServiceWorkerUpdate());
    registration.active = next;
    registration.waiting = null;
    fire('controlling');
    vi.advanceTimersByTime(UPDATE_POLL_MS * 2);
    applyServiceWorkerUpdate();
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
