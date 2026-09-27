import { useSyncExternalStore } from 'react';

function subscribe(listener: () => void): () => void {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

function getSnapshot(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

/**
 * Whether the browser thinks it has a network connection (navigator.onLine),
 * updated on the online and offline events. `true` doesn't promise the
 * internet works (a Wi-Fi with no internet still counts as online), so use
 * it for messages, never to block anything.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
