# Local-language Watch videos

A lesson's Watch step has one YouTube video, in English. For a language whose lessons are translated (Bahasa Indonesia, Bahasa Melayu), a lesson can instead show **its own video, in that language, by local creators**. This note says how that works, why it is built so that nothing switches on by itself, and how a reviewer approves a video. It is in the app and tested, and **no local video is approved yet**: every lesson still shows the English video, with the note that it is in English, exactly as before. On 15 October 2026 every candidate was pre-screened from its captions (below, "The candidates"); on 16 October the rest were screened and more were looked for, and 42 of the 48 lesson slots now have a recommended video waiting for a reviewer.

## Why it works this way

The candidates (`docs/notes/local-videos/id.json` and `ms.json`) have been **pre-screened by an AI from YouTube's captions, not watched by a person**: their questions and written versions are drafts. Learners are children aged about 10 to 17, some of them from conflict, and Lessons 4 and 19 are sensitive. So a video reaches a learner only after a person who speaks the language has watched all of it with the sound on, read the written version against it, and put their name and the date on it. Everything below follows from that.

- **Nothing is on until a person approves it.** An entry is used only when it says `approved: true` (exactly the boolean) *and* is complete: who approved it, when, a well-formed YouTube id, the questions, the written version and at least one key point. The check is made three times: the build refuses an incomplete approved entry; the build drops every entry that is not approved before the browser downloads the file (a candidate that nobody approved is never in a built file, not even as data); and the app applies the same rule again (`src/content/localVideos.ts`, `approvedLocalVideo`) when it lays the file over the lessons.
- **Everything else is as before.** A lesson without an approved entry shows the English video, marked `lang="en"`, with "This video is in English. Read instead has the same ideas in your language." English never reads these files.
- **The Watch rules don't change.** Tap to play, nothing requested from YouTube before the tap (no thumbnails; the poster is drawn from the content), the 20-second fallback, Save data, offline, "Read instead" with a written version, the same `youtube-nocookie.com` embed and referrer policy, the same Content-Security-Policy, captions on. A local video is the same kind of thing as the English one, with other words.

## The file

`content/<code>/videos.json`, one per language whose lessons are translated (today `content/id/videos.json` and `content/ms/videos.json`, both empty):

```json
{
  "language": "id",
  "lessons": {
    "L05": {
      "approved": true,
      "approvedBy": "Name of the person who watched it",
      "approvedOn": "2026-10-20",
      "youtubeId": "6KupDuyOGFw",
      "title": "…in Indonesian…",
      "channel": "…",
      "durationSeconds": 267,
      "why": "…",
      "beforeQuestion": "…",
      "afterQuestion": "…",
      "summary": "The written version (\"Read instead\"); paragraphs are separated by a blank line.",
      "summaryBasis": "transcript",
      "keyPoints": ["…", "…", "…"],
      "contentNote": null
    },
    "L09": { "approved": false, "youtubeId": "2xWpbjWp1Qc", "title": "…", "channel": "…", "note": "Watched: too hard for learners." }
  }
}
```

