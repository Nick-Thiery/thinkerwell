# Pilot measurement plan (quantitative)

**Pilot:** HELP for Refugees, Jakarta
**Assumed shape:** 15–25 learners, 6–8 lessons over 4–6 weeks, run by a HELP teacher
**Status:** proposed

## What this can and can't show

With about 20 learners and no comparison group, the pilot can show whether learners' scores went up, by how much, on which skills, and whether they kept using the site. It **can't prove Thinkerwell caused the change**. Two design choices below make the result much more believable:

- untaught "control" questions
- blind marking of the writing

Report it as "learners improved by X on what the course taught, versus Y on questions it didn't teach". Don't write "Thinkerwell raised scores by X".

---

## The numbers you'll report

| Metric | How it's calculated | Source |
|---|---|---|
| Average pre → post score | Mean % correct on the taught items, first session vs last | Pre/post check |
| Learning gain | Normalised gain per learner: (post − pre) ÷ (100 − pre), then averaged | Pre/post check |
| Share of learners who improved | % with post > pre | Pre/post check |
| Taught vs untaught gain | Gain on taught items minus gain on untaught items (the "control" gap) | Pre/post check |
| Gain by skill | Same as above, split by skill tag | Pre/post check |
| Writing score change | Rubric score (0–6) pre vs post, marked blind by two people | Writing task |
| Confidence change | Mean of five 1–4 ratings, pre vs post | Confidence check |
| Attendance and retention | Sessions attended; % still active in the last week | Educator log + app |
| Lessons completed per learner | Count of required reflections saved | App |
| Active learning time | Minutes on a lesson page with activity in the last 60 seconds | App |
| Quick-check accuracy trend | % correct on first try, early lessons vs late lessons | App |
| Section quiz score | First attempt and best attempt | App |
| Video vs read-instead | Plays, % watched, "Read instead" clicks, failures | App |
| Support use | Simpler English and Listen, per lesson | App |

---

## 1. Pre/post check (the core measure)

- **16 multiple-choice questions, about 15 minutes**, taken in the app in the first and last sessions.
  - **12 "taught" questions**: 2 from each lesson in the pilot, covering its core idea.
  - **4 "untaught" questions** of similar difficulty, from lessons **not** in the pilot.

  If scores rise only on taught questions, that's much better evidence than "scores rose".
- **Same questions both times**, in shuffled order with shuffled options. No answers, feedback or score are shown during either sitting, so the test itself doesn't teach.
- **Skill tag on every question**, for example:
  - Sources & evidence
  - Maps & place
  - Cause & effect
  - Perspectives
  - Choices & trade-offs
  - Checking information
  - Key vocabulary

  The same tags go on the quick checks and section quizzes, which is what makes skill-level reports and later mastery tracking possible.
- **Read-aloud allowed** (the Listen button, or the teacher). You're measuring social-studies understanding, not decoding.
- **Analysis**: report means with 95% confidence intervals and a paired Wilcoxon signed-rank test, which holds up at small n. Report normalised gain as well as raw points, because learners who start high can't gain as many points.
- **Paper fallback**: the same questions as a printable sheet, in case the Wi-Fi fails on test day. The teacher enters the answers afterwards.

## 2. Short writing task (claim + evidence)

- **Prompt** (same kind, pre and post): "Here are two short clues about a fictional town. What do you think happened? Use one clue to support your idea." Allow 8 minutes.
- **Rubric, 0–2 on each of three parts (0–6 total)**:
  - Claim: states a clear idea.
  - Evidence: uses a detail from the clues.
  - Reasoning: explains how the clue supports the idea, or names a limit.
- **Blind marking**: mix pre and post scripts, hide learner codes and dates, and have **two people** mark every script. Report how often they agreed. This is what turns qualitative writing into a defensible number.

## 3. Confidence check (1 minute)

Five statements, each rated on a 4-face scale (😟 🙁 🙂 😀), pre and post:

1. I can explain what a source tells us.
2. I can use a map to find information.
3. I can give a reason for my answer.
4. I can share my ideas with a partner.
5. I can tell if information might not be true.

