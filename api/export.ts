/**
 * GET /api/export (docs/notes/pilot-measurement.md): the team's export of
 * one organisation's pilot results. Needs EXPORT_TOKEN. Everything it does
 * is in ./_lib/export.ts.
 */
import { exportDb } from './_lib/db.js';
import { handleExport } from './_lib/export.js';

export function GET(request: Request): Response {
  return handleExport(request, { env: process.env, db: exportDb });
}