- Keys are lesson file names (`L01` … `L24`). The text fields are in the language of the file. `summaryBasis` says where the written version came from (`watched`, `transcript`, `description`, `title-and-description`), as an audit trail.
- An entry with `approved: false` is only a note that a video was considered (an id, title, channel and a `note`). It changes nothing and never reaches the browser.
- `contentNote` is the collapsed "For teachers" note, or `null`; the team-only `replacementSuggestion` of the English lesson doesn't apply to a local video.
- Optional: `startSeconds` and `endSeconds`, the **part of a longer video** the lesson plays (both or neither; `durationSeconds` is then the part's length, which the build checks), and `channelUrl`, the publisher's channel (`https://www.youtube.com/@…`), linked in Credits. Many good local videos are classroom lessons of 20 to 45 minutes where three minutes fit; the player starts and stops there (`start` and `end` on the embed), and the teacher guide, print view and Credits name the part and open the video at its start.

### What is checked, and where

- **The build** (`checkContent` in `vite.config.ts`, `checkLocalVideos` in `src/content/load.ts`, schema `localVideosFileSchema` in `src/content/schema.ts`; zod, never in the browser): the file is for the language of its folder; every key is a lesson that exists; an approved entry has `approvedBy`, `approvedOn` (a real date), a well-formed 11-character `youtubeId`, `title`, `channel`, `durationSeconds` (or `null`), `why`, both questions, `summary`, `summaryBasis`, at least one key point and `contentNote`; a part has both ends, in order, and its length is `durationSeconds`; unknown fields are errors; an approved video is not the lesson's English video. A problem stops the build.
- **`npm run check:content`** runs `scripts/check_videos.py` on each language's file (and Claude Code runs it as soon as it edits one, `.claude/hooks/check_content_edit.py`): the same rules in Python, plus the words. The text learners and teachers read must be in the language of the file: not English (a share of common English words is an error), for Malay not Indonesian (the list in `scripts/check_translation.py`), and the house style (`kamu`, never `Anda`; no "please"). It warns when a summary was made from a title and description. The titles and channels are YouTube's own words and are not checked for language.
- It does **not** check that a summary is true. That is what the person who approves is for.

## How the app uses it

- `contentFor()` (`src/content/index.ts`) lays a language's approved videos over its lessons: the lesson's `watch` becomes the local video's (id, title, channel, length, why, the two questions, the written version, key points, teachers' note) and carries `localVideo: true`. English content is never touched. Everything that shows a lesson reads it through `useContent()` / `useLessonContent()`, so the effective video is the one for the language on screen: the Watch step, the lesson page's "About N min" watch time, the print view, the teacher guide.
- **The player.** The same embed as the English video's, with three additions for a local video only: `start` and `end` for its part, and `hl` and `cc_lang_pref` set to the language, so the player's own words and its captions are in the language too. Captions stay on (`cc_load_policy=1`); for most local videos they are YouTube's automatic captions, which can mis-hear (see "What the pre-screen found").
- **Language marking.** `lang="en"` marks the English video's title and channel in every language (`englishLang`, `<AlwaysEn>`). For a local video it is not used: they are in the language on screen, which is already the page's language (`contentLang`). The "video is in English" note shows only when the lesson's video is English (`content && !watch.localVideo`).
- **Credits** (`/credits`) lists every video that can be shown: each lesson's English video, and under it each language's approved video for that lesson, with channel and link, whichever language is on screen. Each language's file is a small chunk of its own (`assets/locales/<code>/videos-<hash>.js`, `src/content/localVideoFiles.ts`), so Credits loads them without the languages' lessons.
- **Offline.** The videos chunk is precached with the language (only once the language is `ready`, like its lessons) and fetched with the language's own chunk. Today both are 150 bytes. With all 24 lessons approved a file is about 30 kB raw, roughly 9 kB Brotli (two entries measured 2.6 kB raw), so approving every lesson in both languages raises the precache by about 18 kB and its budget has to be raised then. See `docs/notes/slow-internet.md` ("Local-language videos").
- **Pilot measurement.** The video events (`video_choice`, `video_play`, `video_progress`, `video_fail`) carry the lesson and nothing about the video, so they are the same for an English and a local video, and nothing the consent form doesn't cover is added (`src/content/localVideos.test.ts` checks the event shapes). The cost: results can't tell which video a learner saw. If the team wants that, it needs a consent-form change first.
- **Progress** (`beforeAnswer`, `afterAnswer`, `readInstead`, Watch done) is per lesson, not per video, and keeps working when a learner changes language or when a video is approved later: the answer to "before the video" stays what the learner typed.

## The candidates

`docs/notes/local-videos/<lang>.json` holds, for each of the 24 lessons, the video recommended to a reviewer (`primary`, or `null` with `noGoodMatch: true`) and every other video looked at (`screened`). Each video has YouTube's facts (title, channel, `channelUrl`, `fullDurationSeconds`, `captions`: `manual`, `auto`, `none`, `broken`; `autoDubbed`; `verifiedByOembed`), a `reviewStatus` and a `screening` record (by whom, when, and what was found, in English for the team):

- **prescreened**: its captions were read against the lesson's goal and Watch questions, and it fits. It has the part to play, and drafts of everything a lesson needs, in the language: `why`, both questions (`questionsChanged` lists the ones adapted to this video; the others are the lesson's own), the written version, three key points and a teachers' note where one is needed. `weakFit` marks a video that covers only part of the lesson. **Only a prescreened candidate can be approved.**
- **unverified**: it couldn't be checked (no captions, broken captions, or YouTube wouldn't play it signed out). A person must watch it; if it fits, its drafts are written then.
- **rejected**: not suitable, and why.

