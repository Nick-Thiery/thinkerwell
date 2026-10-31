# The contact form

`/contact` is one form for everyone: educators, learning organisations, companies, people with feedback. Built in October 2026 from Justin's brief ("Thinkerwell: simplify For Educators and add a contact form"), with the team's address instead of the school inbox the brief named. That address is **thinkerwell.hello@gmail.com** since 31 October 2026 (it was hello@thinkerwell.app, which had no mailbox: thinkerwell.app has no MX records, so mail to it bounced).

Linked from the footer of every page ("Contact"), the top and bottom of For organisations ("Get in touch") and the Educators page ("Send an enquiry"). It is a public page, indexed like the others (`PUBLIC_PAGES` in `src/seo/site.ts`, `seo.contact` in en.json, a rewrite in `vercel.json`).

## What it asks

Four fields, in one column, labels above:

| Field | |
| --- | --- |
| What is it about? | A topic: general question, educator or classroom use, learning organisation or NGO, company or partnership, feedback or technical issue, other. |
| Your name | 2 to 100 characters. |
| Email or WhatsApp number | **One** way to reply: an email address, or a WhatsApp number that starts with its country code (+62, +60, +65 …). Never a login. |
| Your message | 10 to 3,000 characters. |

And a hidden field (`website`) that people never see and bots fill in: an enquiry with it filled in is answered "sent" and goes nowhere. Nothing asks about a learner, and the note under the button says not to include a learner's personal information. No upload, no CAPTCHA, no newsletter box.

The page checks the fields with the server's own checker (`src/contact/enquiry.ts`, by hand: no zod), says each problem under its field, and puts focus on the first. While sending, the button says "Sending…" and can't be pressed again. If the message can't be sent, for any reason (offline, not set up yet, the provider refused), everything typed stays and the page gives the team's address to write to instead. After a send, it thanks the person and offers "Send another message".

The words are the lazily loaded `contact` group, in English, Indonesian and Malay.

## Where it goes

The page posts the four fields (and the empty hidden one) as JSON to this site's own **`POST /api/contact`** (`api/contact.ts`, `api/_lib/contact.ts`), so the Content-Security-Policy is unchanged (`connect-src 'self'`). The function:

1. Accepts POST only, from this site (Origin), JSON, at most 16 kB.
2. Checks every field again, with the same checker; unknown keys are refused, so a request can't name its own recipient.
3. Limits how many enquiries it sends: 8 per connection and 60 in all per server instance, in any ten minutes (in memory only; the connection's address is used for counting and forgotten). Vercel's firewall rule on `/api/` (60 requests a minute per address) applies too.
4. Emails the team through **Resend** (`https://api.resend.com/emails`, server to server): plain text, subject `[Thinkerwell enquiry] <topic>`, with the topic, name, reply address, the time and the message. For an email address, the email's Reply-To is that address, so replying in Gmail goes to them; for a WhatsApp number there is no Reply-To, and the number is written out to reply to on WhatsApp by hand (this is not a WhatsApp integration).
5. Answers 200 only when Resend accepted the email; 400 with the fields that need a change; 429 when the limit is reached; 502 when Resend didn't take it; 503 until it is set up. Resend's own error text never reaches the browser, and nothing is stored or logged by Thinkerwell.

The destination is `CONTACT_TO_EMAIL`, else thinkerwell.hello@gmail.com; it never comes from the request.

**Privacy.** This is the one place the site sends what someone typed: an adult's own name, reply address and message, which they chose to send, to the team. It goes through Resend (which keeps sent emails for a time, by its own policy) to the team's mailbox. It has nothing to do with learners' work or pilot measurement, and the form asks for nothing about a learner.

## Setting it up (a person does this, once)

Until these are done the form answers "couldn't send" and points to thinkerwell.hello@gmail.com, so it is safe to publish first.

1. **Make a Resend account** at resend.com (the free plan sends 3,000 emails a month, 100 a day). A person makes it; Claude doesn't make accounts or handle keys.
2. **Add a sending domain**: Domains → Add domain → `send.thinkerwell.app`. A subdomain keeps it apart from the Google mail on `thinkerwell.app`, whose records stay as they are.
3. **Add the DNS records Resend shows** (an MX and a TXT for SPF on `send.thinkerwell.app`, and a TXT for DKIM, `resend._domainkey…`) wherever `thinkerwell.app`'s DNS is managed (Vercel → Domains, if the domain was bought there). Wait for Resend to say **Verified**.
4. **Make an API key**: API Keys → Create → permission "Sending access", domain `send.thinkerwell.app`. Copy it once.
5. **In Vercel**, project → Settings → Environment Variables, for Production (and Preview if wanted):
   - `RESEND_API_KEY`: the key, marked **Sensitive**. Never with a `VITE_` name: that would put it in the browser.
   - `CONTACT_FROM_EMAIL`: `Thinkerwell <contact@send.thinkerwell.app>`
   - `CONTACT_TO_EMAIL` (optional): only to send somewhere other than thinkerwell.hello@gmail.com.
6. **Redeploy** (environment variables apply to new deployments only).
7. **Test on the live site**: one enquiry with an email address (it arrives at thinkerwell.hello@gmail.com, check Spam too; reply, and the reply goes to that address), and one with a WhatsApp number (the number is in the email; there is no Reply-To). Then a wrong key or a paused domain should show "couldn't send", never "sent".

## Tests

- `src/contact/enquiry.test.ts`: the checker (topics, lengths, email or phone, header injection, unknown keys, the honeypot).
- `api/_lib/contact.test.ts`: the function (sent, WhatsApp, fixed recipient, 400, the honeypot, 503, 405/403/415/413, 502 without the provider's words, 429 and the window).
- `src/pages/contact/ContactPage.test.tsx`: the page (fields, problems and focus, one send, success, failure keeps what was typed, offline, 429, the server's own problems, Indonesian and Malay).
- `e2e/contact.spec.ts`: from For organisations, the Educators page and the footer; an enquiry sent to this site only (the function is answered by the test, since `vite preview` has no functions); a problem under its field; a failure. The page tour has a stop, so the width, axe, right-to-left, tap-size, language and privacy checks cover it.
