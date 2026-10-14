# Local-language Watch videos

A lesson's Watch step has one YouTube video, in English. For a language whose lessons are translated (Bahasa Indonesia, Bahasa Melayu), a lesson can instead show **its own video, in that language, by local creators**. This note says how that works, why it is built so that nothing switches on by itself, and how a reviewer approves a video. It is in the app and tested, and **no local video is approved yet**: every lesson still shows the English video, with the note that it is in English, exactly as before.

## Why it works this way

The researched candidates (`docs/notes/local-videos/id.json` and `ms.json`, from the research pull requests) are **unwatched**: every one says `needsWatching: true`, and their written summaries are worded from a video's title and description, not from what it says. Learners are children aged about 10 to 17, some of them from conflict, and Lessons 4 and 19 are sensitive. So a video reaches a learner only after a person who speaks the language has watched all of it with the sound on, read the written version against it, and put their name and the date on it. Everything below follows from that.

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

### What is checked, and where

- **The build** (`checkContent` in `vite.config.ts`, `checkLocalVideos` in `src/content/load.ts`, schema `localVideosFileSchema` in `src/content/schema.ts`; zod, never in the browser): the file is for the language of its folder; every key is a lesson that exists; an approved entry has `approvedBy`, `approvedOn` (a real date), a well-formed 11-character `youtubeId`, `title`, `channel`, `durationSeconds` (or `null`), `why`, both questions, `summary`, `summaryBasis`, at least one key point and `contentNote`; unknown fields are errors; an approved video is not the lesson's English video. A problem stops the build.
- **`npm run check:content`** runs `scripts/check_videos.py` on each language's file (and Claude Code runs it as soon as it edits one, `.claude/hooks/check_content_edit.py`): the same rules in Python, plus the words. The text learners and teachers read must be in the language of the file: not English (a share of common English words is an error), for Malay not Indonesian (the list in `scripts/check_translation.py`), and the house style (`kamu`, never `Anda`; no "please"). It warns when a summary was made from a title and description. The titles and channels are YouTube's own words and are not checked for language.
- It does **not** check that a summary is true. That is what the person who approves is for.

## How the app uses it

- `contentFor()` (`src/content/index.ts`) lays a language's approved videos over its lessons: the lesson's `watch` becomes the local video's (id, title, channel, length, why, the two questions, the written version, key points, teachers' note) and carries `localVideo: true`. English content is never touched. Everything that shows a lesson reads it through `useContent()` / `useLessonContent()`, so the effective video is the one for the language on screen: the Watch step, the lesson page's "About N min" watch time, the print view, the teacher guide.
- **Language marking.** `lang="en"` marks the English video's title and channel in every language (`englishLang`, `<AlwaysEn>`). For a local video it is not used: they are in the language on screen, which is already the page's language (`contentLang`). The "video is in English" note shows only when the lesson's video is English (`content && !watch.localVideo`).
- **Credits** (`/credits`) lists every video that can be shown: each lesson's English video, and under it each language's approved video for that lesson, with channel and link, whichever language is on screen. Each language's file is a small chunk of its own (`assets/locales/<code>/videos-<hash>.js`, `src/content/localVideoFiles.ts`), so Credits loads them without the languages' lessons.
- **Offline.** The videos chunk is precached with the language (only once the language is `ready`, like its lessons) and fetched with the language's own chunk. Today both are 150 bytes. With all 24 lessons approved a file is about 30 kB raw, roughly 9 kB Brotli (two entries measured 2.6 kB raw), so approving every lesson in both languages raises the precache by about 18 kB and its budget has to be raised then. See `docs/notes/slow-internet.md` ("Local-language videos").
- **Pilot measurement.** The video events (`video_choice`, `video_play`, `video_progress`, `video_fail`) carry the lesson and nothing about the video, so they are the same for an English and a local video, and nothing the consent form doesn't cover is added (`src/content/localVideos.test.ts` checks the event shapes). The cost: results can't tell which video a learner saw. If the team wants that, it needs a consent-form change first.
- **Progress** (`beforeAnswer`, `afterAnswer`, `readInstead`, Watch done) is per lesson, not per video, and keeps working when a learner changes language or when a video is approved later: the answer to "before the video" stays what the learner typed.

## How a reviewer approves a video

1. Get the candidates: `docs/notes/local-videos/<lang>.json` comes from the research pull requests (`local-videos-id`, `local-videos-ms`); merge them first, or check the files out on this branch.
2. Someone who speaks the language **watches the whole video with the sound on**, and reads the lesson's Watch question, the written version and the key points against it. Anything wrong is corrected in the candidate file (`summary`, `keyPoints`, the questions, `contentNote`); a teachers' note is written if the video needs one (sensitive scenes, slang).
3. Approve, naming themselves (the primary candidate of each listed lesson is copied):

   ```
   npm run videos:apply -- id L05,L09 --approved-by "Their name"
   ```

   It refuses, and writes nothing, when a lesson has no primary candidate or the candidate failed YouTube's embed check, when the result would not pass the build's checks, and **when the summary isn't based on a transcript** (`summaryBasis` is `description` or `title-and-description`: it says what the title and description say, not what the video says). If the reviewer has watched it and read the summary against the video, they say so with `--accept-unverified-summary`:

   ```
   npm run videos:apply -- id L05,L09 --approved-by "Their name" --accept-unverified-summary
   ```

   `--dry-run` shows what would change without writing; `--date YYYY-MM-DD` sets another date. The command prints each lesson it added or replaced. `summaryBasis` is kept as the candidate had it, so the file shows what the summary was made from.
4. Check: `npm run videos:report` (which lessons use a local video and which the English one, who approved each, how many candidates are still waiting), `npm run check:content`, `npm test`, `npm run build`. Open the lesson's Watch step with the language on.
5. Commit `content/<lang>/videos.json` and open a pull request. The pull request is the second pair of eyes; the file itself holds the reviewer's name and the date.

To take a video back: delete its entry (or set `"approved": false`). The lesson shows the English video again at once.

## Testing

- Vitest: the loader's overlay and lock (`src/content/localVideos.test.ts`), the build's checks, `WatchStage.localVideo.test.tsx`, the teacher guide, print view and Credits (`src/pages/localVideoPages.test.tsx`), the two commands (`tools/videos/videos.test.ts`). They use the fixture `e2e-dev/fixtures/local-videos/id.json` (Lesson 5 approved, Lesson 9 not), which is not in `content/`.
- End to end: `e2e-dev/local-videos.spec.ts` (`npm run test:e2e:dev`) runs against the dev server, started with `TW_TEST_LOCAL_VIDEOS=e2e-dev/fixtures/local-videos`, which makes `testLocalVideos()` in `vite.config.ts` serve that fixture as `content/id/videos.json`. The plugin applies to `vite serve` only, and only with the variable set, so it cannot exist in a production build; `e2e/build-output.spec.ts` checks the built files contain none of the fixture's names or ids and no unapproved entry. The production specs (`indonesian`, `malay`, `lesson-player`, `educators`, `print`, `credits`) run against the real, empty files: the English video and its note.
- Python: `scripts/check_videos.py` is run by `npm run check:content`.

## Open points

- None of the candidates has been watched. L09 (Indonesian) is the weakest fit, and the Malay notes have no primary candidate for four lessons (`noGoodMatch`); `videos:apply` refuses a lesson with no primary candidate.
- The written versions of local videos are not in the review spreadsheet (`npm run review:export`): they are written and approved by the person who watched the video, not translated from English.
- Listen reads the Read stage only, so local videos need no recordings.
