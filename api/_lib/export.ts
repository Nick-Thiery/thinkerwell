/**
 * GET /api/export: the team's way to get a pilot's results out, as CSV
 * (the default) or JSON. Protected by a bearer token (EXPORT_TOKEN), and
 * always for ONE organisation, so two organisations' data are never mixed.
 *
 *   curl -H "Authorization: Bearer $EXPORT_TOKEN" \
 *     "https://thinkerwell.app/api/export?org=help-jakarta&format=csv" -o help-jakarta.csv
 *
 * Query: org (required); format=csv|json; from, to (a date, or a date and
 * time, compared with when the server received the event); type; pilotCode.
 * Anything else is a 400. The answer is streamed a page at a time, so a
 * long pilot is not held in memory. Nothing here is for learners or
 * organisations: there is no admin page (docs/notes/pilot-measurement.md).
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { EVENT_SPECS, EVENT_TYPES, ORG_CODE_PATTERN, PILOT_CODE_PATTERN } from '../../src/measurement/events.js';
import { json, type Env } from './http.js';

export interface ExportFilter {
  org: string;
  type?: string;
  pilotCode?: string;
  from?: string;
  to?: string;
}

export interface ExportRow {
  id: string;
  org: string;
  pilot_code: string;
  device_id: string;
  session_id: string;
  type: string;
  lesson_id: string | null;
  stage: string | null;
  value: Record<string, unknown>;
  ts: string;
  received_at: string;
  app_version: string;
}

export interface ExportDb {
  /** Events for the filter in the order they were received, after the cursor ("<received_at>|<id>"), at most `limit`. */
  page(filter: ExportFilter, after: string | null, limit: number): Promise<ExportRow[]>;
}

export interface ExportDeps {
  env: Env;
  db: (url: string) => ExportDb;
}

export const PAGE_SIZE = 2000;

/** Every key any event's value can have, as v_<key> columns, so a spreadsheet needs no JSON. */
export const VALUE_COLUMNS: string[] = [
  ...new Set(Object.values(EVENT_SPECS).flatMap((spec) => Object.keys(spec.value))),
].sort();

export const CSV_HEADER: string[] = [
  'id',
  'org',
  'pilot_code',
  'device_id',
  'session_id',
  'type',
  'lesson_id',
  'stage',
  'ts',
  'received_at',
  'app_version',
  ...VALUE_COLUMNS.map((key) => `v_${key}`),
  'value',
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})?)?$/;

function sameToken(given: string, expected: string): boolean {
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/** A CSV cell. Every value here is checked on the way in, but a spreadsheet must still never run one as a formula. */
export function csvCell(input: unknown): string {
  if (input === null || input === undefined) return '';
  let text =
    typeof input === 'string' ? input : typeof input === 'number' || typeof input === 'boolean' ? String(input) : JSON.stringify(input);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvLine(row: ExportRow): string {
  const cells = [
    row.id,
    row.org,
    row.pilot_code,
    row.device_id,
    row.session_id,
    row.type,
    row.lesson_id,
    row.stage,
    row.ts,
    row.received_at,
    row.app_version,
    ...VALUE_COLUMNS.map((key) => row.value[key]),
    row.value,
  ];
  return `${cells.map(csvCell).join(',')}\n`;
}

const ALLOWED_PARAMS = new Set(['org', 'format', 'from', 'to', 'type', 'pilotCode']);

export function handleExport(request: Request, deps: ExportDeps): Response {
  const { env } = deps;
  if (request.method !== 'GET') return json(405, { error: 'method_not_allowed' }, { allow: 'GET' });
  if (!env.EXPORT_TOKEN || !env.DATABASE_URL) return json(503, { error: 'not_configured' });
  const header = request.headers.get('authorization') ?? '';
  const given = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!given || !sameToken(given, env.EXPORT_TOKEN)) return json(401, { error: 'unauthorised' }, { 'www-authenticate': 'Bearer' });

  const params = new URL(request.url).searchParams;
  for (const key of params.keys()) if (!ALLOWED_PARAMS.has(key)) return json(400, { error: 'invalid', at: key });
  const org = params.get('org') ?? '';
  if (!ORG_CODE_PATTERN.test(org)) return json(400, { error: 'invalid', at: 'org' });
  const format = params.get('format') ?? 'csv';
  if (format !== 'csv' && format !== 'json') return json(400, { error: 'invalid', at: 'format' });
  const filter: ExportFilter = { org };
  const type = params.get('type');
  if (type !== null) {
    if (!(EVENT_TYPES as string[]).includes(type)) return json(400, { error: 'invalid', at: 'type' });
    filter.type = type;
  }
  const pilotCode = params.get('pilotCode');
  if (pilotCode !== null) {
    if (!PILOT_CODE_PATTERN.test(pilotCode)) return json(400, { error: 'invalid', at: 'pilotCode' });
    filter.pilotCode = pilotCode;
  }
  for (const key of ['from', 'to'] as const) {
    const value = params.get(key);
    if (value === null) continue;
    if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) return json(400, { error: 'invalid', at: key });
    filter[key] = value;
  }

  const db = deps.db(env.DATABASE_URL);
  const encoder = new TextEncoder();
  let cursor: string | null = null;
  let first = true;
  let finished = false;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (finished) return;
      try {
        if (first) {
          controller.enqueue(encoder.encode(format === 'csv' ? `${CSV_HEADER.join(',')}\n` : '['));
        }
        const rows = await db.page(filter, cursor, PAGE_SIZE);
        let out = '';
        for (const row of rows) {
          if (format === 'csv') out += csvLine(row);
          else out += `${first ? '' : ','}\n${JSON.stringify(row)}`;
          first = false;
        }
        first = false;
        if (out) controller.enqueue(encoder.encode(out));
        const last = rows[rows.length - 1];
        if (rows.length < PAGE_SIZE || !last) {
          if (format === 'json') controller.enqueue(encoder.encode('\n]\n'));
          finished = true;
          controller.close();
        } else {
          cursor = `${last.received_at}|${last.id}`;
        }
      } catch {
        // The database's message can hold a host name or a key: say nothing, and end the stream with an error.
        finished = true;
        controller.error(new Error('export failed'));
      }
    },
  });
  const day = new Date().toISOString().slice(0, 10);
  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="thinkerwell-${org}-${day}.${format}"`,
      'cache-control': 'no-store',
    },
  });
}