Nothing in this file reaches the app or the browser. The pre-screen was done by Claude in the built-in browser of a team laptop, signed out of YouTube (YouTube refuses these requests from the cloud); `.claude/agents/watch-video-screener.md` is the procedure, with the two scripts it runs, for screening more.

### The pre-screens of 15 and 16 October 2026

On 15 October, the 44 videos for the 48 slots (24 lessons in each language) from the audit in `docs/research/`; on 16 October, all 82 videos in the research notes of #42 (Malay) and #43 (Indonesian): 59 in the morning and, once the laptop's browser was back, the last 23 (all for Indonesian lessons that already had a recommendation); then 37 more, found for the slots still open and to check three alternatives against their recommendations. Each was played and its captions read. Where the slots stand now:

| | Bahasa Indonesia | Bahasa Melayu |
| --- | --- | --- |
| Recommended (prescreened) | 24: every lesson | 18: L01, L02, L05, L06, L07, L08, L09, L10, L11, L12, L13, L15, L17, L20, L21, L22, L23, L24 |
| Of those, weak or partial fits | L05, L16, L17, L18 | L15, L22, L23 |
| Other videos that also fit ("Also suitable") | 15: L02, L03, L04, L05, L07, L08, L10, L11, L13, L14, L15, L17, L20, L21, L24 | 7: L01, L07, L08, L13, L17, L20, L21 |
| No recommendation; a person must watch one first | none | L03, L04, L14 (best lead: Astro AWANI's sign-language flood warnings, `ghm-3Vky1Us`), L16, L18 |
| Rejected, nothing else yet | none | L19 |

New on 16 October: Indonesian L01, L06, L09, L12, L16, L19, L20 and L24, and Malay L05 and L15; Malay L13's recommendation changed to a better fit (Astro Lab's video on hotter dry seasons), and the earlier one is now an alternative.

Later on 16 October: Indonesian L07 (Lumensia, on how surplus, irrigation and the temple's store made the first states; AI-dubbed, an anonymous new channel, and nothing outside 1:27–4:16 may be shown) and Malay L09, L11, L12, L23 and L24. Three Indonesian recommendations changed to the alternative that fits the lesson better: L03 (Kok Bisa?'s zoom out from people to the edge of the solar system), L15 (TVRI on noken) and L21 (Kompas on a market in NTT that still barters). The earlier ones are alternatives now and keep their drafts.

Questions: 14 of the 42 recommendations keep both of the lesson's questions, 10 adapt one and 18 adapt both to the video, because a video with another example (Banten's river instead of the Tigris, Melaka instead of the Silk Road) would leave the lesson's question unanswerable. `npm run videos:sheet` lists each one beside the lesson's own. The alternatives have no drafts yet (except the earlier recommendations: Malay L13, Indonesian L03, L15 and L21): if a reviewer prefers one, its drafts are written then.

### What the pre-screen found that matters beyond one video

