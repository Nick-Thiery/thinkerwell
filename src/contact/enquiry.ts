/**
 * An enquiry from the contact form (/contact, docs/notes/contact-form.md):
 * what the browser sends to /api/contact, and the one checker both use, so
 * the page shows the same errors the server would give. Checked by hand
 * (no zod: it would break the Content-Security-Policy in the browser).
 *
 * Four fields and a honeypot. The contact is ONE way to reply: an email
 * address, or a WhatsApp number with its country code (+65 …). It is never
 * an account or a login, and no field asks about a learner.
 */

/** The topics, as the server knows them; each has its words in `contact.topic<Key>` (contact.topicGeneral, …). */
export const ENQUIRY_TOPICS = ['general', 'educator', 'organisation', 'partnership', 'feedback', 'other'] as const;
export type EnquiryTopic = (typeof ENQUIRY_TOPICS)[number];

/** The English name of each topic, for the email's subject line (the team reads English). */
export const TOPIC_SUBJECT: Readonly<Record<EnquiryTopic, string>> = {
  general: 'General question',
  educator: 'Educator or classroom use',
  organisation: 'Learning organisation or NGO',
  partnership: 'Company or partnership',
  feedback: 'Feedback or technical issue',
  other: 'Other',
};

export const NAME_MIN = 2;
export const NAME_MAX = 100;
export const CONTACT_MAX = 254;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 3000;
/** The largest body /api/contact reads: the longest fields, in UTF-8, with room to spare. */
export const MAX_BODY_BYTES = 16 * 1024;

export interface Enquiry {
  topic: EnquiryTopic;
  name: string;
  contact: string;
  message: string;
}

export type EnquiryField = 'topic' | 'name' | 'contact' | 'message';
/** Why a field isn't accepted; the page turns each into words (`contact.error.<field>`). */
export type EnquiryErrors = Partial<Record<EnquiryField, 'missing' | 'invalid' | 'short' | 'long'>>;

export type CheckedEnquiry =
  | { ok: true; value: Enquiry; kind: 'email' | 'whatsapp'; bot: boolean }
  | { ok: false; errors: EnquiryErrors };

// Control characters (and the line breaks that could start a new email header) are refused in one-line fields.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;
// The message may have line breaks and tabs, nothing else of the kind.
// eslint-disable-next-line no-control-regex
const MESSAGE_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
/** A plain email address: something@domain.tld, with no spaces, quotes or brackets. */
const EMAIL = /^[^\s@<>()[\]",;:\\]+@[^\s@<>()[\]",;:\\]+\.[^\s@<>()[\]",;:\\]{2,}$/;
/** The separators people type in a phone number. */
const PHONE_SEPARATORS = /[\s\-.()]/g;
/** An international number: a +, then 7 to 15 digits, not starting with 0 (E.164). */
const PHONE = /^\+[1-9]\d{6,14}$/;

/** What kind of reply address this is, or null when it is neither. */
export function contactKind(contact: string): 'email' | 'whatsapp' | null {
  const text = contact.trim();
  if (!text || text.length > CONTACT_MAX || CONTROL.test(text)) return null;
  if (text.includes('@')) return EMAIL.test(text) ? 'email' : null;
  return PHONE.test(text.replace(PHONE_SEPARATORS, '')) ? 'whatsapp' : null;
}

/** A WhatsApp number as the team should dial it: +6591234567. */
export function normalisedPhone(contact: string): string {
  return contact.trim().replace(PHONE_SEPARATORS, '');
}

const isTopic = (value: unknown): value is EnquiryTopic => typeof value === 'string' && (ENQUIRY_TOPICS as readonly string[]).includes(value);

/** Checks an enquiry as the browser builds it or as the server receives it. Unknown keys are refused, so nothing else slips through. */
export function checkEnquiry(body: unknown): CheckedEnquiry {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, errors: { topic: 'invalid' } };
  const record = body as Record<string, unknown>;
  const allowed = new Set(['topic', 'name', 'contact', 'message', 'website']);
  if (Object.keys(record).some((key) => !allowed.has(key))) return { ok: false, errors: { topic: 'invalid' } };
  const text = (key: string) => (typeof record[key] === 'string' ? (record[key]).trim() : null);

  const errors: EnquiryErrors = {};
  const topic = record.topic;
  if (topic === '' || topic === undefined) errors.topic = 'missing';
  else if (!isTopic(topic)) errors.topic = 'invalid';

  const name = text('name');
  if (!name) errors.name = 'missing';
  else if (CONTROL.test(name)) errors.name = 'invalid';
  else if ([...name].length < NAME_MIN) errors.name = 'short';
  else if ([...name].length > NAME_MAX) errors.name = 'long';

  const contact = text('contact');
  const kind = contact ? contactKind(contact) : null;
  if (!contact) errors.contact = 'missing';
  else if (!kind) errors.contact = 'invalid';

  const message = text('message');
  if (!message) errors.message = 'missing';
  else if (MESSAGE_CONTROL.test(message)) errors.message = 'invalid';
  else if ([...message].length < MESSAGE_MIN) errors.message = 'short';
  else if ([...message].length > MESSAGE_MAX) errors.message = 'long';

  const website = record.website;
  if (website !== undefined && typeof website !== 'string') return { ok: false, errors: { topic: 'invalid' } };

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { topic: topic as EnquiryTopic, name: name!, contact: kind === 'whatsapp' ? normalisedPhone(contact!) : contact!, message: message! },
    kind: kind!,
    // The hidden "website" field: people leave it empty, bots fill it in.
    bot: typeof website === 'string' && website.trim() !== '',
  };
}

/** The order the page checks fields in, so focus goes to the first one that needs a change. */
export const ENQUIRY_FIELDS: readonly EnquiryField[] = ['topic', 'name', 'contact', 'message'];
