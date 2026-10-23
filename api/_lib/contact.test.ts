// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { enquiryEmail, handleContact, PER_CONNECTION, PER_INSTANCE, RateLimit, WINDOW_MS, type Email, type SendEmail } from './contact.js';

const URL_ = 'https://thinkerwell.example/api/contact';
const ENV = { RESEND_API_KEY: 're_test_key', CONTACT_FROM_EMAIL: 'Thinkerwell <contact@send.thinkerwell.example>' };
const GOOD = { topic: 'organisation', name: 'Siti Rahma', contact: 'siti@example.org', message: 'We would like to use Thinkerwell with our learners.', website: '' };
const NOW = new Date('2026-10-23T05:00:00.000Z');

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(URL_, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function setup(env: Record<string, string | undefined> = ENV, accepted = true) {
  const sent: Email[] = [];
  const send = vi.fn<SendEmail>((email) => {
    sent.push(email);
    return Promise.resolve(accepted);
  });
  const limit = new RateLimit();
  const run = (request: Request) => handleContact(request, { env, send, limit, now: () => NOW });
  return { sent, send, run };
}

describe('POST /api/contact', () => {
  it('emails the enquiry to the team, with the sender’s email to reply to', async () => {
    const { run, sent } = setup();
    const response = await run(post(GOOD));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: true });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(sent).toEqual([
      {
        from: ENV.CONTACT_FROM_EMAIL,
        to: 'hello@thinkerwell.app',
        subject: '[Thinkerwell enquiry] Learning organisation or NGO',
        text: expect.stringContaining('Name: Siti Rahma\nEmail: siti@example.org\nSent: 2026-10-23T05:00:00.000Z\n\nMessage:\nWe would like to use Thinkerwell with our learners.') as string,
        replyTo: 'siti@example.org',
      },
    ]);
  });

  it('writes out a WhatsApp number to reply to by hand, with no reply address', async () => {
    const { run, sent } = setup();
    expect((await run(post({ ...GOOD, contact: '+62 812-3456-7890' }))).status).toBe(200);
    expect(sent[0]!.replyTo).toBeUndefined();
    expect(sent[0]!.text).toContain('WhatsApp: +6281234567890 (reply on WhatsApp');
  });

  it('sends to CONTACT_TO_EMAIL when it is set, and never to an address in the request', async () => {
    const { run, sent } = setup({ ...ENV, CONTACT_TO_EMAIL: 'team@example.org' });
    await run(post(GOOD));
    expect(sent[0]!.to).toBe('team@example.org');
    const again = setup();
    expect((await again.run(post({ ...GOOD, to: 'someone@example.org' }))).status).toBe(400);
    expect(again.send).not.toHaveBeenCalled();
  });

  it('answers 400 with the fields that need a change, and sends nothing', async () => {
    const { run, send } = setup();
    const response = await run(post({ ...GOOD, name: 'S', contact: '0812345678' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid', fields: { name: 'short', contact: 'invalid' } });
    expect((await run(post('{not json'))).status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it('tells a bot that filled in the hidden field it worked, and sends nothing', async () => {
    const { run, send } = setup();
    const response = await run(post({ ...GOOD, website: 'http://spam.example' }));
    expect(response.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  it('answers 503 until Resend is set up, and sends nothing', async () => {
    for (const env of [{}, { RESEND_API_KEY: 'k' }, { CONTACT_FROM_EMAIL: 'a@b.example' }]) {
      const { run, send } = setup(env);
      expect((await run(post(GOOD))).status).toBe(503);
      expect(send).not.toHaveBeenCalled();
    }
  });

  it('refuses other methods, other sites, other kinds of body and big bodies', async () => {
    const { run, send } = setup();
    expect((await run(new Request(URL_, { method: 'GET' }))).status).toBe(405);
    expect((await run(post(GOOD, { origin: 'https://evil.example' }))).status).toBe(403);
    expect((await run(post(GOOD, { 'content-type': 'text/plain' }))).status).toBe(415);
    expect((await run(post({ ...GOOD, message: 'x'.repeat(20_000) }))).status).toBe(413);
    expect(send).not.toHaveBeenCalled();
  });

  it('answers 502 when Resend doesn’t take it, or fails, without its words', async () => {
    const refused = setup(ENV, false);
    const response = await refused.run(post(GOOD));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'not_sent' });
    const send = vi.fn<SendEmail>(() => Promise.reject(new Error('Invalid API key re_test_key')));
    const thrown = await handleContact(post(GOOD), { env: ENV, send, limit: new RateLimit(), now: () => NOW });
    expect(thrown.status).toBe(502);
    expect(await thrown.text()).not.toContain('re_test_key');
  });

  it(`takes ${PER_CONNECTION} enquiries from one connection in ten minutes, then 429`, async () => {
    const { run, send } = setup();
    for (let i = 0; i < PER_CONNECTION; i++) expect((await run(post(GOOD))).status).toBe(200);
    const response = await run(post(GOOD));
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('600');
    // Another connection still can.
    expect((await run(post(GOOD, { 'x-forwarded-for': '198.51.100.2' }))).status).toBe(200);
    expect(send).toHaveBeenCalledTimes(PER_CONNECTION + 1);
  });
});

describe('the rate limit', () => {
  it('forgets a connection after ten minutes, and caps everyone together', () => {
    const limit = new RateLimit();
    for (let i = 0; i < PER_CONNECTION; i++) expect(limit.take('a', 0)).toBe(true);
    expect(limit.take('a', 1)).toBe(false);
    expect(limit.take('a', WINDOW_MS + 1)).toBe(true);
    const all = new RateLimit();
    for (let i = 0; i < PER_INSTANCE; i++) expect(all.take(`c${i}`, 0)).toBe(true);
    expect(all.take('another', 0)).toBe(false);
  });
});

describe('the email', () => {
  it('is plain text, every field labelled', () => {
    const email = enquiryEmail({ topic: 'feedback', name: 'Ana', contact: 'ana@example.org', message: 'The map in Lesson 11 is hard to read.' }, 'email', NOW);
    expect(email.subject).toBe('[Thinkerwell enquiry] Feedback or technical issue');
    expect(email.text.split('\n')).toEqual([
      'A new enquiry from the contact form on thinkerwell.app.',
      '',
      'Topic: Feedback or technical issue',
      'Name: Ana',
      'Email: ana@example.org',
      'Sent: 2026-10-23T05:00:00.000Z',
      '',
      'Message:',
      'The map in Lesson 11 is hard to read.',
      '',
    ]);
  });
});
