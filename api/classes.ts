/**
 * /api/classes (docs/notes/online-classes.md): online classes, for
 * organisations that have agreed to use them. Everything it does is in
 * ./_lib/classes.ts.
 */
import { Limiter, handleClasses } from './_lib/classes.js';
import { classesDb, ensureClassesSchema, postgresRunner } from './_lib/classesDb.js';

const limit = new Limiter();
// The tables are made the first time an instance is asked anything (db/classes.sql), so switching
// online classes on needs no SQL by hand; a failure is tried again with the next request.
let schema: Promise<void> | undefined;
const prepare = (url: string) => {
  schema ??= ensureClassesSchema(postgresRunner(url)).catch((error: unknown) => {
    schema = undefined;
    throw error;
  });
  return schema;
};
const run = (request: Request) =>
  handleClasses(request, { env: process.env, db: (url) => classesDb(postgresRunner(url)), prepare, limit, now: () => new Date() });

export function GET(request: Request): Promise<Response> {
  return run(request);
}

export function POST(request: Request): Promise<Response> {
  return run(request);
}
