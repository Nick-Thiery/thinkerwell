/**
 * POST /api/contact (docs/notes/contact-form.md). The contact form (/contact)
 * sends an enquiry here, same-origin; it is emailed to the team through
 * Resend. Everything it does is in ./_lib/contact.ts.
 */
import { handleContact, RateLimit, sendWithResend } from './_lib/contact.js';

// One per server instance: Vercel's firewall rule on /api/ limits each connection too (docs/notes/contact-form.md).
const limit = new RateLimit();

export async function POST(request: Request): Promise<Response> {
  return handleContact(request, { env: process.env, send: sendWithResend, limit, now: () => new Date() });
}
