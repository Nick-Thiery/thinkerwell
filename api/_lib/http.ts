/**
 * Small helpers for the two functions (api/events.ts, api/export.ts).
 * A leading underscore keeps this folder from becoming a URL.
 */

export interface Env {
  /** A Postgres connection string (Neon, Supabase or Vercel Postgres). Without it, /api/events answers 503. */
  DATABASE_URL?: string | undefined;
  /** Comma-separated organisation codes that may send results (help-jakarta,my-partner). Without it, /api/events answers 503. */
  MEASUREMENT_ORGS?: string | undefined;
  /** The bearer token for /api/export. Without it, /api/export answers 503. */
  EXPORT_TOKEN?: string | undefined;
  /** Resend's API key, for /api/contact (docs/notes/contact-form.md). Without it, /api/contact answers 503. */
  RESEND_API_KEY?: string | undefined;
  /** The address the contact form's emails come from, on a domain verified with Resend (Thinkerwell <contact@send.thinkerwell.app>). Without it, /api/contact answers 503. */
  CONTACT_FROM_EMAIL?: string | undefined;
  /** Where the contact form's emails go; thinkerwell.hello@gmail.com when unset. Never taken from the request. */
  CONTACT_TO_EMAIL?: string | undefined;
}

export function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

/** The organisation codes that may send results, from MEASUREMENT_ORGS. Empty when it is unset. */
export function allowedOrgs(env: Env): Set<string> {
  return new Set(
    (env.MEASUREMENT_ORGS ?? '')
      .split(',')
      .map((org) => org.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** True when the server can take results at all. */
export function isConfigured(env: Env): boolean {
  return Boolean(env.DATABASE_URL) && allowedOrgs(env).size > 0;
}

/**
 * Reads the request's body as text, giving up as soon as it passes `max`
 * bytes, so a huge body is never held in memory. Returns null when it is too big.
 */
export async function readLimitedText(request: Request, max: number): Promise<string | null> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** A cross-site page posting here is refused: a browser sends Origin on a POST, and it must be this site. */
export function isCrossSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
}
