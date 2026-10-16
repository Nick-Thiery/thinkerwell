# Pilot measurement

Built October 2026 from `docs/research/MEASUREMENT_PLAN.md` (section 4, "In-app usage data"). **Off by default, and safe to merge without switching anything on.** Nothing is live until the "Switch on" checklist at the end of this note is done by a person.

This is the one exception to "learner data stays on the device" (CLAUDE.md rule 1). It is allowed only when **all four** are true:

1. the learner using the device has a **pilot code** (their name is a code card's code, like `HLP-01`; a real name never qualifies);
2. an educator turned on **"Share pilot results"** in Settings on that device;
3. an **organisation code** (like `help-jakarta`) is saved there;
4. the family has **signed the consent form** (`/educators/consent-form`). The app cannot check this; it is the organisation's job, and the switch-on checklist says so.

With any of the first three missing, nothing is queued, nothing is sent, the queue's database is never created and the code is never downloaded. Look-around and "nobody chosen" never qualify. The server answers `503` until it is set up.

What is sent is exactly what the consent form promises (`pages.pilotStudy` in `en.json`, `docs/notes/partner-kit.md`): how long, which lessons and steps are opened and finished, answers to quick checks and section checks, the simpler reading and Listen, videos or reading instead, and **word counts**. **Never** recordings, writing, names, journey, family, anything typed. There is no field that could hold them: see "Events" below.

## How it works

```
lesson / check / watch code ──track()──▶ src/measurement/track.ts   (1 kB, in every visit; does nothing unless gate says yes)
                                              │ import() only when a device shares
                                              ▼
                         src/measurement/measurementCollector.ts   (session, heartbeat, word-count debounce, checkEvent())
                                              │
                         src/measurement/queue.ts  ──▶ IndexedDB "thinkerwell-measurement" (own database, created on first use)
                                              │
                         src/measurement/sender.ts ──▶ POST /api/events  (same origin, small batches, retry with backoff)
                                                              │
                                  api/events.ts → api/_lib/events.ts (strict checks) → api/_lib/db.ts → Postgres `events`
                                  api/export.ts → api/_lib/export.ts  (GET, bearer token, CSV or JSON, one organisation)
```

### The gate (`src/measurement/gate.ts`, `src/app/MeasurementGate.tsx`)

- `pilotCodeFor(learner)`: the learner's name, trimmed and upper-cased, if it matches `^[A-Z0-9]{2,5}-\d{2,3}$` (`HLP-01`, `AB-123`). Anything else (a real name, `HLP-1`) is not a pilot code. The optional class code is not used.
- `sharingOrg(settings.partner)`: `sharePilotResults === true` **and** `organisationCode` matches `^[a-z0-9][a-z0-9-]{1,31}$`.
- `gateFor(partner, learner)`: both, or `null`.
- `MeasurementGate` (mounted once in `AppLayout`) reads the device settings, listens for saves (`onSettingsSaved`, `src/storage/settingsEvents.ts`) and tells `track.ts` the answer. Queueing needs the active learner's code; **sending** what is already queued needs only the device-level opt-in and organisation code (so tablets that sit with results from yesterday's learner still send them).
- Turning sharing off, or clearing the organisation code, **deletes everything waiting** and the random device id. Removing a learner deletes their waiting results. "Delete all data" in Settings deletes the queue's database too.
- Saving the setting is in `settings.partner` (`sharePilotResults`, `organisationCode`, both optional): no schema bump, older records read as "off".

### Events (`src/measurement/events.ts`)

One strict checker, written by hand with **no zod** (the build stops if zod reaches a browser chunk), shared by the app and the server (`api/` imports it with a `.js` ending). Every event is checked before it is queued, and every batch again before it is stored. The checker rejects unknown keys, anything but numbers, booleans, short fixed words and ids matching short patterns; there is nowhere to put free text.

