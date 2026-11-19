/**
 * /api/classes (docs/notes/online-classes.md): online classes, for
 * organisations that have agreed to use them. Everything it does is in
 * ./_lib/classes.ts.
 */
import { Limiter, handleClasses } from './_lib/classes.js';
import { classesDb, postgresRunner } from './_lib/classesDb.js';

const limit = new Limiter();
const run = (request: Request) => handleClasses(request, { env: process.env, db: (url) => classesDb(postgresRunner(url)), limit, now: () => new Date() });

export function GET(request: Request): Promise<Response> {
  return run(request);
}

export function POST(request: Request): Promise<Response> {
  return run(request);
}
