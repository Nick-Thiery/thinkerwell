/**
 * /api/classes (docs/notes/online-classes.md): online classes, for
 * organisations that have agreed to use them. One function for everything,
 * by `action`:
 *
 *   GET  ?action=lookup&code=K7M-Q4P   a class's name and its organisation's, before a learner joins
 *   POST {action: 'sync', …}           a device's learners' progress (src/classes/protocol.ts), and who stopped sharing
 *
 * With a secret link's key as `Authorization: Bearer <key>`:
 *
 *   teacher (a class's key)       GET ?action=class; POST class.removeLearner
 *   organisation (its key)        GET ?action=program, ?action=program.class&id=; POST program.createClass,
 *                                 program.newTeacherLink, program.renameClass, program.archiveClass, program.removeLearner
 *   Thinkerwell (CLASSES_ADMIN_TOKEN)  GET ?action=admin, ?action=admin.org&id=, ?action=admin.class&id= (no names);
 *                                 POST admin.createOrg, admin.newOrgLink, admin.setOrgEnabled
 *
 * Answers 503 until DATABASE_URL and CLASSES_ADMIN_TOKEN are both set, and
 * nothing is kept about anyone until Thinkerwell makes an organisation, it
 * makes a class, and a learner taps "Join class" with the class's code.
 * Keys are kept only as their sha256; a connection's address is held in
 * memory, only to count its requests.
 */
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { CLASS_CODE_ALPHABET, CLASS_CODE_PATTERN, MAX_SYNC_BYTES, checkSyncRequest, cleanName, type SyncOutcome } from '../../src/classes/protocol.js';
import type { ClassesDb } from './classesDb.js';
import { isCrossSite, json, readLimitedText } from './http.js';

export interface ClassesEnv {
  DATABASE_URL?: string | undefined;
  /** Thinkerwell's own key for the admin dashboard (/admin); at least 32 characters. Without it, /api/classes answers 503. */
  CLASSES_ADMIN_TOKEN?: string | undefined;
}

export interface ClassesDeps {
  env: ClassesEnv;
  db: (url: string) => ClassesDb;
  limit: Limiter;
  now: () => Date;
}

const WINDOW_MS = 60_000;
/** Requests one connection may make a minute: a class shares one connection, so generous. */
export const PER_CONNECTION = 240;
/** Wrong keys one connection may try a minute, before it waits. */
export const BAD_KEYS_PER_CONNECTION = 20;

/** Counts requests per connection over a sliding minute. In memory only. */
export class Limiter {
  private readonly times = new Map<string, number[]>();

  take(key: string, now: number, max: number): boolean {
    const since = now - WINDOW_MS;
    for (const [other, list] of this.times) {
      const kept = list.filter((time) => time > since);
      if (kept.length === 0) this.times.delete(other);
      else this.times.set(other, kept);
    }
    const mine = this.times.get(key) ?? [];
    if (mine.length >= max) return false;
    this.times.set(key, [...mine, now]);
    return true;
  }

  /** True while this connection may still try. */
  allows(key: string, now: number, max: number): boolean {
    const mine = (this.times.get(key) ?? []).filter((time) => time > now - WINDOW_MS);
    return mine.length < max;
  }
}

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** A new secret link key: 32 random bytes, URL-safe (43 characters). */
export function newKey(): string {
  return randomBytes(32).toString('base64url');
}

export function newClassCode(): string {
  const pick = () => CLASS_CODE_ALPHABET[randomInt(CLASS_CODE_ALPHABET.length)]!;
  return `${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}`;
}

const KEY = /^[A-Za-z0-9_-]{32,128}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function connectionOf(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function bearer(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/.exec(header);
  return match && KEY.test(match[1]!) ? match[1]! : null;
}

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(hashKey(a), 'hex');
  const y = Buffer.from(hashKey(b), 'hex');
  return timingSafeEqual(x, y);
}

export function isConfigured(env: ClassesEnv): boolean {
  return Boolean(env.DATABASE_URL) && (env.CLASSES_ADMIN_TOKEN ?? '').length >= 32;
}

type Who = { kind: 'teacher'; classId: string; orgId: string } | { kind: 'program'; orgId: string } | { kind: 'admin' };

