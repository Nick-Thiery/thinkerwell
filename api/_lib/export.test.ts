// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { CSV_HEADER, csvCell, csvLine, handleExport, PAGE_SIZE, VALUE_COLUMNS, type ExportDb, type ExportFilter, type ExportRow } from './export.js';

const ENV = { DATABASE_URL: 'postgres://u:p@db.example/t', EXPORT_TOKEN: 'a-long-secret-token' };
const AUTH = { authorization: `Bearer ${ENV.EXPORT_TOKEN}` };

function row(n: number, over: Partial<ExportRow> = {}): ExportRow {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    org: 'help-jakarta',
    pilot_code: 'HLP-01',
    device_id: '0a4d8f52-1c3b-4e7a-8b6d-9f2e5c7a1b30',
    session_id: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
    type: 'quick_check_answer',
    lesson_id: 'towns-near-rivers',
    stage: null,
    value: { q: 1, selected: 2, correct: false, attempt: 1 },
    ts: '2026-10-01T09:00:00.000Z',
    received_at: `2026-10-01T09:00:0${n % 10}.000000Z`,
    app_version: '0.1.0',
    ...over,
  };
}

function fakeDb(rows: ExportRow[]) {
  const filters: Array<{ filter: ExportFilter; after: string | null }> = [];
  const db: ExportDb = {
    page: vi.fn((filter: ExportFilter, after: string | null, limit: number) => {
      filters.push({ filter, after });
      const start = after ? rows.findIndex((r) => `${r.received_at}|${r.id}` === after) + 1 : 0;
      return Promise.resolve(rows.slice(start, start + limit));
    }),
  };
  return { db, filters, factory: vi.fn(() => db) };
}

function get(query: string, headers: Record<string, string> = AUTH, env: Record<string, string | undefined> = ENV, rows: ExportRow[] = [row(1)]) {
  const fake = fakeDb(rows);
  const response = handleExport(new Request(`https://thinkerwell.example/api/export${query}`, { headers }), { env, db: fake.factory });
  return Promise.resolve({ response, ...fake });
}

