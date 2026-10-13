/**
 * POST /api/events: takes a batch of pilot measurement events from the app
 * (src/measurement/sender.ts), checks every field by hand (the same strict
 * checker the app uses: src/measurement/events.ts) and stores them.
 *
 * Answers, which the app understands (src/measurement/sender.ts):
 *   202  stored (a repeated event id is quietly ignored)
 *   400  not a batch this server accepts: unknown keys, wrong kinds, too many
 *   403  an organisation this server doesn't take results from, or a page on another site
 *   413  the body is over 32 kB
 *   415  not JSON
 *   429  too many events for one pilot code this minute (Retry-After)
 *   503  not set up: no DATABASE_URL or no MEASUREMENT_ORGS
 * Nothing is echoed back from the body, and nothing about the sender is
 * stored: no address, no browser, no cookie.
 */
import { checkBatch, MAX_BODY_BYTES, type MeasurementEvent } from '../../src/measurement/events.js';
import { allowedOrgs, isConfigured, isCrossSite, json, readLimitedText, type Env } from './http.js';

/** The most events one pilot code may send in a minute (a busy learner makes about 5 a minute). */
export const MAX_EVENTS_PER_MINUTE = 240;

export interface EventsDb {
  /** How many events each of these pilot codes has stored in the last `seconds`. */
  recentCounts(pilotCodes: readonly string[], seconds: number): Promise<Map<string, number>>;
  /** Stores the events; an id already stored is skipped. Returns how many were new. */
  insert(events: readonly MeasurementEvent[]): Promise<number>;
}

export interface EventsDeps {
  env: Env;
  db: (url: string) => EventsDb;
}

export async function handleEvents(request: Request, deps: EventsDeps): Promise<Response> {
  const { env } = deps;
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' }, { allow: 'POST' });
  if (!isConfigured(env)) return json(503, { error: 'not_configured' });
  if (isCrossSite(request)) return json(403, { error: 'cross_site' });
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return json(415, { error: 'not_json' });

  const text = await readLimitedText(request, MAX_BODY_BYTES);
  if (text === null) return json(413, { error: 'too_large' });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, { error: 'invalid' });
  }
  const checked = checkBatch(body);
  if (!checked.ok) return json(400, { error: 'invalid', at: checked.error });

  const orgs = allowedOrgs(env);
  const events = checked.value.events;
  if (events.some((event) => !orgs.has(event.org))) return json(403, { error: 'unknown_organisation' });

  const db = deps.db(env.DATABASE_URL!);
  try {
    const codes = [...new Set(events.map((event) => event.pilotCode))];
    const recent = await db.recentCounts(codes, 60);
    for (const code of codes) {
      const incoming = events.filter((event) => event.pilotCode === code).length;
      if ((recent.get(code) ?? 0) + incoming > MAX_EVENTS_PER_MINUTE) return json(429, { error: 'too_many' }, { 'retry-after': '60' });
    }
    const stored = await db.insert(events);
    return json(202, { accepted: events.length, stored });
  } catch {
    // Never put the database's message (it can hold a host name or a key) in an answer.
    return json(500, { error: 'server_error' });
  }
}