export async function handleClasses(request: Request, deps: ClassesDeps): Promise<Response> {
  const { env } = deps;
  if (request.method !== 'GET' && request.method !== 'POST') return json(405, { error: 'method' }, { allow: 'GET, POST' });
  if (!isConfigured(env)) return json(503, { error: 'not-configured' });
  const now = deps.now();
  const connection = connectionOf(request);
  if (!deps.limit.take(`all:${connection}`, now.getTime(), PER_CONNECTION)) return json(429, { error: 'too_many' }, { 'retry-after': '60' });
  if (request.method === 'POST' && isCrossSite(request)) return json(403, { error: 'cross-site' });

  const url = new URL(request.url);
  let body: Record<string, unknown> = {};
  let action = url.searchParams.get('action') ?? '';
  if (request.method === 'POST') {
    const text = await readLimitedText(request, MAX_SYNC_BYTES);
    if (text === null) return json(413, { error: 'too_big' });
    try {
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return json(400, { error: 'invalid' });
      body = parsed as Record<string, unknown>;
    } catch {
      return json(400, { error: 'invalid' });
    }
    action = typeof body.action === 'string' ? body.action : '';
  }

  const db = deps.db(env.DATABASE_URL!);

  // Anyone: a learner's device.
  if (action === 'lookup' && request.method === 'GET') {
    if (!deps.limit.allows(`bad:${connection}`, now.getTime(), BAD_KEYS_PER_CONNECTION)) return json(429, { error: 'too_many' }, { 'retry-after': '60' });
    const code = url.searchParams.get('code') ?? '';
    const found = CLASS_CODE_PATTERN.test(code) ? await db.openClass(code) : null;
    if (!found) {
      deps.limit.take(`bad:${connection}`, now.getTime(), Number.MAX_SAFE_INTEGER);
      return json(404, { error: 'unknown-class' });
    }
    return json(200, { className: found.className, orgName: found.orgName });
  }

  if (action === 'sync' && request.method === 'POST') {
    const sync = checkSyncRequest(body);
    if (!sync) return json(400, { error: 'invalid' });
    const results: Record<string, SyncOutcome> = {};
    for (const removal of sync.removals) {
      await db.forgetLearner(removal.id, hashKey(removal.secret));
    }
    const classes = new Map<string, Awaited<ReturnType<ClassesDb['openClass']>>>();
    for (const learner of sync.learners) {
      if (!classes.has(learner.classCode)) classes.set(learner.classCode, await db.openClass(learner.classCode));
      const state = await db.learnerState(learner.id);
      if (state?.removed) {
        results[learner.id] = 'removed';
        continue;
      }
      if (state && state.secretHash !== hashKey(learner.secret)) {
        results[learner.id] = 'forbidden';
        continue;
      }
      const open = classes.get(learner.classCode);
      if (!open) {
        // A class that was closed, or an organisation switched off: a learner already in it stops sharing.
        results[learner.id] = state ? 'removed' : 'unknown-class';
        continue;
      }
      if (state && state.classId !== open.classId) {
        results[learner.id] = 'forbidden';
        continue;
      }
      await db.saveLearner(open.classId, learner, hashKey(learner.secret), now);
      results[learner.id] = 'saved';
    }
    return json(200, { results });
  }

  // Everything else needs a key.
  if (!deps.limit.allows(`bad:${connection}`, now.getTime(), BAD_KEYS_PER_CONNECTION)) return json(429, { error: 'too_many' }, { 'retry-after': '60' });
  const key = bearer(request);
  let signedIn: Who | null = null;
  if (key) {
    if (action.startsWith('admin')) {
      if (sameSecret(key, env.CLASSES_ADMIN_TOKEN!)) signedIn = { kind: 'admin' };
    } else if (action.startsWith('program')) {
      const org = await db.orgByKey(hashKey(key));
      if (org?.enabled) signedIn = { kind: 'program', orgId: org.id };
    } else if (action.startsWith('class')) {
      const found = await db.classByKey(hashKey(key));
      if (found) signedIn = { kind: 'teacher', classId: found.id, orgId: found.orgId };
    }
  }
  if (!signedIn) {
    deps.limit.take(`bad:${connection}`, now.getTime(), Number.MAX_SAFE_INTEGER);
    return json(key ? 403 : 401, { error: key ? 'wrong-key' : 'no-key' });
  }
  const who: Who = signedIn;

  const id = (value: unknown): string | null => (typeof value === 'string' && UUID.test(value) ? value : null);
  /** For an organisation: a class that is theirs. */
  const theirClass = async (value: unknown): Promise<string | null> => {
    const classId = id(value);
    if (!classId || who.kind !== 'program') return null;
    return (await db.classOrg(classId)) === who.orgId ? classId : null;
  };
  const notFound = () => json(404, { error: 'not-found' });

  switch (`${request.method} ${action}`) {
    case 'GET class': {
      if (who.kind !== 'teacher') break;
      return json(200, await db.classDetail(who.classId, true));
    }
    case 'POST class.removeLearner': {
      if (who.kind !== 'teacher') break;
      const learnerId = id(body.learnerId);
      return learnerId && (await db.removeFromClass(who.classId, learnerId)) ? json(200, { removed: true }) : notFound();
    }

    case 'GET program': {
      if (who.kind !== 'program') break;
      return json(200, await db.program(who.orgId, now));
    }
    case 'GET program.class': {
      const classId = await theirClass(url.searchParams.get('id'));
      return classId ? json(200, await db.classDetail(classId, true)) : notFound();
    }
    case 'POST program.createClass': {
      if (who.kind !== 'program') break;
      const name = cleanName(body.name);
      if (!name) return json(400, { error: 'invalid', fields: { name: 'invalid' } });
      const teacherKey = newKey();
      for (let tries = 0; tries < 8; tries++) {
        const code = newClassCode();
        const classId = await db.createClass(who.orgId, name, code, hashKey(teacherKey));
        if (classId) return json(200, { id: classId, code, name, teacherKey });
      }
      return json(500, { error: 'no-code' });
    }
    case 'POST program.newTeacherLink': {
      const classId = await theirClass(body.classId);
      if (!classId) return notFound();
      const teacherKey = newKey();
      await db.setClassKey(classId, hashKey(teacherKey));
      return json(200, { teacherKey });
    }
    case 'POST program.renameClass': {
      const classId = await theirClass(body.classId);
      if (!classId) return notFound();
      const name = cleanName(body.name);
      if (!name) return json(400, { error: 'invalid', fields: { name: 'invalid' } });
      await db.renameClass(classId, name);
      return json(200, { name });
    }
    case 'POST program.archiveClass': {
      const classId = await theirClass(body.classId);
      if (!classId || typeof body.archived !== 'boolean') return notFound();
      await db.setClassArchived(classId, body.archived);
      return json(200, { archived: body.archived });
    }
    case 'POST program.removeLearner': {
      const classId = await theirClass(body.classId);
      const learnerId = id(body.learnerId);
      return classId && learnerId && (await db.removeFromClass(classId, learnerId)) ? json(200, { removed: true }) : notFound();
    }

    case 'GET admin': {
      if (who.kind !== 'admin') break;
      return json(200, await db.adminStats(now));
    }
    case 'GET admin.org': {
      if (who.kind !== 'admin') break;
      const orgId = id(url.searchParams.get('id'));
      const program = orgId ? await db.program(orgId, now) : null;
      return program ? json(200, program) : notFound();
    }
    case 'GET admin.class': {
      if (who.kind !== 'admin') break;
      const classId = id(url.searchParams.get('id'));
      // No names, ever, on the admin dashboard.
      const detail = classId ? await db.classDetail(classId, false) : null;
      return detail ? json(200, detail) : notFound();
    }
    case 'POST admin.createOrg': {
      if (who.kind !== 'admin') break;
      const name = cleanName(body.name);
      if (!name) return json(400, { error: 'invalid', fields: { name: 'invalid' } });
      const orgKey = newKey();
      const orgId = await db.createOrg(name, hashKey(orgKey));
      return json(200, { id: orgId, name, orgKey });
    }
    case 'POST admin.newOrgLink': {
      if (who.kind !== 'admin') break;
      const orgId = id(body.orgId);
      const orgKey = newKey();
      return orgId && (await db.setOrgKey(orgId, hashKey(orgKey))) ? json(200, { orgKey }) : notFound();
    }
    case 'POST admin.setOrgEnabled': {
      if (who.kind !== 'admin') break;
      const orgId = id(body.orgId);
      if (!orgId || typeof body.enabled !== 'boolean') return notFound();
      return (await db.setOrgEnabled(orgId, body.enabled)) ? json(200, { enabled: body.enabled }) : notFound();
    }
  }
  return json(400, { error: 'unknown-action' });
}
