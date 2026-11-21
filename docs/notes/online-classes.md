# Online classes

November 2026, Nick's brief: teachers and organisations see everyone in their class or program on any device, not only the learners on one device, and Thinkerwell gets an admin dashboard with the numbers for growth and for noticing patterns.

Decided with Nick on 19 November 2026 (before anything was built):

- **Off by default.** Nothing is sent from any device until three things have happened: Thinkerwell adds an organisation that has agreed to use online classes (`/admin`), the organisation adds a class (`/program`), and a learner enters that class's code on their Home and taps **Join class** after seeing what their teacher will see. The server answers 503 until it is set up (below). Justin approves the Privacy & Child Safeguarding changes in the same pull request.
- **What a teacher sees: name and progress.** The name the learner uses on the device (it can be a nickname), their language and reading level, which lessons and steps they finished and when, what they are working on, how many times they tried each section check, and when they were last active. Never their writing, answers, scores or recordings: the device never sends them (`snapshotFor` in `src/classes/links.ts`) and the server refuses a request that holds anything it doesn't expect (`checkSyncRequest` in `src/classes/protocol.ts`).
- **Secret links, no accounts.** Each organisation and each class has a link with a random key in its fragment (`/program#key=…`, `/teach#key=…`). Browsers never send a fragment to a server, and the page sends the key in an `Authorization` header. The server keeps only each key's sha256. A new link stops the old one working. Thinkerwell's own dashboard opens with `CLASSES_ADMIN_TOKEN` the same way (`/admin#key=…`).
- **The admin dashboard is anonymous.** Counts and trends across every organisation, and any class opened with its learners numbered ("Learner 3") in the order they joined. The server never sends the dashboard a name, or even a learner's id (`classDetail(…, false)` in `api/_lib/classesDb.ts`; tested).
- **Never a ranking.** Learners are listed in the order they joined, never by how far they've got, and no scores are shown anywhere (CLAUDE.md: no leaderboards; the class view on a device never shows scores either).

## How it works

```
learner's device                         /api/classes (Vercel function)          Postgres (db/classes.sql)
  Home › "Your class" › code ──lookup──▶  class name + organisation's name   ◀─  cv_classes, cv_orgs
  "Join this class" (settings.classLinks)
  runner: every 2 min while on screen,
  when back online, as the page hides ──sync──▶ checks every field, saves    ──▶ cv_learners, cv_progress,
                                                                                cv_checks, cv_active_days
teacher  /teach#key   ──GET class──────▶  names and progress                 ◀─
org      /program#key ──GET program─────▶ classes; add, rename, close, new teacher link
admin    /admin#key   ──GET admin───────▶ numbers, organisations; classes with numbers, not names
```

