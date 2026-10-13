/**
 * POST /api/events (docs/notes/pilot-measurement.md). The app sends pilot
 * measurement events here, same-origin, only when a device is set to share
 * results. Everything it does is in ./_lib/events.ts.
 */
import { eventsDb } from './_lib/db.js';
import { handleEvents } from './_lib/events.js';

export async function POST(request: Request): Promise<Response> {
  return handleEvents(request, { env: process.env, db: eventsDb });
}