- **YouTube's AI dubbing.** It is common: five of the recommendations (Indonesian L01, L06, L07 and L10, Malay L05) and several other candidates have an AI-dubbed English soundtrack, and in a browser set to English YouTube played that one, not the original. The embed asks for the player in the video's language (`hl`), which is meant to keep the original, but that is YouTube's choice and couldn't be tested from here (YouTube's player refuses to run outside a real page). So `videos:apply` refuses a candidate with `autoDubbed: true` until the reviewer has played it **on the devices learners use** and heard the original language (`--checked-audio`). None of the English videos had a dubbed track when checked.
- **Automatic captions.** Most local videos have only YouTube's automatic captions, which the player shows by default. They mis-hear: in two videos outside the chosen parts they produce a rude word, and one Malay video's captions are Hindi gibberish (YouTube took the Malay for Hindi). YouTube also labels most Malaysian Malay captions as Indonesian. The reviewer watches with captions on.
- **Small channels, re-uploads and machine-made narration.** Several promising videos come from one-person channels whose narration may be synthetic (the sheet says which); a reviewer decides whether that matters. Videos that looked like re-uploads of someone else's work were turned down, since the brief is the original creators' own uploads, and so was one whose machine-made script got a basic date wrong (Europeans trading at Melaka in the 15th century).
- **A video that asks for a sign-in.** UNICEF Indonesia's `-k3igxia4Ho` (L24) wouldn't play signed out ("Please sign in. This helps protect our community") while every other video did. Learners are never signed in, so it may not play for them.
- **Unsuitable things a title doesn't show.** Rejected for content: a farming video with jokes about sex, a TV lesson where the host remarks on a schoolgirl's looks, a savings video that says money belongs in a bank (many refugee learners can't open one), a commercial tutoring upsell, a savings video with an investment app's referral code, a video about going home to the family village for Lebaran (many refugee learners can't), one asking "where do we Indonesians come from?", and videos that get the facts wrong (seasons explained by the Earth's tilt, map scales the wrong way round).

## How a reviewer approves a video

1. Open the review sheet, `docs/notes/local-videos/review-<lang>.md` (made by `npm run videos:sheet`): each recommended video with its link at the right minute, the part to watch, both questions beside the lesson's own, the draft written version and key points, what the pre-screen found, a checklist, and the command that approves it.
2. Someone who speaks the language **watches the part with the sound and captions on**, on the devices learners use, and checks it against the checklist. Corrections to the questions, written version, key points or teachers' note go into the candidates file (`docs/notes/local-videos/<lang>.json`), by the reviewer or by whoever runs the command for them; then `npm run videos:sheet` again.
3. Approve, naming the reviewer:

   ```
   npm run videos:apply -- id L05,L09 --approved-by "Their name"
   ```

   It refuses, and writes nothing, when a lesson has no recommended candidate, when it isn't `prescreened`, when YouTube's check didn't accept it, when the result would not pass the build's checks, **when YouTube has an AI-dubbed soundtrack of it** (add `--checked-audio` once the reviewer has heard the original on the learners' devices), and **when the written version isn't based on the video's words** (`summaryBasis` is `description` or `title-and-description`; add `--accept-unverified-summary` once the reviewer has read it against the video). `--dry-run` shows what would change without writing; `--date YYYY-MM-DD` sets another date. It copies the part (`startSeconds`, `endSeconds`) and `channelUrl`, and none of the screening record.
4. Check: `npm run videos:report` (which lessons use a local video, which the English one, and where every other slot stands), `npm run check:content`, `npm test`, `npm run build`. Open the lesson's Watch step with the language on.
5. Commit `content/<lang>/videos.json` and open a pull request. The pull request is the second pair of eyes; the file itself holds the reviewer's name and the date.

To take a video back: delete its entry (or set `"approved": false`). The lesson shows the English video again at once.

## Testing

- Vitest: the loader's overlay and lock (`src/content/localVideos.test.ts`), the build's checks, `WatchStage.localVideo.test.tsx`, the teacher guide, print view and Credits (`src/pages/localVideoPages.test.tsx`), the commands, including the approval rules for status and dubbing, the report's slots and the review sheet (`tools/videos/videos.test.ts`). They use the fixture `e2e-dev/fixtures/local-videos/id.json` (Lesson 5 approved, as a part of a longer video with its channel; Lesson 9 not), which is not in `content/`.
- End to end: `e2e-dev/local-videos.spec.ts` (`npm run test:e2e:dev`) runs against the dev server, started with `TW_TEST_LOCAL_VIDEOS=e2e-dev/fixtures/local-videos`, which makes `testLocalVideos()` in `vite.config.ts` serve that fixture as `content/id/videos.json`. The plugin applies to `vite serve` only, and only with the variable set, so it cannot exist in a production build; `e2e/build-output.spec.ts` checks the built files contain none of the fixture's names or ids and no unapproved entry. The production specs (`indonesian`, `malay`, `lesson-player`, `educators`, `print`, `credits`) run against the real, empty files: the English video and its note.
- Python: `scripts/check_videos.py` is run by `npm run check:content`.

## Open points

- Nothing is approved. The reviewers are the HELP teacher for Bahasa Indonesia and the Malaysian partner for Bahasa Melayu; the founders choose them.
- Six Malay slots have no recommendation: L03, L04, L14, L16 and L18 have only videos without captions for a person to watch, and L19 nothing. Malaysian YouTube has few short, captioned social-studies explainers, and YouTube labels most Malaysian Malay captions as Indonesian and mis-hears them badly, so most Malay teachers' notes suggest captions off. Lessons 4 and 19 are sensitive: a local educator reviews any video for them first.
- Whether `hl` keeps YouTube's original soundtrack for a dubbed video is untested (see above).
- The written versions of local videos are not in the review spreadsheet (`npm run review:export`): they are written for the video and approved by the person who watched it, not translated from English.
- Listen reads the Read stage only, so local videos need no recordings.
