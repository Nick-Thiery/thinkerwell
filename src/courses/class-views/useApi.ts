import { useCallback, useEffect, useState } from 'react';
import { ApiError, readWithKey, type ApiProblem } from '../../classes/client';

/** The secret link's key, from the address's fragment (`#key=…`), which browsers never send to a server. */
export function useLinkKey(): string | null {
  const read = () => {
    const key = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('key');
    return key && /^[A-Za-z0-9_-]{32,128}$/.test(key) ? key : null;
  };
  const [key, setKey] = useState<string | null>(read);
  useEffect(() => {
    const changed = () => setKey(read());
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  return key;
}

export type Loaded<T> = { status: 'loading' } | { status: 'error'; problem: ApiProblem } | { status: 'ready'; data: T };

/** Reads one action with the key, again whenever `reload` is called. */
export function useApi<T>(action: string, key: string | null, params: Record<string, string> = {}): [Loaded<T>, () => void] {
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' });
  const [round, setRound] = useState(0);
  const query = JSON.stringify(params);
  useEffect(() => {
    if (!key) return undefined;
    let current = true;
    readWithKey<T>(action, key, JSON.parse(query) as Record<string, string>).then(
      (data) => current && setState({ status: 'ready', data }),
      (error: unknown) => current && setState({ status: 'error', problem: error instanceof ApiError ? error.problem : 'failed' }),
    );
    return () => {
      current = false;
    };
  }, [action, key, query, round]);
  const reload = useCallback(() => {
    // A page already showing its data keeps it until the new data comes; a problem gives way to "Loading…".
    setState((old) => (old.status === 'error' ? { status: 'loading' } : old));
    setRound((n) => n + 1);
  }, []);
  return [state, reload];
}

/** The full address of a secret link, to copy and send. */
export function linkFor(path: '/teach' | '/program' | '/admin', key: string): string {
  return `${window.location.origin}${path}#key=${key}`;
}