- **On the device** (`src/classes/`): `ClassCard.tsx` on the learner Home (loaded after the first paint, with its own words, the `classJoin` group); `links.ts` (join, leave, what is sent); `runner.ts` (when it is sent: only what changed, nothing when offline, a failed send changes nothing); `ClassSyncGate.tsx` in `AppLayout`, which loads the runner only on a device where someone joined a class or a removal is waiting. The state is two optional device settings, `classLinks` (per learner: a random id and secret for the server, the class's code and names, when it was last sent) and `classRemovals` (learners who stopped sharing or were removed from the device, still to tell the server), changed only in one transaction (`store.changeSettings`). They are not in the work file.
- **The class views** (`src/courses/class-views/`, routes `/teach`, `/program`, `/admin`): built like the video reviewers' page into `assets/preview/class-views/`, never precached, never linked from the site, `noindex` (`app.html`). Their words are the `classViews` group, in every ready language. Course, section and lesson names come from the catalog and the build-time outline, so no course is loaded.
- **The server** (`api/classes.ts`, `api/_lib/classes.ts`, `api/_lib/classesDb.ts`): one function for every action (Vercel's plan limits the number of functions). Rate limits per connection in memory, a lower one for wrong keys and unknown codes. Times from a device are clamped to "not after now". A learner's id belongs to the device that first sent it (`secret`): another device sending it gets `forbidden` and joins again under a new id (so a learner whose work moved to a new device appears again; their teacher can take the old one out). A learner a teacher took out is remembered by id only (`cv_removed`), so their device stops and can't rejoin under that id. Tests run the real SQL on PGlite in memory (`api/_lib/classes.test.ts`).
- **Stopping**: "Stop sharing" on Home deletes everything the server has about that learner, with the next send. Removing a learner from the device does the same. A teacher can take a learner out of the class; an organisation can close a class (its learners stop sharing); Thinkerwell can switch an organisation off (its links stop working and its learners stop sharing). Clearing the browser's data leaves the server's copy until a teacher takes the learner out.

## Switching it on

Decided with Nick on 19 November 2026: online classes use the **Neon database Thinkerwell already has** (`thinkerwell-pilot`, Vercel's Neon integration, free plan, Singapore `sin1`, made in October for pilot measurement). Its `DATABASE_URL` is already in Vercel for Production and Preview, so no password is copied anywhere. The `cv_` tables sit beside measurement's `events` table, which stays empty while study collection is paused. (A Supabase project was made the same day and is not used.)

1. **Tables**: none to make by hand. The function runs `db/classes.sql` (its copy, `api/_lib/classesSchema.ts`, checked against the file by a test) the first time each instance is asked anything; every statement is "if not exists". Answers 503 `database` if that fails.
2. **`CLASSES_ADMIN_TOKEN`** in Vercel (Production only, sensitive): set on 19 November 2026. To change it: `openssl rand -base64 32 | tr '+/' '-_' | tr -d '='`, replace it in Vercel and redeploy; the old admin link stops working.
3. Once deployed, open `https://thinkerwell.app/admin#key=<CLASSES_ADMIN_TOKEN>`, add an organisation that has agreed, and send its lead their link. They add classes and send each teacher their link; the teacher gives learners the class code.

Preview deployments have `DATABASE_URL` but no admin token, so `/api/classes` answers 503 there.

Keep the admin link private (a password manager, never chat). A leaked organisation or teacher link: make a new one from the page above it.

`api/_lib/classes.integration.test.ts` runs the whole flow through the real driver (`postgres.js`) when `TEST_DATABASE_URL` points at a scratch Postgres (PGlite's socket server, `@electric-sql/pglite-socket`, is enough); it found that a jsonb parameter must be passed as an array, not a JSON string.

## Making HELP's organisation link (how-to)

For Nick or Justin, once HELP for Refugees has agreed in writing to use online classes, and what its teachers will see (below). The same steps work for the partner in Malaysia. Nothing is sent from any learner's device until a learner joins a class, so making the link changes nothing on HELP's devices by itself.

**Before you start**

- Agree with HELP that its teachers and its lead will see, for each learner who joins: the name on the device (it can be a nickname, or a code from the code cards: `/educators/code-cards`), which lessons and steps they finish and when, how many times they try a section check, their language and reading level. Never their writing, answers, scores or recordings. The learner sees the same list before they tap "Join this class", and the Privacy & Child Safeguarding page says it in section 3.
- Have the admin link to hand: `https://thinkerwell.app/admin#key=<CLASSES_ADMIN_TOKEN>`, from the password manager. Never paste it into a chat or an email.

**Steps**

1. Open the admin link on a laptop or phone. The page is "Admin dashboard". If it says "Online classes aren't switched on yet", the token or database isn't set in Vercel (see "Switching it on" above).
2. Scroll to **Organisations**. Under **Organisation name**, type `HELP for Refugees` (up to 80 characters; it is what HELP's lead, its teachers and its learners see, on the class code screen).
3. Tap **Add organisation**. A box appears at the top of Organisations: **HELP for Refugees's link**, with the link and **Copy**.
4. Tap **Copy**, and send the link to HELP's lead the way you agreed (WhatsApp to the lead directly, or email). **It is shown only this once.** If you lose it before sending, tap **New link** on HELP's row, then **Make a new link**: the page asks first, because the old link stops working.
5. Tell the lead what to do with it: open the link (save it as a bookmark; anyone with it can see HELP's classes), type a class name for each group (for example "Morning group"), tap **Add class**, then send each class's **Teacher's link** to its teacher. Each class has a **class code** (like `K7M-Q4P`) for its learners.
6. Each learner joins on their own Home on the device: choose their name under "Who's learning today?", then **Your class**, **Join a class**, type the code, **Find class**, read what their teacher will see, and **Join this class**.

**Afterwards**

- HELP's row on the admin page shows its classes, learners, how many were active this week and lessons finished. **View classes** shows each class with learners numbered (Learner 1, Learner 2 …), never named: the admin page never gets names.
- A link that leaks or is lost: **New link** (for the organisation) or **New teacher link** (inside a class, on HELP's page). Both ask first.
- To stop: **Switch off** on HELP's row (it asks first). HELP's links stop working and its learners' devices stop sharing; what was shared stays, and **Switch on** brings the links back, though each learner would have to join again. A learner can stop sharing at any time on their Home; a teacher can **Take out of class**, which deletes that learner's progress from the server.

Don't make a test organisation on the live site: every organisation shows on the admin page and in its numbers, and there is no delete. To try the steps first, use a local build with the stand-in in `api/_lib/classes.integration.test.ts`, or the end-to-end stand-in (`e2e/classesFake.ts`).

## Changed after the walkthrough (20 November 2026)

The whole flow (admin, organisation, teacher, a learner joining and finishing a lesson) was walked at 390px and 820px in English and Bahasa Indonesia, against the real handler on an in-memory database. Fixed:

- **The button that joins** was "Join class", next to "Join a class", which opens the code box; in Indonesian, Malay and Vietnamese both were the same words. It is now "Join this class" (`classJoin.join`).
- **What a learner is told** before and after joining, and the teacher's "You see …" line, now list everything the teacher's page shows: the name, which lessons and steps and when, section-check tries, language and reading level (before: only the name and the lessons and steps).
- **"0 of 0 lessons finished"** on every learner of a class where nobody had started a lesson yet: now only "Not started yet" until there is something to count.
- **New link, New teacher link, Close class and Switch off** acted on one tap. A mis-tap stopped a link someone else had, or every learner's sharing. They now ask first, like "Take out of class", and say so if they fail instead of doing nothing (`ConfirmAction.tsx`). Switching on and opening a class again still take one tap.
- **The organisation page** says what to do first: "Add a class for each group. Each class gets a code for its learners and a link for its teacher."
- The teacher's code note says each learner joins on **their own** Home.

## The monthly impact snapshot (20 November 2026)

A printable one-page summary of a month, **counts only**, for reports to funders and partners. On the organisation page (`/program`, its own classes; shown once it has a class) and the admin dashboard (`/admin`: every organisation together, or one), under "Impact snapshot": choose the month (November 2026 to this month) and, on the admin page, the organisation, then **Show the snapshot**, then **Print**. One portrait page on A4 or Letter (`e2e/online-classes.spec.ts` checks), black on white, nothing under 10.5pt.

What it counts, all in UTC like the rest (`snapshot` in `api/_lib/classesDb.ts`, `GET program.snapshot` and `GET admin.snapshot` in `api/_lib/classes.ts`; `ImpactSnapshot.tsx`):

| Number | How it is worked out |
| --- | --- |
| Active learners | Learners with at least one active day (a day of lesson work, `cv_active_days`) in the month |
| Lessons finished | Lessons whose `completed_at` falls in the month |
| Courses used | Per course: learners who started, worked on (last change) or finished one of its lessons in the month, and lessons finished |
| Languages used | The month's active learners by the language they use **now** (only the latest is kept) |
| Came back the next week | Of the month's active learners, by their first active day in the month: how many had an active day 7 to 13 days later. Learners whose next week isn't over are left out and counted apart ("Not counted yet: …") |

Never names, nicknames, writing, answers, a learner's id or anything about one learner: the server sends only the counts. It counts only learners still sharing: a learner who stops sharing or is taken out of a class is deleted, with their numbers, so a month's snapshot can go down later. "Worked on" uses a lesson's last change, so a lesson started in October and finished in December counts in neither month's "Courses used" for November. The Privacy page says the snapshot exists, in its online-classes entry (`privacy.services.classes.gets`). The month is checked on the server (`snapshotMonth`): November 2026 to the current month, nothing else.

## Not done yet

- Native-speaker review of the Indonesian, Malay and Vietnamese words (AI-drafted, like the rest of the interface).
- No export or download of a class's data (on purpose, for now).
- Nothing about online classes on the Educators page, the setup checklist or the session guide: an organisation learns about it from Thinkerwell when it agrees to use it.
- No way to delete an organisation or a class from the pages (only switch off or close).