describe('GET /api/export', () => {
  it('answers 503 until it is set up, and never touches a database', async () => {
    for (const env of [{}, { DATABASE_URL: ENV.DATABASE_URL }, { EXPORT_TOKEN: ENV.EXPORT_TOKEN }]) {
      const { response, factory } = await get('?org=help-jakarta', AUTH, env);
      expect(response.status).toBe(503);
      expect(factory).not.toHaveBeenCalled();
    }
  });

  it('answers 401 without the token, or with another', async () => {
    const wrong: Array<Record<string, string>> = [{}, { authorization: 'Bearer nope' }, { authorization: ENV.EXPORT_TOKEN }, { authorization: 'Basic abc' }, { authorization: 'Bearer ' }];
    for (const headers of wrong) {
      const { response, factory } = await get('?org=help-jakarta', headers);
      expect(response.status, JSON.stringify(headers)).toBe(401);
      expect(factory).not.toHaveBeenCalled();
    }
  });

  it('does not take a token in the address', async () => {
    const { response } = await get(`?org=help-jakarta&token=${ENV.EXPORT_TOKEN}`, {});
    expect(response.status).toBe(401);
  });

  it('answers 405 to anything but GET', () => {
    const fake = fakeDb([]);
    const response = handleExport(new Request('https://thinkerwell.example/api/export?org=a1', { method: 'POST', headers: AUTH }), { env: ENV, db: fake.factory });
    expect(response.status).toBe(405);
  });

  it('needs one organisation, so two are never mixed', async () => {
    expect((await get('')).response.status).toBe(400);
    expect((await get('?org=')).response.status).toBe(400);
    expect((await get('?org=Help%20Jakarta')).response.status).toBe(400);
    expect((await get('?org=help-jakarta&org=my-partner')).response.status).toBe(200);
  });

  it('refuses unknown parameters and bad values, naming the parameter', async () => {
    for (const [query, at] of [
      ['?org=help-jakarta&where=1', 'where'],
      ['?org=help-jakarta&format=xml', 'format'],
      ['?org=help-jakarta&type=screenshot', 'type'],
      ['?org=help-jakarta&pilotCode=Amina', 'pilotCode'],
      ['?org=help-jakarta&from=yesterday', 'from'],
      ['?org=help-jakarta&to=2026-13-45', 'to'],
    ] as const) {
      const { response } = await get(query);
      expect(response.status, query).toBe(400);
      expect(await response.json()).toEqual({ error: 'invalid', at });
    }
  });

  it('passes the filter to the database for that organisation only', async () => {
    const { response, filters } = await get('?org=help-jakarta&type=stage_enter&pilotCode=HLP-02&from=2026-10-01&to=2026-10-31T10:00:00Z');
    await response.text();
    expect(filters[0]!.filter).toEqual({ org: 'help-jakarta', type: 'stage_enter', pilotCode: 'HLP-02', from: '2026-10-01', to: '2026-10-31T10:00:00Z' });
  });

  it('gives CSV by default, with a header and a column for each value', async () => {
    const { response } = await get('?org=help-jakarta');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('content-disposition')).toMatch(/^attachment; filename="thinkerwell-help-jakarta-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const lines = (await response.text()).trimEnd().split('\n');
    expect(lines[0]).toBe(CSV_HEADER.join(','));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('HLP-01');
    expect(lines[1]).toContain('towns-near-rivers');
    expect(CSV_HEADER).toContain('v_attempt');
    expect(VALUE_COLUMNS).toEqual([...VALUE_COLUMNS].sort());
  });

  it('gives JSON, a valid array, when asked', async () => {
    const { response } = await get('?org=help-jakarta&format=json', AUTH, ENV, [row(1), row(2), row(3)]);
    expect(response.headers.get('content-type')).toContain('application/json');
    const parsed = JSON.parse(await response.text()) as ExportRow[];
    expect(parsed.map((r) => r.id)).toEqual([row(1).id, row(2).id, row(3).id]);
  });

  it('gives an empty JSON array and a header-only CSV for no events', async () => {
    const json = await get('?org=help-jakarta&format=json', AUTH, ENV, []);
    expect(JSON.parse(await json.response.text())).toEqual([]);
    const csv = await get('?org=help-jakarta', AUTH, ENV, []);
    expect(await csv.response.text()).toBe(`${CSV_HEADER.join(',')}\n`);
  });

  it('reads a long pilot a page at a time', async () => {
    const rows = Array.from({ length: PAGE_SIZE + 5 }, (_, i) => row(i + 1, { received_at: `2026-10-01T09:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}.000000Z` }));
    const { response, filters } = await get('?org=help-jakarta&format=json', AUTH, ENV, rows);
    const parsed = JSON.parse(await response.text()) as ExportRow[];
    expect(parsed).toHaveLength(PAGE_SIZE + 5);
    expect(filters).toHaveLength(2);
    expect(filters[0]!.after).toBeNull();
    expect(filters[1]!.after).toBe(`${rows[PAGE_SIZE - 1]!.received_at}|${rows[PAGE_SIZE - 1]!.id}`);
  });

  it('never puts the database\'s error in the stream', async () => {
    const db: ExportDb = { page: () => Promise.reject(new Error('password authentication failed for user "u" at db.example')) };
    const response = handleExport(new Request('https://thinkerwell.example/api/export?org=help-jakarta', { headers: AUTH }), { env: ENV, db: () => db });
    let text = '';
    await response.text().then(
      (t) => (text = t),
      (error: Error) => (text = error.message),
    );
    expect(text).not.toContain('password');
    expect(text).not.toContain('db.example');
  });
});

describe('CSV cells', () => {
  it('quotes commas, quotes and new lines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(7)).toBe('7');
    expect(csvCell(false)).toBe('false');
  });

  it('stops a spreadsheet running a cell as a formula', () => {
    for (const bad of ['=1+1', '+SUM(A1)', '-2', '@x', '\tx']) expect(csvCell(bad).startsWith("'")).toBe(true);
  });

  it('writes the whole value as JSON in the last column', () => {
    const line = csvLine(row(1));
    expect(line.endsWith('\n')).toBe(true);
    expect(line).toContain('"{""q"":1,""selected"":2,""correct"":false,""attempt"":1}"');
  });
});