## 4. In-app usage data (automatic)

Log these events, all tied to a pilot code, never a name:

- `session_start`, `session_end`, and `heartbeat` (every 30 seconds while the page is visible and there was input in the last 60 seconds). Heartbeats give "active minutes" without counting a tablet left open.
- `lesson_open`, `stage_enter`, `stage_complete`, `lesson_complete`.
- `quick_check_answer` (question ID, chosen option, correct, attempt number).
- `quiz_start`, `quiz_answer`, `quiz_submit` (score, attempt).
- `writing_saved` (**word count only**, not the text).
- `simpler_toggle`, `listen_play`.
- Video: `video_choice` (video / read instead), `video_play`, `video_progress` (25/50/75/100%), `video_fail`.

  "Watch time" needs the YouTube IFrame Player API; a plain iframe can't report it.
- Pre/post: every answer, plus the confidence ratings.

The app should keep **learners' writing on the device by default**. The writing task is marked from printouts or an export the teacher makes, so free-text answers from children aren't copied to a server automatically.

## 5. Educator log (weekly, a 2-minute Google Form)

For each session:

- learners present
- lessons used
- minutes of preparation
- whether the session ran as planned (yes / partly / no)
- technical problems
- one thing that worked
- one thing to change

This covers the handoff's "educator feasibility" measures.

---

## Privacy and consent (settle this with HELP before any data is collected)

- **Pilot codes, not names.** HELP prints a card for each learner (`HLP-01`, `HLP-02`, …). The list linking codes to names stays on paper with HELP, and Thinkerwell never has it. Nicknames are optional and are kept on the device only.
- **Consent.** Indonesia's Personal Data Protection Law (Law No. 27 of 2022) treats children's data as "specific" personal data, and Article 25 requires a parent's or guardian's consent to process it.
  - Get a short consent form signed through HELP, in the families' languages, and a simple "yes, I'd like to" from each learner.
  - Say what's collected, why, who can see it, and when it's deleted.
  - Thinkerwell is based in Singapore, so check Singapore's PDPA too.
  - This isn't legal advice. HELP may already have a process you can use.
- **Collect the minimum.** No names, photos, locations, free-text answers or device fingerprints. Delete the raw event data after the pilot report, for example within 6 months, and say so on the consent form.
- **Third parties.** Even `youtube-nocookie.com` sends some data to Google once a video plays. Mention it on the form. It's another reason the "Read instead" option matters.

---

## How to build it (for Claude Code)

- **Learner switcher**: "Who's learning?" at the start, with one profile per pilot code on each device. This also fixes shared tablets showing the previous kid's work.
- **Event queue**: write events to IndexedDB first, then send them in batches to `POST /api/events` when online. Each event carries a UUID so a retry never double-counts.

  Event shape: `{ id, pilotCode, orgId, deviceId, sessionId, lessonId, stage, type, value, ts, appVersion }`.
- **Storage**: one `events` table in a free-tier Postgres (Supabase or Neon, through Vercel). Only the server route writes to it. The browser never holds database keys.
- **Export**: a password-protected `/admin/export` that downloads a CSV. A proper dashboard can come later; for the pilot report, a CSV plus a short analysis script is enough.
- **Pre/post check**: build it as a special quiz (`mode: "assessment"`) that reuses the section-quiz component with feedback turned off. Questions come from the same tagged question bank.

## Suggested timeline

| When | What |
|---|---|
| Before the pilot | Agree the lessons with HELP; consent forms; print pilot codes; check the devices; try the site on HELP's Wi-Fi |
| Session 1 (about 30 min extra) | Pre-check (15 min), writing task (8 min), confidence check (1 min), then the first lesson |
| Sessions 2 to N−1 | Lessons plus section quizzes; the teacher fills in the weekly log |
| Final session | Post-check, writing task, confidence check; a short group chat about what they liked, as notes |
| 1–2 weeks after | Blind marking, analysis, a two-page pilot report for HELP and future partners |