| Type | Needs | Value |
| --- | --- | --- |
| `session_start`, `session_end` | | |
| `heartbeat` (every 30 s while the page is visible and there was input in the last 60 s) | lesson and stage if a lesson is open | |
| `lesson_open`, `lesson_complete` | lesson | |
| `stage_enter`, `stage_complete` | lesson, stage | |
| `quick_check_answer` | lesson | `q`, `selected` (option number in the content file), `correct`, `attempt` |
| `quiz_start` | | `section` |
| `quiz_answer` | | `section`, `q`, `selected`, `correct`, `attempt` |
| `quiz_submit` | | `section`, `score`, `total`, `attempt` |
| `writing_saved` | lesson, stage (read, write, watch, reflect) | `words` (a count, one event after 10 s of quiet) |
| `simpler_toggle` | lesson | `level` (`standard` or `simpler`) |
| `listen_play` | lesson | |
| `video_choice` | lesson | `choice` (`video` or `read`) |
| `video_play`, `video_progress`, `video_fail` | lesson | `percent` (25, 50, 75, 100) or `reason` (`timeout`, `offline`, `unavailable`) |

Every event also carries: `id` (a UUID, so a retry never counts twice), `org`, `pilotCode`, `deviceId` (a random UUID made when sharing is first used on the device, **not** derived from the device, deleted when sharing is turned off), `sessionId` (one stretch of use; a new one after 30 minutes away), `ts` (the device clock, ms) and `appVersion`. The server stores when it received each one too, but **no address, browser or cookie** in the database. (Vercel, the host, keeps its own short-lived request logs, which can include an IP address, for any site it serves. Thinkerwell's functions write nothing to those logs but errors, and never the content of a request. Say so in the organisation's information if asked.)

**Adding an event or a field** needs the consent form's wording (`pages.pilotStudy`) to cover it first, then an entry in `EVENT_SPECS`, a test, and an update to this table and to the plan.

**Not built yet** (the app has no such feature): the pre/post check's answers and the confidence ratings. They are in the consent form already; add them with that feature. Also, the form says "and how much" a learner writes: word counts cover the writing in Read, Write, Watch and Reflect; Speak has no text.

**Video progress** comes from the YouTube player's own messages to the page on the channel the Watch step already listens to (`playerInfo` in `src/pages/lesson/watch/youtube.ts`); no script is loaded and nothing more is requested. It is unit tested with the messages' shape from YouTube's documentation but **has not been tried against a live player** (this build machine cannot reach YouTube). Try it once on a real tablet; if YouTube's messages differ, only `video_progress` and `video_play` are affected.

### The queue (`src/measurement/queue.ts`)

A database of its own, `thinkerwell-measurement` (version 1, `MIGRATIONS` table: to change it, bump `QUEUE_DB_VERSION`, add `MIGRATIONS[n]`, never edit an earlier one, add a test). `events` store (oldest first) and `meta` (`deviceId`, `pausedUntil`). Capped at 3000 events (the oldest go first). If IndexedDB can't be used, a queue in memory stands in for that visit. It steps aside (`blocking`) when "Delete all data" deletes it, from any tab. It is never read or written while a page opens (no crash path): the first thing that happens is an `import()` after the setting is known.

### Sending (`src/measurement/sender.ts`)

- Only when `navigator.onLine`; about 5 seconds after the first event of a burst; batches of at most 50 events and 32 kB; on `pagehide` and when the page is hidden, a last try with `keepalive`. The request has no cookies, no referrer, no redirects.
- `200`/`202`: the events leave the queue.
- `503`, `404`, `405`: "not configured". The app **stops quietly for 6 hours** (remembered across page loads in `meta.pausedUntil`), keeps the queue, and shows nothing but a line in Settings.
- Other `4xx` (the server will never take those): the batch is dropped and the app waits an hour.
- `413`: halve the batch. `429`, `5xx`, network failure: back off 15 s, 30 s, … up to 15 minutes (with jitter), honouring `Retry-After`.
- Nothing here ever blocks the interface or throws into a page; every failure is caught.

A closed tab can lose the last second or so of events that were still being written (the session end, a word count not yet flushed), because IndexedDB writes are asynchronous. Events already queued are safe.

### The server (`api/`)

Vercel Functions (Node.js). Relative imports use `.js` endings (ES modules).

`POST /api/events`:

