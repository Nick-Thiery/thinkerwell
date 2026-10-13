/**
 * The database, behind two small interfaces (./events.ts, ./export.ts), so
 * the handlers are tested without one. `postgres` is a plain Postgres
 * client: it works with Neon, Supabase (use the pooler's connection string)
 * and Vercel Postgres alike. One connection per function instance, opened
 * on first use.
 */
import postgres from 'postgres';
import type { MeasurementEvent } from '../../src/measurement/events.js';
import type { EventsDb } from './events.js';
import type { ExportDb, ExportFilter, ExportRow } from './export.js';

type Sql = ReturnType<typeof postgres>;
const clients = new Map<string, Sql>();

function connect(url: string): Sql {
  let sql = clients.get(url);
  if (!sql) {
    // prepare: false, so it also works through a transaction pooler (Supabase, Neon's pooled string).
    sql = postgres(url, { max: 1, idle_timeout: 20, connect_timeout: 10, prepare: false });
    clients.set(url, sql);
  }
  return sql;
}

export function eventsDb(url: string): EventsDb {
  const sql = connect(url);
  return {
    async recentCounts(pilotCodes, seconds) {
      const rows = await sql<Array<{ pilot_code: string; n: number }>>`
        select pilot_code, count(*)::int as n
        from events
        where pilot_code in ${sql(pilotCodes as string[])}
          and received_at > now() - make_interval(secs => ${seconds})
        group by pilot_code`;
      return new Map(rows.map((row) => [row.pilot_code, row.n]));
    },
    async insert(events: readonly MeasurementEvent[]) {
      const rows = events.map((event) => ({
        id: event.id,
        org: event.org,
        pilot_code: event.pilotCode,
        device_id: event.deviceId,
        session_id: event.sessionId,
        type: event.type,
        lesson_id: event.lessonId ?? null,
        stage: event.stage ?? null,
        value: sql.json(event.value),
        ts: new Date(event.ts),
        app_version: event.appVersion,
      }));
      const result = await sql`insert into events ${sql(rows)} on conflict (id) do nothing`;
      return result.count;
    },
  };
}

export function exportDb(url: string): ExportDb {
  const sql = connect(url);
  return {
    async page(filter: ExportFilter, after: string | null, limit: number) {
      const rows = await sql<ExportRow[]>`
        select
          id::text as id, org, pilot_code, device_id::text as device_id, session_id::text as session_id,
          type, lesson_id, stage, value,
          to_char(ts at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as ts,
          to_char(received_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as received_at,
          app_version
        from events
        where org = ${filter.org}
          ${filter.type ? sql`and type = ${filter.type}` : sql``}
          ${filter.pilotCode ? sql`and pilot_code = ${filter.pilotCode}` : sql``}
          ${filter.from ? sql`and received_at >= ${filter.from}::timestamptz` : sql``}
          ${filter.to ? sql`and received_at < ${filter.to}::timestamptz` : sql``}
          ${after ? sql`and (received_at, id) > (${after.split('|')[0]!}::timestamptz, ${after.split('|')[1]!}::uuid)` : sql``}
        order by received_at, id
        limit ${limit}`;
      return rows;
    },
  };
}
