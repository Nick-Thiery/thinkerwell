/**
 * Talking to /api/classes, this site's own (docs/notes/online-classes.md).
 * Nothing here runs unless a learner joins a class, or someone opens a
 * class view with its secret link.
 */
import type { ClassLookup, SyncRequest, SyncResponse } from './protocol';

export const CLASSES_API = '/api/classes';

/** Why a request didn't work: offline (or the server unreachable), not switched on yet, or anything else. */
export type ApiProblem = 'offline' | 'not-configured' | 'not-found' | 'wrong-key' | 'too-many' | 'failed';

export class ApiError extends Error {
  constructor(readonly problem: ApiProblem) {
    super(problem);
  }
}

function problemFor(status: number): ApiProblem {
  if (status === 503) return 'not-configured';
  if (status === 404) return 'not-found';
  if (status === 401 || status === 403) return 'wrong-key';
  if (status === 429) return 'too-many';
  return 'failed';
}

async function request<T>(input: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new ApiError('offline');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('offline');
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new ApiError(problemFor(response.status));
  return (await response.json()) as T;
}

/** A class's name and its organisation's, by its code. */
export function lookupClass(code: string): Promise<ClassLookup> {
  return request<ClassLookup>(`${CLASSES_API}?action=lookup&code=${encodeURIComponent(code)}`);
}

/** Sends learners' progress, and who stopped sharing. `keepalive` for a send as the page closes. */
export function sendSync(body: SyncRequest, keepalive = false): Promise<SyncResponse> {
  return request<SyncResponse>(CLASSES_API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    keepalive,
  });
}

/** A class view's read, with its secret link's key. */
export function readWithKey<T>(action: string, key: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams({ action, ...params });
  return request<T>(`${CLASSES_API}?${query.toString()}`, {
    headers: { authorization: `Bearer ${key}` },
  });
}

/** A class view's change, with its secret link's key. */
export function postWithKey<T>(action: string, key: string, body: Record<string, unknown> = {}): Promise<T> {
  return request<T>(CLASSES_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ ...body, action }),
  });
}
