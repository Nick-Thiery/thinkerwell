// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { STUDY_COLLECTION_PAUSED } from '../../src/measurement/paused.js';
import { handleEvents } from './events.js';

const ENV = { DATABASE_URL: 'postgres://user:secret@db.example/thinkerwell', MEASUREMENT_ORGS: 'help-jakarta' };

describe('POST /api/events while study collection is paused', () => {
  it('is paused in this release', () => {
    expect(STUDY_COLLECTION_PAUSED).toBe(true);
  });

  it('stores nothing and never reaches a database, even fully set up', async () => {
    const factory = vi.fn();
    const request = new Request('https://thinkerwell.example/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ v: 1, events: [] }),
    });
    const response = await handleEvents(request, { env: ENV, db: factory });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'paused' });
    expect(factory).not.toHaveBeenCalled();
  });
});
