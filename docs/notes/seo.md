# Search engines and link previews

October 2026, from the team's brief *Thinkerwell: Google SEO and LinkedIn implementation brief* (`Thinkerwell_Google_SEO_and_LinkedIn_Handoff.md`).

## The problem it solves

Thinkerwell is drawn in the browser by JavaScript. Before this change every address on thinkerwell.app returned the same HTML file. That file had the title "Thinkerwell", one site-wide description, no canonical link, and no robots.txt or sitemap. As a result:

- `/about/` and `/about` were separate copies of the same page.
- thinkerwell.vercel.app served a second copy of the whole site.

Google runs JavaScript, but it reads the raw HTML first. Link previews never run it: WhatsApp, LinkedIn, Telegram and X show only what the file says. So each public page now has an HTML file of its own, with its own head.

## How it works

| What | Where |
|---|---|
| The production address, the LinkedIn Page, and which pages are public | `src/seo/site.ts` |
| Each page's head, the noindex shell's head, the home page's structured data, the sitemap | `src/seo/build.ts` (pure; the words come from `en.json` under `seo`) |
| Writing the files at build time, and serving them in `vite preview` | `seoFiles()` in `vite.config.ts` |
| Serving them on Vercel | `vercel.json`: `rewrites`, `redirects`, `trailingSlash` |
| robots.txt | `public/robots.txt` |
| Tests | `src/seo/seo.test.ts` (heads, sitemap, robots, vercel.json rules), `e2e/seo.spec.ts` (the built site's raw HTML, sitemap, redirects, rendered titles, crawlable links, the footer link), `src/app/linkPreview.test.ts` |

The build takes `index.html`, which has a `<!--page-metadata-->` marker in its head, and writes:

- **`index.html`** for the home page, with the home page's head. The dev server fills in the same head.
- **`about.html`, `course.html`, `educators.html`, `organisations.html` and `credits.html`.** Each is the same file with that page's head: title, description, canonical link, Open Graph and Twitter tags.
- **`lesson/<id>/read.html`** for each of the 24 lessons.
- **`app.html`**: the same file with `<meta name="robots" content="noindex">` and no canonical link. Every other address gets it (vercel.json's last rewrite).
- **`sitemap.xml`**: the 30 public pages' canonical addresses, with no `<lastmod>`, because a build date isn't when a page changed.

The body is identical in every file, so the app starts the same way everywhere. None of the new files are precached. The service worker still answers every page load with `index.html` (`src/offline/sw.ts`), so offline use is unchanged. The precache still has 82 entries.

On Vercel, `vercel.json` does the following:

- It rewrites `/about` → `/about.html` (and the other four pages).
- It rewrites `/lesson/<id>/read` → `/lesson/<id>/read.html`, for the 24 lesson ids only. A test fails if that list and the lessons disagree.
- It sends everything else without a file extension to `/app.html`.
- `trailingSlash: false` redirects `/about/` to `/about`.
- Two host redirects send `thinkerwell.vercel.app` and `www.thinkerwell.app` to `https://thinkerwell.app` (permanent). Preview deployments have other hostnames, so they are unaffected.

`vite preview` does the same through a small middleware in `seoFiles()`, so the end-to-end tests check what Vercel will serve.

## What is indexed, and what isn't

**Indexed (in the sitemap, with a self-referencing canonical link):**
- the home page
- About
- the course page
- For educators
- For organisations
- Credits
- each lesson's **Read** step

The Read step has the lesson's reading, evidence, picture and key words, so it's the lesson's public page.

**Not indexed (`noindex`):**
- **Personal pages:** the journal and its print view, Settings, the class view, all certificates.
- **Teacher tools:** teacher guides, answer keys, the setup checklist, the consent form, the information sheet, code cards. They are print-oriented, and the guides and keys contain answers that learners shouldn't find through search.
- **Section checks.**
- **The other lesson steps (Write, Speak, Watch, Reflect, Complete).** They are short prompts around the same lesson, so each is thin on its own. They aren't pointed at the Read step with a canonical link either: they are different pages, just not worth a search result.
- **Lesson print views**, which duplicate the Read step.
- **`/lesson/<id>`**, which redirects to a step in the app.
- **The old Base44 lesson addresses** (`/lesson/l6` and the like).
- **Unknown addresses.**

robots.txt allows everything. A crawler has to be able to fetch a page to see its `noindex`, and robots.txt isn't privacy protection. Nothing personal is ever on a page's HTML: learners' work lives on their device.

## Titles and descriptions

These are the approved titles and descriptions from the brief, in `en.json` under `seo`. The browser tab says the same thing (`useFullPageTitle`). The H1s, Open Graph and Twitter tags agree with them.

| Page | Old title | New title | Description |
|---|---|---|---|
| `/` | Thinkerwell | Thinkerwell \| Free Social Studies Learning for Youth | Free social studies learning for youth across Southeast Asia, especially those facing barriers to education. Explore history, geography, culture and civic life. |
| `/about` | Thinkerwell | About Thinkerwell \| Our Mission | Learn why Thinkerwell began and how its free digital platform makes social studies learning more accessible to youth facing barriers to education. |
| `/course` | Thinkerwell | Exploring Our World \| Free Social Studies Course | Explore Thinkerwell's 24 free lessons in history, geography, culture and civic life. Learn independently or with an educator. |
| `/educators` | Thinkerwell | For Educators \| Thinkerwell | Teach Thinkerwell's free social studies lessons with teacher guides, printable materials and flexible activities for shared devices. |
| `/organisations` | Thinkerwell | For Organisations \| Thinkerwell | Learn how a pilot with Thinkerwell could support social studies learning for youth facing barriers to education. |
| `/credits` | Thinkerwell | Credits and Sources \| Thinkerwell | Explore the sources, videos, images and software behind Thinkerwell's free social studies lessons. |
| `/lesson/<id>/read` | Thinkerwell | Lesson N: *the lesson's title* \| Thinkerwell | Lesson N of Exploring Our World, Thinkerwell's free social studies course. Learning goal: *the lesson's `learningGoal`* |

Notes on the copy:

- **Old descriptions:** every page used to share one description: "Free social studies learning for youth across Southeast Asia, especially those facing barriers to education. Works offline, with no accounts."
- **Lesson titles:** a lesson's title keeps the lesson's own sentence case ("Lesson 1: How can we find out about the past?"). The brief's example capitalises every word, but lesson text isn't changed for this.
- **Lesson descriptions:** these come from each lesson file's own `learningGoal`, so they are true and all different.
- **Other tab titles:** the app's other tab titles now end in "| Thinkerwell" instead of "· Thinkerwell", to match.

## Structured data

The home page has JSON-LD with two items. **WebSite** gives the name and address. **Organization** gives the name, address, logo (`/icons/icon-512.png`), description and `sameAs` (the LinkedIn Page).

There is deliberately nothing else: no NGO or nonprofit type, legal name, postal address, awards, ratings, reviews or partners (CLAUDE.md rule 8). This makes no rich result likely; it only names the site.

## The LinkedIn Page

The footer has "Thinkerwell on LinkedIn" after For organisations and Credits. It's an ordinary link in the footer's link style, opening in a new tab with `rel="noreferrer"` and "(opens in a new tab)" for screen readers. There is no LinkedIn script, feed or button.

The address is `THINKERWELL_LINKEDIN` in `src/seo/site.ts`, exactly as the team gave it, including LinkedIn's `lipi` tracking part. LinkedIn shows only a sign-in wall to automated browsers, so the clean address `https://www.linkedin.com/company/thinkerwell/` couldn't be confirmed. Once someone signed in confirms it opens Thinkerwell's Page, put the clean address in that constant. The footer and the structured data both use it.

## What isn't done, and why

- **The page body isn't prerendered.** Crawlers that don't run JavaScript see the head and the header bar, not the page's text. Google renders the app and sees the text, and the course page links every lesson with ordinary `<a href>` links. Prerendering the body (React's server rendering at build time) would show English for a moment to Indonesian learners before the app starts, on every first load. It would also add to the first-visit budget. It belongs with the Indonesian routes below, if search traffic needs it.
- **Indonesian has no addresses of its own.** It is served on the same addresses as English, chosen on the device, and the raw HTML is always English. So there is no `hreflang`: pointing `en` and `id` at the same address would be wrong. If Indonesian search visibility becomes a goal, this is the proposal, as a separate pull request:
  - Add `/id/...` addresses (for example `/id/about`, `/id/lesson/<id>/read`) whose files have the Indonesian titles and descriptions. These are already in `id.json` under `seo` and flagged for review.
  - Use `<html lang="id">`, self-referencing canonical links, and reciprocal `hreflang="en"`, `hreflang="id"` and `x-default` links on both versions.
  - List both in the sitemap.
  - In the app, an `/id/` address would set the language to Indonesian. The language switch stays as it is.
  - Native-speaker review of the Indonesian should come first.
- **The old Base44 site** (thinkerwell-app.base44.app) is still live with the old course and the title "thinkerwell.app". Only someone with access to the Base44 project can unpublish it, or point it to thinkerwell.app if Base44 allows. It can't be redirected from this repository.

## After deploying

1. **Check the files.** Open `https://thinkerwell.app/robots.txt` and `https://thinkerwell.app/sitemap.xml`. Then view the page source of `/about` and one lesson: each should show its own `<title>` and a `<link rel="canonical">` to itself. `https://thinkerwell.vercel.app/about` and `https://thinkerwell.app/about/` should both land on `https://thinkerwell.app/about`.
2. **Google Search Console.**
   1. Add `https://thinkerwell.app` as a property. Prefer the Domain type, verified with a DNS TXT record in Vercel's domain settings.
   2. Submit `https://thinkerwell.app/sitemap.xml` under Sitemaps.
   3. With URL Inspection, inspect `/`, `/about` and `/lesson/finding-out-about-the-past/read`, then request indexing. Check that "User-declared canonical" matches the address and the rendered page shows its text.
3. **Structured data.** Test `https://thinkerwell.app/` in Google's Rich Results Test and the Schema Markup Validator (validator.schema.org). Expect WebSite and Organization with no errors. No rich result is promised.
4. **Link previews.** Paste `https://thinkerwell.app/about` into LinkedIn's Post Inspector (linkedin.com/post-inspector) and into a WhatsApp chat. Each page should show its own title.
5. **Wait.** Indexing takes days to weeks, and Google may choose its own title or snippet. These fields are signals, not guarantees.

## Adding a public page

1. Add it to `PUBLIC_PAGES` in `src/seo/site.ts`.
2. Add its title and description to `en.json` under `seo`, and translate them in `id.json` (flag them in `docs/translation/id/notes/ui.json`).
3. Add a rewrite in `vercel.json` before the catch-all.
4. Have the page use `useFullPageTitle(t('seo.<key>.title'))`.

The tests check that the rewrites and the page list agree. A new lesson is picked up automatically, except for its id in the lesson rewrite in `vercel.json`: a test fails until it's added.