| Status | When |
| --- | --- |
| `503` | `DATABASE_URL` or `MEASUREMENT_ORGS` is not set. **This is the state after merging.** |
| `405` | not POST |
| `403` | a cross-site `Origin`; or an event whose `org` is not in `MEASUREMENT_ORGS` (nothing from the batch is stored) |
| `415` | not `application/json` |
| `413` | body over 32 kB |
| `400` | anything the checker rejects (`{"error":"invalid","at":"events[2].value.words"}`: names the field, never echoes the content), more than 50 events, repeated ids |
| `429` | more than 240 events from one pilot code in the last minute (`Retry-After: 60`; a busy learner makes about 5 a minute) |
| `202` | stored (`insert … on conflict (id) do nothing`: a retry is harmless) |

Database messages are never put in an answer. The driver is `postgres` (porsager), `prepare: false` so it works through a transaction pooler (Supabase, Neon's pooled string). It works with Neon, Supabase and Vercel Postgres: all of them give a `DATABASE_URL`.

The per-code rate limit counts rows already stored, in the database. It is a safety net against a runaway tablet, **not** protection against an attacker, who could simply use other codes: that is what the organisation allow-list is for. Add a Vercel firewall rate-limit rule on `/api/events` as well (see the checklist).

`GET /api/export` (see "Exporting").

### Content-Security-Policy and hosts

A same-origin `POST /api/events` is covered by the existing `connect-src 'self'`. **No new host is added to the CSP, and no third-party server is contacted.** `e2e/measurement.spec.ts` posts to `/api/events` under the real policy and checks there is no violation. `vercel.json` changes: the SPA rewrite and the page `Cache-Control` rule no longer match `/api/` (so a function is never answered with the page), and the two functions have short `maxDuration`s. `vite preview` answers 404 for any `/api/` path, so the end-to-end tests see the "not configured" behaviour unless a test stands in for the endpoint.

## Environment variables

Set in the Vercel project (Settings, Environment Variables). **None is set after this change is merged**, so everything stays off.

| Name | What |
| --- | --- |
| `DATABASE_URL` | A Postgres connection string. Without it `/api/events` and `/api/export` answer 503. |
| `MEASUREMENT_ORGS` | Comma-separated organisation codes allowed to send, like `help-jakarta,my-partner`. Without it `/api/events` answers 503. A code not in the list gets 403. |
| `EXPORT_TOKEN` | A long random string (at least 32 characters). The bearer token for `/api/export`. Without it `/api/export` answers 503. |

## Enabling an organisation

1. Agree the organisation code (lower case letters, numbers and hyphens, 2 to 32 characters: `help-jakarta`). One code per organisation; it is how results are separated and exported.
2. Add it to `MEASUREMENT_ORGS` in Vercel and redeploy.
3. Make sure every family has signed the consent form (`docs/notes/partner-kit.md`) **before** any learner uses a pilot code on a device that shares.
4. On each device, an educator opens **Settings → Share pilot results**, types the organisation code, taps **Save code**, then turns on **Share pilot results from this device**. The page says "Sharing with help-jakarta."
5. Learners type their code card code (like `HLP-01`) as their name. Learners with any other name, and anyone looking around, send nothing.

To end it: the educator turns the setting off (this deletes what the device still holds), and the organisation is removed from `MEASUREMENT_ORGS`.

## Exporting

```
curl -H "Authorization: Bearer $EXPORT_TOKEN" \
  "https://thinkerwell.app/api/export?org=help-jakarta" -o help-jakarta.csv
curl -H "Authorization: Bearer $EXPORT_TOKEN" \
  "https://thinkerwell.app/api/export?org=help-jakarta&format=json&from=2026-11-01&to=2026-12-15"
```

`org` is required, so two organisations' data are never mixed in one file. Optional: `format=csv|json` (default csv), `from`, `to` (a date or date and time, compared with when the server **received** the event), `type` (an event type) and `pilotCode`. Any other parameter is a 400. The token goes in the header only, never the address. The answer is streamed a page of 2000 at a time, so a long pilot is not held in memory. CSV has one column per value key (`v_words`, `v_correct`, …) and the whole `value` as JSON in the last column; cells that start with `=`, `+`, `-`, `@` are prefixed so a spreadsheet never runs them. There is no admin page.

**Group results go to the organisation, never one learner's** (consent form): when sharing an export, give only counts and averages for the group, as the plan's "numbers you'll report" lists.

## Reading the results

```
npm run pilot:report -- help-jakarta.csv --time-zone Asia/Jakarta
npm run pilot:report -- help-jakarta.csv --from 2026-10-19 --to 2026-11-30 --time-zone Asia/Jakarta --csv-out results/
npm run pilot:report -- tools/measurement/fixtures/sample-export.csv     # a made-up export to try it on
```

`tools/measurement/report.ts` (the workings in `lib.ts`, tests in `lib.test.ts` on the made-up export in `fixtures.ts`) reads one or more exports, CSV or JSON, and prints the in-app numbers from `docs/research/MEASUREMENT_PLAN.md` ("The numbers you'll report") for each organisation, and for all of them together when the files hold more than one. `--json` prints the same numbers for a program; `--csv-out <folder>` also writes `pilot-learners.csv`, `pilot-lessons.csv` and `pilot-section-checks.csv` for a spreadsheet. `--from` and `--to` are dates (both included) in `--time-zone` (default UTC; use `Asia/Jakarta` for HELP, so a day is a Jakarta day); without them the range is the first to the last day in the file. It prints **only codes and numbers**: organisation, pilot code, lesson, section and stage codes, counts, times and dates, never a device or session id. The per-learner tables are for the team; the organisation gets the group lines.

How it reads the file:

- **Every row is checked again**, field by field, against the same rules as `src/measurement/events.ts` (the tool keeps its own copy, `REPORT_EVENTS`, because Node can't load that file's `.js` import; a test fails if they differ). A row that isn't a valid event (a name for a code, an unknown field) is left out and counted as "not understood".
- **Repeats**: a row whose `id` was already seen counts once ("repeats dropped").
- **Time**: `ts` is the tablet's clock, `received_at` the server's. Within a session the tablet's order is kept. A session's clock is trusted when its earliest-sent event arrived between 5 minutes "before" it happened (a clock a little fast) and 14 days after (a tablet offline for a while: its events still count on the day they happened, not the day they arrived). Otherwise (a clock reset to January, or far ahead) the whole session is moved so that event lands when the server got it; the report says how many sessions were moved.

What each number means:

| Number | How it is worked out |
| --- | --- |
| Learners | Pilot codes with any event in the range. The same code in two organisations is two learners. |
| Sessions, active days | Distinct `session_id`s (a new one after 30 minutes away, or a learner change); distinct days with any event. |
| Active learning time | Heartbeats × 0.5 min. A heartbeat comes every 30 s while the page is visible and there was input in the last 60 s, so a tablet left open adds nothing, and each stretch of use is undercounted by up to 30 s (it starts before its first heartbeat). "In a lesson" counts heartbeats that name a lesson. Total, and per learner median, mean, min and max. |
| Lessons opened, completed | Distinct lessons with `lesson_open`; with `lesson_complete` (the Reflect prompt, which is the plan's "required reflections saved"). |
| Steps completed | Distinct (learner, lesson, stage) with `stage_complete`, by stage. |
| Quick checks, first try | Each `quick_check_answer` carries `correct` (the chosen option's own flag in the lesson file, recorded when it was chosen) and `attempt`; the first try at a question is its `attempt` 1 event, so no content file is needed. **Early vs late**: each learner's lessons in the order they first answered a quick check in them; the first half against the second half (the middle one left out when the number is odd), pooled over learners with two or more. "By each learner's nth lesson" shows the same per position. |
| Section checks | From `quiz_submit`: the first submitted try (by time) and the best, as a percent of the questions; per section the median and mean over learners, and how many started (`quiz_start`) and finished. |
| Support use | Per lesson, switches to the simpler reading (and learners who switched), switches back, and Listen plays (and learners). |
| Video | Per lesson, `video_choice` for the video and for "Read instead", plays, learners whose video reached 25, 50, 75 and 100% (their furthest point), and failures by reason. |
| Writing | Word counts only (there is no text). The latest count of each piece (learner, lesson, stage); pieces with at least one word, median words, total. |
| Retention | Learners with any event in the last 7 days of the range (or the whole range, if it is shorter), out of all learners in it. |

## Deleting a pilot's data

The consent form promises deletion **within 6 months of the pilot ending**, and sooner when a family asks. `db/delete-pilot-data.sql` has both, run with `psql "$DATABASE_URL"`:

```
psql "$DATABASE_URL" -v org="'help-jakarta'" -f db/delete-pilot-data.sql      # a whole organisation
```

The file also has a commented-out delete for one pilot code (a family withdrew) and a query to check the count before and after. Put the end-of-pilot date and the delete-by date in the pilot plan when the pilot starts. Devices keep nothing after sharing is turned off, but results already sent are only removed this way.

## Switch on checklist

For a person, in this order. **None of it is done by the code change.**

- [ ] Founders approve this design (the "Decisions" in the pull request).
- [ ] Confirm HELP's consent process; the consent form is signed for every learner whose device will share (and the form is checked against the law where the organisation works).
- [ ] Create a Postgres database (Neon, Supabase or Vercel Postgres). Choose a region near the learners, and one that fits the organisation's data rules.
- [ ] Run `db/schema.sql` once (`psql "$DATABASE_URL" -f db/schema.sql`), and `TEST_DATABASE_URL=… npx vitest run api/_lib/db.integration.test.ts` against a scratch database.
- [ ] In Vercel, set `DATABASE_URL`, `EXPORT_TOKEN` (store it in the team's password manager) and `MEASUREMENT_ORGS`; redeploy.
- [ ] Add a Vercel firewall rate-limit rule for `/api/events` and `/api/export` (for example 60 requests a minute per IP; a classroom behind one address sends far less).
- [ ] With a test code on a test device: turn on sharing, use a lesson, run the export, check the rows, then delete them with `db/delete-pilot-data.sql`.
- [ ] Try a video on a real tablet and check `video_play` and `video_progress` arrive.
- [ ] Add the retention date to the pilot plan; tell the organisation how to switch sharing off.
- [ ] Update `docs/LAUNCH_CHECKLIST.md` with the date it was switched on.

## Tests

- `src/measurement/*.test.ts`: the checker (every event type, unknown keys, free text, limits), the gate's truth table, the queue (persistence, cap, migrations, deleted from outside), the sender (batching, offline, 503 pause, 4xx drop, 413, backoff), the collector (off queues nothing and creates no database; heartbeats need input; sessions; word counts; purge), `track.ts` (never loads the collector when off).
- `api/_lib/*.test.ts`: the handlers with a fake database (every status above, no echo of content), the export (token, filters, CSV and JSON, formula guarding).
- `tools/measurement/lib.test.ts`: the results report on a made-up export (every number above, repeats, rows left out, a wrong clock and a late send, ranges, empty files, only codes and numbers in the output, the command line).
- `src/pages/settings/PilotResultsSetting.test.tsx`, `src/lesson/measurementEvents.test.tsx`, `src/storage/storage.test.ts`, `src/offline/deploy.test.ts`.
- `e2e/measurement.spec.ts`: off by default (no `/api` request, no queue, even for a learner with a pilot code), gated by all three, on with a stand-in endpoint (the payload has the codes and no name or writing), offline then online, turning off deletes, a 503 stops quietly, and the CSP check. `e2e/privacy.spec.ts` also asserts no `/api/` request on any page with sharing off; `e2e/build-output.spec.ts` checks the collector is not in a first visit.
- `api/_lib/db.integration.test.ts` runs the real SQL (`db/schema.sql`, `api/_lib/db.ts`: insert once, the rate-limit count, the export's filters and cursor, and the table's own constraints as a second wall) against a real Postgres, **only when `TEST_DATABASE_URL` is set**, so `npm test` skips it. It was run once while building this, against PGlite (Postgres compiled to WebAssembly, served over the Postgres wire protocol), which found that the size check on `value` must use `length(value::text)` (`pg_column_size` counts compressed bytes, so a long repetitive string passed). It has **not** been run against Neon, Supabase or Vercel Postgres: do that once with a scratch database before the pilot (the checklist above). Its tests are written so each constraint is checked on its own; PGlite's single-process socket server swallowed the error of a third failing insert in a row, which real Postgres does not.

## Size

The collector, queue and sender are one chunk (`measurementCollector-`, 4.2 kB Brotli) loaded only on a device that shares; the Settings card's words are a lazily loaded message group (`pilotResults`, `src/i18n/lazyGroups.ts`). A first visit grew by about 0.7 kB; the precache by about 8.5 kB, so its budget is now 802 kB (`docs/notes/slow-internet.md`, "Later budget changes").
