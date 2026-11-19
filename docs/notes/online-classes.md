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
  "Join class" (settings.classLinks)
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

Nothing here is live until someone does all of this, with an organisation that has agreed:

1. Choose a Postgres host (Neon, Supabase in Singapore, or Vercel Postgres), make a database and run `psql "$DATABASE_URL" -f db/classes.sql`. Name the company on the Privacy page (`privacy.services.classes.where` in every language, and `POLICY_UPDATED`) before the first class uses it.
2. In Vercel, set `DATABASE_URL` and `CLASSES_ADMIN_TOKEN` (at least 32 random characters: `openssl rand -base64 32 | tr '+/' '-_' | tr -d '='`). Redeploy.
3. Open `https://thinkerwell.app/admin#key=<CLASSES_ADMIN_TOKEN>`, add the organisation and send its lead their link. They add classes and send each teacher their link; the teacher gives learners the class code.

Keep the admin link private (a password manager, never chat). A leaked organisation or teacher link: make a new one from the page above it.

## Not done yet

- Native-speaker review of the Indonesian, Malay and Vietnamese words (AI-drafted, like the rest of the interface).
- No export or download of a class's data (on purpose, for now).
- Nothing about online classes on the Educators page, the setup checklist or the session guide: an organisation learns about it from Thinkerwell when it agrees to use it.
