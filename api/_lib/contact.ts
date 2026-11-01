/**
 * POST /api/contact: takes an enquiry from the contact form (/contact,
 * src/pages/contact/), checks it with the same checker the page uses
 * (src/contact/enquiry.ts) and emails it to the team through Resend
 * (docs/notes/contact-form.md).
 *
 * Answers, which the page understands:
 *   200  sent (or a bot filled in the hidden field: it is told the same, and nothing is sent)
 *   400  a field isn't accepted: { error: 'invalid', fields: { name: 'short', … } }
 *   403  a page on another site
 *   405  not a POST
 *   413  the body is over 16 kB
 *   415  not JSON
 *   429  too many enquiries from one connection, or from everyone, for now (Retry-After)
 *   502  Resend didn't take it
 *   503  not set up: no RESEND_API_KEY or no CONTACT_FROM_EMAIL
 *
 * The destination is fixed (CONTACT_TO_EMAIL, else thinkerwell.hello@gmail.com) and
 * never comes from the request. The enquiry is sent and not kept: nothing is
 * written to a database or a log, and Resend's error text never reaches the
 * browser. A connection's address is held in memory, only to count its
 * enquiries for the rate limit, and forgotten after ten minutes.
 */
import { CONTACT_EMAIL } from '../../src/app/contact.js';
import { checkEnquiry, MAX_BODY_BYTES, TOPIC_SUBJECT, type Enquiry } from '../../src/contact/enquiry.js';
import { isCrossSite, json, readLimitedText, type Env } from './http.js';

/** Enquiries one connection may send in WINDOW_MS: a school or NGO shares one, so not too few. */
export const PER_CONNECTION = 8;
/** Enquiries everyone together may send in WINDOW_MS, from one server instance: a cap on what a flood could cost. */
export const PER_INSTANCE = 60;
export const WINDOW_MS = 10 * 60 * 1000;

export interface Email {
  from: string;
  to: string;
  subject: string;
  text: string;
  /** Only a checked email address the sender gave; never their WhatsApp number. */
  replyTo?: string;
}

/** Sends one email; resolves true when the provider accepted it. Never throws its own message at the browser. */
export type SendEmail = (email: Email, apiKey: string) => Promise<boolean>;

/** Sends through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email). */
export const sendWithResend: SendEmail = async (email, apiKey) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: email.from,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    }),
  });
  return response.ok;
};

/** Counts enquiries per connection and in all, over a sliding window. In memory only. */
export class RateLimit {
  private readonly times = new Map<string, number[]>();
  private all: number[] = [];

  /** True, and counted, when this connection may send one more now. */
  take(key: string, now: number): boolean {
    const since = now - WINDOW_MS;
    this.all = this.all.filter((time) => time > since);
    for (const [other, list] of this.times) {
      const kept = list.filter((time) => time > since);
      if (kept.length === 0) this.times.delete(other);
      else this.times.set(other, kept);
    }
    const mine = this.times.get(key) ?? [];
    if (mine.length >= PER_CONNECTION || this.all.length >= PER_INSTANCE) return false;
    this.times.set(key, [...mine, now]);
    this.all.push(now);
    return true;
  }
}

export interface ContactDeps {
  env: Env;
  send: SendEmail;
  limit: RateLimit;
  now: () => Date;
}

/** The connection's address as Vercel passes it, for counting only. */
function connectionOf(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'unknown';
}

/** The email the team reads: plain text, every field labelled, the WhatsApp number written out to reply by hand. */
export function enquiryEmail(enquiry: Enquiry, kind: 'email' | 'whatsapp', sentAt: Date): Omit<Email, 'from' | 'to'> {
  const topic = TOPIC_SUBJECT[enquiry.topic];
  const reply = kind === 'email' ? `Email: ${enquiry.contact}` : `WhatsApp: ${enquiry.contact} (reply on WhatsApp; this email has no reply address)`;
  return {
    subject: `[Thinkerwell enquiry] ${topic}`,
    text: [
      'A new enquiry from the contact form on thinkerwell.app.',
      '',
      `Topic: ${topic}`,
      `Name: ${enquiry.name}`,
      reply,
      `Sent: ${sentAt.toISOString()}`,
      '',
      'Message:',
      enquiry.message,
      '',
    ].join('\n'),
    ...(kind === 'email' ? { replyTo: enquiry.contact } : {}),
  };
}

export async function handleContact(request: Request, deps: ContactDeps): Promise<Response> {
  const { env } = deps;
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' }, { allow: 'POST' });
  if (!env.RESEND_API_KEY || !env.CONTACT_FROM_EMAIL) return json(503, { error: 'not_configured' });
  if (isCrossSite(request)) return json(403, { error: 'cross_site' });
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return json(415, { error: 'not_json' });

  const text = await readLimitedText(request, MAX_BODY_BYTES);
  if (text === null) return json(413, { error: 'too_large' });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, { error: 'invalid', fields: {} });
  }
  const checked = checkEnquiry(body);
  if (!checked.ok) return json(400, { error: 'invalid', fields: checked.errors });
  // A bot that filled in the hidden field is told it worked, and nothing is sent.
  if (checked.bot) return json(200, { sent: true });

  const now = deps.now();
  if (!deps.limit.take(connectionOf(request), now.getTime())) return json(429, { error: 'too_many' }, { 'retry-after': String(WINDOW_MS / 1000) });

  const email: Email = {
    from: env.CONTACT_FROM_EMAIL,
    to: env.CONTACT_TO_EMAIL || CONTACT_EMAIL || 'thinkerwell.hello@gmail.com',
    ...enquiryEmail(checked.value, checked.kind, now),
  };
  try {
    if (await deps.send(email, env.RESEND_API_KEY)) return json(200, { sent: true });
    return json(502, { error: 'not_sent' });
  } catch {
    // Never pass on the provider's message: it can hold the key's name or an address.
    return json(502, { error: 'not_sent' });
  }
}
