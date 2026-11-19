/**
 * The database behind /api/classes (db/classes.sql). Plain SQL with numbered
 * parameters, run through a small `Runner`, so the same queries run on the
 * real database (`postgresRunner`, the `postgres` client: Neon, Supabase's
 * pooler or Vercel Postgres) and, in the tests, on PGlite in memory.
 */
import postgres from 'postgres';
import { CLASSES_SCHEMA } from './classesSchema.js';
import type { AdminStats, ClassDetail, ClassSummary, OrgSummary, ProgramOverview, SyncLearner, SyncStage, ViewLearner } from '../../src/classes/protocol.js';

export interface Runner {
  query<T = Record<string, unknown>>(text: string, params?: readonly unknown[]): Promise<T[]>;
  /** Runs several statements with no parameters (the schema). */
  exec(text: string): Promise<void>;
  transaction<R>(work: (runner: Runner) => Promise<R>): Promise<R>;
}

type Sql = ReturnType<typeof postgres>;
const clients = new Map<string, Sql>();

/** A runner on a real Postgres. One connection per function instance, opened on first use. */
export function postgresRunner(url: string): Runner {
  let sql = clients.get(url);
  if (!sql) {
    // prepare: false, so it also works through a transaction pooler (Supabase, Neon's pooled string).
    sql = postgres(url, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
    clients.set(url, sql);
  }
  const wrap = (run: Sql | postgres.TransactionSql): Runner => ({
    async query<T>(text: string, params: readonly unknown[] = []) {
      return (await run.unsafe(text, params as postgres.ParameterOrJSON<never>[])) as unknown as T[];
    },
    async exec(text: string) {
      await run.unsafe(text).simple();
    },
    async transaction<R>(work: (runner: Runner) => Promise<R>) {
      if ('begin' in run) return (await run.begin((tx) => work(wrap(tx)))) as R;
      return work(wrap(run));
    },
  });
  return wrap(sql);
}

/**
 * Makes the online classes' tables if they aren't there yet (db/classes.sql,
 * all "if not exists"). Two new instances may race to make them; the loser's
 * error is harmless, so it checks again once before giving up.
 */
export async function ensureClassesSchema(db: Runner): Promise<void> {
  try {
    await db.exec(CLASSES_SCHEMA);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await db.exec(CLASSES_SCHEMA);
  }
}

export interface OpenClass {
  classId: string;
  className: string;
  orgName: string;
}

export interface ClassesDb {
  /** An open class (not archived, its organisation enabled) by its join code. */
  openClass(code: string): Promise<OpenClass | null>;
  /** What a sync needs to know about a learner id: whose it is, or that a teacher removed it. */
  learnerState(id: string): Promise<{ removed: true } | { removed: false; classId: string; secretHash: string } | null>;
  /** Adds or updates a learner in a class with everything their device sent, in one transaction. */
  saveLearner(classId: string, learner: SyncLearner, secretHash: string, now: Date): Promise<void>;
  /** Deletes a learner and everything about them, if the secret is theirs. */
  forgetLearner(id: string, secretHash: string): Promise<boolean>;

  orgByKey(keyHash: string): Promise<{ id: string; name: string; enabled: boolean } | null>;
  classByKey(keyHash: string): Promise<{ id: string; orgId: string } | null>;
  classOrg(classId: string): Promise<string | null>;
  program(orgId: string, now: Date): Promise<ProgramOverview | null>;
  /** A class with its learners: names for a teacher or organisation, numbers only for the admin dashboard. */
  classDetail(classId: string, withNames: boolean): Promise<ClassDetail | null>;
  /** Makes a class; false if the code is taken (the caller tries another). */
  createClass(orgId: string, name: string, code: string, keyHash: string): Promise<string | false>;
  setClassKey(classId: string, keyHash: string): Promise<void>;
  setClassArchived(classId: string, archived: boolean): Promise<void>;
  renameClass(classId: string, name: string): Promise<void>;
  /** Takes a learner out of a class: deletes everything about them and remembers only the id. */
  removeFromClass(classId: string, learnerId: string): Promise<boolean>;

  createOrg(name: string, keyHash: string): Promise<string>;
  setOrgKey(orgId: string, keyHash: string): Promise<boolean>;
  setOrgEnabled(orgId: string, enabled: boolean): Promise<boolean>;
  adminStats(now: Date): Promise<AdminStats>;
}

const n = (value: unknown): number => Number(value ?? 0);
const iso = (value: unknown): string | null => (value === null || value === undefined ? null : new Date(value as string).toISOString());
const day = (value: unknown): string => (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10);

export function classesDb(db: Runner): ClassesDb {
  async function summaries(orgId: string, now: Date): Promise<ClassSummary[]> {
    const rows = await db.query<Record<string, unknown>>(
      `select c.id::text as id, c.name, c.code, c.created_at, c.archived,
         (select count(*) from cv_learners l where l.class_id = c.id) as learners,
         (select count(distinct d.learner_id) from cv_active_days d join cv_learners l on l.id = d.learner_id
            where l.class_id = c.id and d.day > ($2::timestamptz - interval '7 days')::date) as active,
         (select count(*) from cv_progress p join cv_learners l on l.id = p.learner_id
            where l.class_id = c.id and p.completed_at is not null) as finished
       from cv_classes c where c.org_id = $1 order by c.archived, c.created_at`,
      [orgId, now.toISOString()],
    );
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      code: String(row.code),
      createdAt: iso(row.created_at)!,
      archived: Boolean(row.archived),
      learners: n(row.learners),
      activeThisWeek: n(row.active),
      lessonsFinished: n(row.finished),
    }));
  }

  return {
    async openClass(code) {
      const rows = await db.query<{
        id: string;
        name: string;
        org_name: string;
      }>(
        `select c.id::text as id, c.name, o.name as org_name from cv_classes c join cv_orgs o on o.id = c.org_id
         where c.code = $1 and not c.archived and o.enabled`,
        [code],
      );
      const row = rows[0];
      return row ? { classId: row.id, className: row.name, orgName: row.org_name } : null;
    },

    async learnerState(id) {
      const removed = await db.query(`select 1 from cv_removed where id = $1`, [id]);
      if (removed.length) return { removed: true };
      const rows = await db.query<{ class_id: string; secret_hash: string }>(`select class_id::text as class_id, secret_hash from cv_learners where id = $1`, [id]);
      const row = rows[0];
      return row ? { removed: false, classId: row.class_id, secretHash: row.secret_hash } : null;
    },

    async saveLearner(classId, learner, secretHash, now) {
      const received = now.getTime();
      // Times from the device may be wrong: never later than now, never before 2026.
      const clamp = (value: string | null): string | null => {
        if (!value) return null;
        const ms = Math.min(Date.parse(value), received);
        return ms < Date.UTC(2026, 0, 1) ? null : new Date(ms).toISOString();
      };
      const latest = learner.progress.reduce<string | null>((best, p) => {
        const t = clamp(p.updatedAt);
        return t && (!best || t > best) ? t : best;
      }, null);
      await db.transaction(async (tx) => {
        await tx.query(
          `insert into cv_learners (id, class_id, secret_hash, nickname, language, reading_level, joined_at, last_sync_at, last_active_at)
           values ($1, $2, $3, $4, $5, $6, $7, $7, $8)
           on conflict (id) do update set nickname = excluded.nickname, language = excluded.language,
             reading_level = excluded.reading_level, last_sync_at = excluded.last_sync_at,
             last_active_at = greatest(cv_learners.last_active_at, excluded.last_active_at)`,
          [learner.id, classId, secretHash, learner.nickname, learner.language, learner.readingLevel, now.toISOString(), latest],
        );
        // The device sends the whole picture each time, so what it no longer has goes.
        await tx.query(`delete from cv_progress where learner_id = $1`, [learner.id]);
        for (const p of learner.progress) {
          // The steps go as an array: both drivers send it to a jsonb parameter as JSON themselves.
          await tx.query(
            `insert into cv_progress (learner_id, lesson_id, course_id, stages_done, current_stage, started_at, updated_at, completed_at)
             values ($1, $2, $3, array(select jsonb_array_elements_text($4::jsonb)), $5, $6, $7, $8)`,
            [learner.id, p.lessonId, p.courseId, p.stagesDone, p.currentStage, clamp(p.startedAt), clamp(p.updatedAt), clamp(p.completedAt)],
          );
        }
        await tx.query(`delete from cv_checks where learner_id = $1`, [learner.id]);
        for (const c of learner.checks) {
          await tx.query(`insert into cv_checks (learner_id, section_id, attempts, last_at) values ($1, $2, $3, $4)`, [learner.id, c.sectionId, c.attempts, clamp(c.lastAt)]);
        }
        const today = new Date(received + 14 * 3600_000).toISOString().slice(0, 10);
        const earliest = new Date(received - 400 * 86_400_000).toISOString().slice(0, 10);
        for (const d of learner.days) {
          if (d > today || d < earliest) continue;
          await tx.query(`insert into cv_active_days (learner_id, day) values ($1, $2::date) on conflict do nothing`, [learner.id, d]);
        }
      });
    },

    async forgetLearner(id, secretHash) {
      const rows = await db.query(`delete from cv_learners where id = $1 and secret_hash = $2 returning id`, [id, secretHash]);
      return rows.length > 0;
    },

    async orgByKey(keyHash) {
      const rows = await db.query<{
        id: string;
        name: string;
        enabled: boolean;
      }>(`select id::text as id, name, enabled from cv_orgs where key_hash = $1`, [keyHash]);
      return rows[0] ?? null;
    },

    async classByKey(keyHash) {
      const rows = await db.query<{ id: string; org_id: string }>(
        `select c.id::text as id, c.org_id::text as org_id from cv_classes c join cv_orgs o on o.id = c.org_id where c.key_hash = $1 and o.enabled`,
        [keyHash],
      );
      const row = rows[0];
      return row ? { id: row.id, orgId: row.org_id } : null;
    },

    async classOrg(classId) {
      const rows = await db.query<{ org_id: string }>(`select org_id::text as org_id from cv_classes where id = $1`, [classId]);
      return rows[0]?.org_id ?? null;
    },

    async program(orgId, now) {
      const rows = await db.query<{ id: string; name: string }>(`select id::text as id, name from cv_orgs where id = $1`, [orgId]);
      const org = rows[0];
      if (!org) return null;
      return {
        id: org.id,
        name: org.name,
        classes: await summaries(orgId, now),
      };
    },

    async classDetail(classId, withNames) {
      const classes = await db.query<Record<string, unknown>>(
        `select c.id::text as id, c.name, c.code, c.created_at, c.archived, o.name as org_name
         from cv_classes c join cv_orgs o on o.id = c.org_id where c.id = $1`,
        [classId],
      );
      const c = classes[0];
      if (!c) return null;
      const learners = await db.query<Record<string, unknown>>(
        `select id::text as id, nickname, language, reading_level, joined_at, last_active_at,
           row_number() over (order by joined_at, id) as number
         from cv_learners where class_id = $1`,
        [classId],
      );
      const progress = await db.query<Record<string, unknown>>(
        `select p.learner_id::text as learner_id, p.lesson_id, p.course_id, p.stages_done, p.current_stage, p.updated_at, p.completed_at
         from cv_progress p join cv_learners l on l.id = p.learner_id where l.class_id = $1`,
        [classId],
      );
      const checks = await db.query<Record<string, unknown>>(
        `select k.learner_id::text as learner_id, k.section_id, k.attempts
         from cv_checks k join cv_learners l on l.id = k.learner_id where l.class_id = $1`,
        [classId],
      );
      const byId = new Map<string, ViewLearner>();
      for (const row of learners) {
        byId.set(String(row.id), {
          // The admin dashboard gets no id either: only the number, which means nothing outside this class.
          id: withNames ? String(row.id) : `learner-${n(row.number)}`,
          name: withNames ? String(row.nickname) : null,
          number: n(row.number),
          language: (row.language as string | null) ?? null,
          readingLevel: (row.reading_level as 'standard' | 'simpler' | null) ?? null,
          joinedAt: iso(row.joined_at)!,
          lastActiveAt: iso(row.last_active_at),
          progress: [],
          checks: [],
        });
      }
      for (const row of progress) {
        byId.get(String(row.learner_id))?.progress.push({
          lessonId: String(row.lesson_id),
          courseId: String(row.course_id),
          stagesDone: (row.stages_done as SyncStage[]) ?? [],
          currentStage: (row.current_stage as SyncStage | null) ?? null,
          updatedAt: iso(row.updated_at),
          completedAt: iso(row.completed_at),
        });
      }
      for (const row of checks)
        byId.get(String(row.learner_id))?.checks.push({
          sectionId: String(row.section_id),
          attempts: n(row.attempts),
        });
      return {
        id: String(c.id),
        name: String(c.name),
        code: String(c.code),
        orgName: String(c.org_name),
        createdAt: iso(c.created_at)!,
        archived: Boolean(c.archived),
        learners: [...byId.values()].sort((a, b) => a.number - b.number),
      };
    },

    async createClass(orgId, name, code, keyHash) {
      const rows = await db.query<{ id: string }>(
        `insert into cv_classes (org_id, name, code, key_hash) values ($1, $2, $3, $4) on conflict (code) do nothing returning id::text as id`,
        [orgId, name, code, keyHash],
      );
      return rows[0]?.id ?? false;
    },

    async setClassKey(classId, keyHash) {
      await db.query(`update cv_classes set key_hash = $2 where id = $1`, [classId, keyHash]);
    },

    async setClassArchived(classId, archived) {
      await db.query(`update cv_classes set archived = $2 where id = $1`, [classId, archived]);
    },

    async renameClass(classId, name) {
      await db.query(`update cv_classes set name = $2 where id = $1`, [classId, name]);
    },

    async removeFromClass(classId, learnerId) {
      return db.transaction(async (tx) => {
        const rows = await tx.query(`delete from cv_learners where id = $1 and class_id = $2 returning id`, [learnerId, classId]);
        if (!rows.length) return false;
        await tx.query(`insert into cv_removed (id) values ($1) on conflict do nothing`, [learnerId]);
        return true;
      });
    },

    async createOrg(name, keyHash) {
      const rows = await db.query<{ id: string }>(`insert into cv_orgs (name, key_hash) values ($1, $2) returning id::text as id`, [name, keyHash]);
      return rows[0]!.id;
    },

    async setOrgKey(orgId, keyHash) {
      return (await db.query(`update cv_orgs set key_hash = $2 where id = $1 returning id`, [orgId, keyHash])).length > 0;
    },

    async setOrgEnabled(orgId, enabled) {
      return (await db.query(`update cv_orgs set enabled = $2 where id = $1 returning id`, [orgId, enabled])).length > 0;
    },

    async adminStats(now) {
      const at = now.toISOString();
      const [totals] = await db.query<Record<string, unknown>>(
        `select
           (select count(*) from cv_orgs) as orgs,
           (select count(*) from cv_classes) as classes,
           (select count(*) from cv_learners) as learners,
           (select count(distinct learner_id) from cv_active_days where day > ($1::timestamptz - interval '7 days')::date) as active7,
           (select count(distinct learner_id) from cv_active_days where day > ($1::timestamptz - interval '30 days')::date) as active30,
           (select count(*) from cv_progress) as started,
           (select count(*) from cv_progress where completed_at is not null) as finished,
           (select coalesce(sum(cardinality(stages_done)), 0) from cv_progress) as stages,
           (select coalesce(sum(attempts), 0) from cv_checks) as checks`,
        [at],
      );
      const weeks = await db.query<Record<string, unknown>>(
        `with w as (
           select generate_series(date_trunc('week', $1::timestamptz) - interval '11 weeks', date_trunc('week', $1::timestamptz), interval '1 week') as start
         )
         select w.start::date as week,
           (select count(*) from cv_learners l where l.joined_at >= w.start and l.joined_at < w.start + interval '1 week') as new_learners,
           (select count(distinct d.learner_id) from cv_active_days d where d.day >= w.start::date and d.day < (w.start + interval '1 week')::date) as active,
           (select count(*) from cv_progress p where p.completed_at >= w.start and p.completed_at < w.start + interval '1 week') as finished
         from w order by w.start`,
        [at],
      );
      const courses = await db.query<Record<string, unknown>>(
        `select course_id, count(distinct learner_id) as learners, count(*) as started, count(completed_at) as finished
         from cv_progress group by course_id order by count(*) desc`,
      );
      const languages = await db.query<Record<string, unknown>>(`select coalesce(language, 'en') as language, count(*) as learners from cv_learners group by 1 order by 2 desc`);
      const levels = await db.query<Record<string, unknown>>(
        `select coalesce(reading_level, 'standard') as level, count(*) as learners from cv_learners group by 1 order by 2 desc`,
      );
      const stages = await db.query<Record<string, unknown>>(
        `select s.stage, count(p.*) as lessons
         from unnest(array['read','write','speak','watch','reflect']) with ordinality as s(stage, i)
         left join cv_progress p on s.stage = any(p.stages_done)
         group by s.stage, s.i order by s.i`,
      );
      const dropOff = await db.query<Record<string, unknown>>(
        `select lesson_id, min(course_id) as course_id, count(*) as started, count(completed_at) as finished
         from cv_progress group by lesson_id having count(*) >= 3
         order by (count(*) - count(completed_at))::float / count(*) desc, count(*) desc limit 10`,
      );
      const [retention] = await db.query<Record<string, unknown>>(
        `select count(*) as cohort,
           count(*) filter (where exists (
             select 1 from cv_active_days d where d.learner_id = l.id and d.day >= (l.joined_at + interval '7 days')::date)) as returned
         from cv_learners l
         where l.joined_at <= $1::timestamptz - interval '14 days' and l.joined_at > $1::timestamptz - interval '90 days'`,
        [at],
      );
      const bands = await db.query<Record<string, unknown>>(
        `with f as (
           select l.id, count(p.completed_at) as finished from cv_learners l left join cv_progress p on p.learner_id = l.id group by l.id
         )
         select b.band, count(f.id) as learners
         from (values ('0', 0, 0, 1), ('1–2', 1, 2, 2), ('3–5', 3, 5, 3), ('6–10', 6, 10, 4), ('11–24', 11, 24, 5), ('25+', 25, 100000, 6)) as b(band, lo, hi, i)
         left join f on f.finished between b.lo and b.hi
         group by b.band, b.i order by b.i`,
      );
      const orgs = await db.query<Record<string, unknown>>(
        `select o.id::text as id, o.name, o.enabled, o.created_at,
           (select count(*) from cv_classes c where c.org_id = o.id) as classes,
           (select count(*) from cv_learners l join cv_classes c on c.id = l.class_id where c.org_id = o.id) as learners,
           (select count(distinct d.learner_id) from cv_active_days d join cv_learners l on l.id = d.learner_id join cv_classes c on c.id = l.class_id
              where c.org_id = o.id and d.day > ($1::timestamptz - interval '7 days')::date) as active,
           (select count(*) from cv_progress p join cv_learners l on l.id = p.learner_id join cv_classes c on c.id = l.class_id
              where c.org_id = o.id and p.completed_at is not null) as finished
         from cv_orgs o order by o.created_at`,
        [at],
      );
      return {
        generatedAt: at,
        totals: {
          orgs: n(totals?.orgs),
          classes: n(totals?.classes),
          learners: n(totals?.learners),
          active7: n(totals?.active7),
          active30: n(totals?.active30),
          lessonsStarted: n(totals?.started),
          lessonsFinished: n(totals?.finished),
          stagesDone: n(totals?.stages),
          checksTried: n(totals?.checks),
        },
        weeks: weeks.map((row) => ({
          week: day(row.week),
          newLearners: n(row.new_learners),
          activeLearners: n(row.active),
          lessonsFinished: n(row.finished),
        })),
        courses: courses.map((row) => ({
          courseId: String(row.course_id),
          learners: n(row.learners),
          lessonsStarted: n(row.started),
          lessonsFinished: n(row.finished),
        })),
        languages: languages.map((row) => ({
          language: String(row.language),
          learners: n(row.learners),
        })),
        readingLevels: levels.map((row) => ({
          level: String(row.level),
          learners: n(row.learners),
        })),
        stages: stages.map((row) => ({
          stage: row.stage as SyncStage,
          lessons: n(row.lessons),
        })),
        dropOff: dropOff.map((row) => ({
          lessonId: String(row.lesson_id),
          courseId: String(row.course_id),
          started: n(row.started),
          finished: n(row.finished),
        })),
        retention: {
          cohort: n(retention?.cohort),
          returned: n(retention?.returned),
        },
        finishedBands: bands.map((row) => ({
          band: String(row.band),
          learners: n(row.learners),
        })),
        orgs: orgs.map((row): OrgSummary => ({
          id: String(row.id),
          name: String(row.name),
          enabled: Boolean(row.enabled),
          createdAt: iso(row.created_at)!,
          classes: n(row.classes),
          learners: n(row.learners),
          activeThisWeek: n(row.active),
          lessonsFinished: n(row.finished),
        })),
      };
    },
  };
}
