# Listen's recorded voice

Branch `recorded-audio`, October 2026. Listen read lessons with the device's own voice, and learners said it sounded robotic; on many of the pilot's tablets there was no Indonesian voice at all. The founders chose two natural-sounding voice models and approved a sample of each. This note is how Listen now plays recordings made with them, and what stayed the same.

## What was decided (by the founders)

- **English**: Kokoro-82M (`hexgrad/Kokoro-82M`, Apache-2.0, Python package `kokoro`), voice `af_heart` (American English, `lang_code='a'`), speed 0.92: exactly the approved sample.
- **Bahasa Indonesia**: Meta's MMS-TTS (`facebook/mms-tts-ind`, through `transformers.VitsModel`). Its licence is **CC BY-NC 4.0**: free, non-commercial use with attribution, which is what Thinkerwell is. **If Thinkerwell ever charges for anything or becomes commercial, the Indonesian recordings must be made again with another voice first.** The planned upgrade for Indonesian is a paid service with a free tier, Google Cloud Text-to-Speech, used the same way: recorded ahead of time, so learners' devices never contact it.
- Every piece of English and Indonesian that Listen reads uses these voices. Slow works properly with them. Where a recording isn't there, Listen reads with the device's voice as before; it is never a dead button.

## What Listen reads (the inventory)

Everything Listen says comes from two places, and both now have recordings:

1. **The Read stage** (`src/pages/lesson/read/ReadStage.tsx`, `useListen.ts`): each reading section ("part") of each lesson, in the version on screen (Standard or Simpler), in the lessons' language (English, or Indonesian for a learner whose lessons are Indonesian). It reads the heading (with a full stop, skipped when the first sentence repeats it), then one sentence at a time (`src/speech/sentences.ts`). 24 lessons × 3 parts × 2 levels × 2 languages = 288 sections.
2. **Settings, "Play a sample"** (`src/pages/settings/ListenVoiceSetting.tsx`): one sentence per language (`LISTEN_SAMPLES`, `src/speech/sampleText.ts`).

Nothing else speaks: the glossary's "Hear it" toggle (`DefinitionCard`'s `onListen`) is wired only in the dev-only component gallery, and Say it and Record yourself listen rather than speak.

## How the recordings are made

`npm run audio:generate` (`scripts/audio/README.md`), on a computer that can run the models. CI can't, and doesn't need to.

1. **The same sentences as the app.** `tools/audio/export.ts` loads the lessons the way the build does (`src/content/load.ts`, so zod trims them the same way), lays the Indonesian over the English the way the app does (`src/content/translation.ts`), and splits each section with the Read stage's own code (`src/speech/sentences.ts`: heading handling, "Dr."/"Mr."/"No. 5", headings not read twice). Nothing is split again in Python. To make that possible the splitter moved out of `readingPieces.ts` into `src/speech/sentences.ts`, which has type imports only.
2. **Text for the voices** (`tools/audio/normalise.ts`). The text on screen never changes; only what each voice is given.
   - **Indonesian.** MMS's tokenizer keeps only `a`–`z` without `q` and `x`, space, `'`, `-`, `—` and the digits 0, 1, 2, 4, 5 and 6 (checked: "1899" would be read as "1"), and drops everything else without a word. So numbers are written out in Indonesian as Indonesian writes them (1.000 is a thousand, 13,8 is thirteen point eight): 1899 → "seribu delapan ratus sembilan puluh sembilan", 75.000 → "tujuh puluh lima ribu", 13,8 → "tiga belas koma delapan"; ordinals ("Tahun ke-8" → "Tahun kedelapan", "ke-1" → "pertama"); decades ("1400-an" → "seribu empat ratusan"); percentages; ranges ("10–20" → "sepuluh sampai dua puluh"); capitals that are letters, by their Indonesian names (PBB → "pe be be", ML → "em el", an initial "L." → "el"); a few abbreviations (dll., dsb., No. before a number, titles, km, kg, cm, °C); `&`, `+`, `=`, `/`; and `q` → `k`, `x` → `ks`, accents off. `generate.py` stops if anything but punctuation would still be dropped. Unit tests: `tools/audio/normalise.test.ts`, which also checks no Indonesian lesson text keeps a digit.
   - **English.** Kokoro's front end (misaki) already reads the lessons' numbers correctly; checked one by one: 1899 "eighteen ninety-nine", 1980 "nineteen eighty", 2007 "two thousand seven", "the 1400s" "the fourteen hundreds", 13.8 "thirteen point eight", 75,000, "Year 8", "Idea 1", "ML" and "UN" as letters, "Mina L." as "el", and "8th", "BCE", "CE" (none in the lessons today). Only spacing, en-dash ranges and `&` are tidied.
3. **One file per section.** Each piece (the heading, each sentence) is spoken on its own and kept in `.audio-cache/` (gitignored) under a hash of the voice and its words, so a stopped run carries on and an edit records only what changed. Each section's pieces are trimmed of silence and joined with pauses: 0.75 s after the heading, 0.6 s between paragraphs, 0.35 s between sentences, then brought to about −20 dBFS (never above −1 dBFS), so English and Indonesian are about as loud as each other. Each piece's start and end go into the language's timings file. 290 files in all (145 per language, the sample included), instead of the 2,900 there would be with one per sentence.
4. **Format.** MP3, 32 kbit/s constant bit rate, mono: 24 kHz for English (Kokoro's own) and 16 kHz for Indonesian (MMS's). MP3 plays in every browser the pilot could have, iPad Safari and old Android Chrome included; AAC would sound a little better at this rate but Chromium builds without proprietary codecs (Playwright's, some Linux ones) can't play it. File names end in a hash of their content.
5. **Checked by ear where possible, and by numbers everywhere.** `generate.py` flags any piece shorter than 0.3 s, quieter than RMS 0.01, or faster or slower than 0.02–0.2 s per character. See "Results" for this run.

What it writes:

| File | What | Read by |
| --- | --- | --- |
| `public/audio/<lang>/<lesson>-<level>-<part>.<hash>.mp3` | One section's recording | The app, when Listen plays it |
| `public/audio/<lang>/timings.<hash>.json` | Each section's file, a fingerprint of what it says, its size, and each piece's start and end | The app (and the service worker, to know which files are in use) |
| `src/audio/recordings.json` | For each language: its timings file, how many recordings, how big | The app, bundled (a few hundred bytes) |
| `tools/audio/manifest.json` | Everything above, with each piece's fingerprint and what the voice was given where it differs from the text (`speak`) | `npm run check:audio`, and reviewers |

## Keeping them in step with the lessons

- `npm run check:audio` (`tools/audio/check.ts`, in CI) exports what Listen reads now and compares, for every language learners can choose and any language that already has recordings (not a hidden-preview language with none: "Vietnamese" below): a section whose text changed or that has no recording, a piece the voice would now be given differently, a missing or changed file, a file no section uses, or `recordings.json` out of step. It fails with what changed and "Run `npm run audio:generate`". Tests: `tools/audio/check.test.ts`.
- Claude Code's content hook (`.claude/hooks/check_content_edit.py`) runs the same check after a lesson or Indonesian edit and, if the recordings no longer match, reminds (without blocking) that they must be made again before the pull request.
- **In the app**, a recording is played only when its fingerprint matches what the section says on screen (`piecesHash` in `src/audio/textHash.ts`, the same code in Node and the browser). So a lesson edited after recording reads with the device's voice, never with words that aren't on screen, even before anyone runs `audio:generate`.

## How Listen plays them

`src/audio/`, used by `src/pages/lesson/read/useListen.ts`.

- **On a tap.** Nothing downloads until Listen is tapped. Then the language's timings file (once; a few kB), then the part's MP3 (about 150 kB; up to about 300 kB for the longest parts). The file is fetched whole and played from a `blob:` URL (the Content-Security-Policy already allowed `media-src blob:` for Record yourself), so seeking works the same everywhere: Safari asks for byte ranges, which a cached file can't answer.
- **Safari.** Safari only lets a page start sound from a tap. The tap on Listen first plays a tenth of a second of silence (a WAV made in the page) on the same audio element, which then may play the recording that arrives after it, and every later part.
- **The highlight** comes from the audio element's own clock: on every `timeupdate`, and every 100 ms while playing, `currentTime` is looked up in the section's timings (`pieceAt`). A sentence stays marked through the pause after it, as with the device's voice. `currentTime` is the recording's time, whatever the speed, so the highlight is right at both speeds without any adjustment. Decoded with ffmpeg (as Chrome does), each sentence's sound starts about 0.09 s after its start in the timings (the 25 ms kept before it when trimming, and MP3's encoder delay, 1,105 samples: 46 ms at 24 kHz, 69 ms at 16 kHz), and ends within about 0.03 s of its end; so the highlight moves to a sentence a moment before the voice reaches it, in the pause, never after.
- **Slow and Normal** are `playbackRate` 0.8 and 1, with `preservesPitch` set (and `webkitPreservesPitch` and `mozPreservesPitch` for older Safari and Firefox), so Slow sounds like the same person speaking slowly, not a lower voice. Switching speed mid-sentence just carries on at the new speed, in the same place.
- **Pause, then Play** starts the current sentence again from its beginning, as Listen always did with the device's voice. Stop, leaving the stage, the quick check, or changing the lessons' language stop it.
- **Moving on**: at the end of a part, Listen moves to the next part and plays its recording. While a part plays, the next part's recording downloads (not with Save data on), so moving on doesn't wait.
- **While a recording downloads**, the bar says "Getting the recording · part n of 3".

### When there's no recording to play

The device's voice reads the part, exactly as before (`src/speech/readAloud.ts`, unchanged), when:

- the language has no recordings;
- the section's text has changed since it was recorded;
- the recording isn't on the device and can't be downloaded (offline), or the file fails, or the browser won't play it: a part that breaks mid-way carries on with the device's voice from the same sentence;
- it hasn't arrived after 8 seconds on a slow connection (it carries on downloading, so it is kept for next time);
- Save data is on and the recording isn't on the device yet (unless there is no voice: then it is downloaded anyway, so Listen still works).

With neither a recording nor a voice, the Read step says "Listen can't play this part here yet. Its recording isn't on this device, and the device has no voice to read it with. Connect to the internet, then tap Listen again." and Listen turns off. Listen now shows wherever the lessons' language has recordings, even on a device with no voice for it: on the pilot's tablets, Indonesian lessons can be listened to for the first time.

### Settings

- **Listen voice**: for each language with recordings, "Listen plays recordings made with Kokoro (Heart)" (or MMS-TTS (Meta)) and **Play a sample**, which plays the recorded sample sentence (or, when it can't be had, reads it with the device's voice). Below it, the device's voice for what has no recording, as before, with **Hear this voice**.
- **Lesson audio** (`/settings#lesson-audio`, `src/pages/settings/LessonAudioSetting.tsx`, `src/audio/download.ts`): "Download lesson audio" downloads every recording of the device's lessons' languages: the lessons' language of the device's own language and of every learner on it, so a device used only in Indonesian downloads only the Indonesian (about 27 MB). Three files at a time, so a shared connection stays usable; files already there are skipped, so a download that was stopped or broke off carries on. A progress bar and "Downloading: 12 MB of 27 MB"; **Stop downloading** keeps what has arrived. It says how much is on the device ("On this device: 9.6 MB of 27 MB.", "All of it is on this device."). It is offered only once the course itself is kept offline (the service worker keeps the recordings), and not while Save data is on ("Turn Save data off above to download the lesson audio").
- **The setup checklist**'s offline step points to it ("Lesson audio in Settings").

## Offline, and the service worker

`src/offline/sw.ts`. Read `docs/notes/phase-6.md` and `docs/notes/slow-internet.md` first.

- **Not in the precache.** The recordings are about 45 MB for both languages, against about 640 kB for the rest of the course, which every device downloads on its first visit. So the precache's `globPatterns` (`html, js, css, woff2, svg, png, jpg`) don't take them, and the first visit and the offline copy grow only by the player's code and its words.
- **A cache of their own.** The worker answers `GET /audio/…` (this site only) cache-first from `thinkerwell-audio-v1`: from the cache when it is there, otherwise from the network, keeping a copy of every complete (200) response. Byte-range requests, which the site never makes, go straight to the network. Workbox's `cleanupOutdatedCaches` only deletes old precaches, so updates never empty it.
- **Cleaned by hash.** File names carry a hash of their content: an unchanged recording keeps its name across versions and stays; a changed one is a new file. Files no section uses any more are deleted (`pruneAudio`) when a new version of the worker starts (fetching the new timings file first if it isn't kept yet, and leaving everything until it can be had if offline) and whenever a language's new timings file is kept. Everything of a language with no recordings any more goes too.
- **Devices that already have the course** update as before: the new `sw.js` installs in the background, downloads the precache files that changed, waits for "Update now", and only then starts. Nothing about the recordings is downloaded until Listen or Settings asks. A tab still on the old version after another tab updated keeps working; if it asks for an old recording that the new version deleted and the site no longer has, Listen reads that part with the device's voice.
- **Vercel** caches `/audio/` for a year, immutable, like `/assets/` (`vercel.json`; `src/offline/deploy.test.ts`).

## Privacy

The recordings are files on Thinkerwell's own site (`/audio/`), fetched only after a tap. No request goes to any other server, and no text is sent anywhere to be spoken: everything was recorded before it was published. The Content-Security-Policy is unchanged (`media-src 'self' blob:` was already there). `e2e/recorded-audio.spec.ts` checks that playing Listen requests nothing from another origin.

## Credits

`/credits` has a "Listen's voices" section in both languages: Kokoro-82M by hexgrad, voice Heart, Apache License 2.0; MMS-TTS (`facebook/mms-tts-ind`) by Meta, part of Massively Multilingual Speech, CC BY-NC 4.0, with a note that this allows only non-commercial use; links to each model and licence; and that a computer made the recordings and the voices themselves were not changed.

## Tests

- Unit: the timings lookup (`src/audio/timings.test.ts`); the player (`RecordedPlayer.test.ts`: the highlight from the clock, Slow at 0.8 with the pitch kept, switching speed mid-sentence keeps the place and the highlight, pause and play, waiting for the length before seeking, end and failure); the session (`ListenSession.test.ts`: recording first, then every fallback: no recordings, not available, too slow, broken mid-way, Save data with and without a voice, neither recording nor voice, pausing while it downloads); the download manager and loader (`download.test.ts`); the Read stage with recordings (`Listen.test.tsx`); the normaliser; `check:audio`.
- End to end, with the real files for Lesson 10 (`e2e/recorded-audio.spec.ts`): the highlight advances with the recording, Slow sets `playbackRate` 0.8 with `preservesPitch`, pause and play, nothing downloaded before the tap and nothing from other servers; offline after one play (the service worker on); "Download lesson audio" stores every English recording; with the recordings blocked and no voice, Listen says why; Settings' sample plays the recording. The specs that test the device's voice (`speech.spec.ts`, `listen-voice.spec.ts`, `indonesian.spec.ts`) now block `/audio/`, which is also the fallback test with a voice.

## Results

Recorded on 7 and 8 October 2026 on a 2-core cloud machine (one CPU thread per language, side by side): 1 hour 8 minutes for English and 1 hour 1 minute for Indonesian, then 40 seconds each to join, encode and write the files.

| | English | Bahasa Indonesia | Both |
| --- | ---: | ---: | ---: |
| Recordings (sections and the sample) | 145 | 145 | 290 |
| Different pieces spoken | 1,345 | 1,362 | 2,707 |
| Length | 78.8 min | 111.0 min | 189.8 min |
| Size | 18.9 MB | 26.7 MB | 45.6 MB |
| One part, smallest / typical / largest | 13 / 130 / 191 kB | 14 / 184 / 265 kB | |
| Timings file (raw; Vercel compresses it) | 40 kB | 40 kB | |

32.1 kbit/s on average, as set. A device used only in Indonesian downloads 26.7 MB to have every recording offline; one used in both, 45.6 MB.

**Checked by numbers** (`generate.py`'s `CHECK:` lines, none this run, and a pass over every piece): no piece shorter than 0.59 s ("Kapan?") or 0.93 s in English ("That is true."); none silent or clipped (peaks at most −0.8 dBFS before levelling); speech rates 12 to 23 characters a second in English and 10 to 19 in Indonesian, measured on what the voice was given, so the Indonesian numbers, written out, take as long as words should (a dropped number would show up as a sentence far too fast for its text). The slowest English pieces are those with numbers ("It started in 1899 as a stop on a railway."), as expected. Five Indonesian sections decoded with ffmpeg: each sentence starts about 0.09 s after its time in the timings and ends within 0.03 s of it (above).

Two sections to listen to, with numbers in them (not committed; on the build machine in `/tmp/tw-audio-samples/`): Lesson 9 part 1 (standard) in English ("About 5,500 years ago…", "In the 1400s…") and in Indonesian ("Sekitar 5.500 tahun lalu…", "Pada tahun 1400-an…"), and Lesson 12 part 2 (standard) in Indonesian ("pada tahun 1899…", "Pada tahun 1980, hanya sekitar 30.000 orang…").

### Hosting limits

Checked in GitHub's and Vercel's documentation on 8 October 2026.

| Limit | What it is | Here |
| --- | --- | --- |
| GitHub, one file | Warning above 50 MiB, blocked above 100 MiB | Largest recording 265 kB; largest file the 388 kB manifest |
| GitHub, repository | "Ideally less than 1 GB, and less than 5 GB is strongly recommended"; 10 GB on disk | The files in the repository grow from about 9 MB to 55 MB. Each re-recording of a changed section adds its new file to the history (about 150 kB) |
| GitHub, one push | 2 GB | About 50 MB for this branch |
| GitHub, files in one folder | 3,000 recommended | 146 in each `public/audio/<lang>/` |
| Vercel, deploying | Builds from Git clone the repository onto a 32 GB build disk; uploading with the CLI is limited to 100 MB of source files on Hobby (1 GB on Pro); no limit on the number of output files; 45 minutes to build | 55 MB of source; the build copies `public/audio` into `dist/` (about 47 MB in all) and takes as long as before |
| Vercel Hobby, traffic | 100 GB of Fast Data Transfer a month (then paused until the 30 days are up); Hobby is for non-commercial use only | A full download is 19 to 46 MB per device, so about 2,000 devices downloading everything a month; Listen otherwise downloads only the parts played, about 130 to 180 kB each, once per device |

Nothing is over a limit. Sources: [GitHub: About large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github), [GitHub: Repository limits](https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits), [Vercel: Limits](https://vercel.com/docs/limits), [Vercel: Hobby plan](https://vercel.com/docs/plans/hobby).

### Sizes of the site itself

Measured as `e2e/build-output.spec.ts` counts them (Brotli), against `main` built on the same machine. The offline copy (precache) grew by 6.4 kB, from 636.1 to 642.5 kB, within its 645 kB budget: the player and download manager (a chunk of their own, 2.8 kB), Settings' parts, the Read stage's, the checklist's and their words in English and Indonesian. A first visit to the home page grew by 0.7 kB, from 220.5 to 221.2 kB, all of it the new words in en.json (which every first visit loads, CLAUDE.md rule 7) and a few styles, which took it over `main`'s 221 kB budget, now 222 kB (`docs/notes/slow-internet.md`, "Later budget changes"). No player code and no recording reaches a first visit or the precache.

## Malay (October 2026)

Bahasa Melayu (Malaysian Malay) is recorded the same way as Indonesian, with Meta's **MMS-TTS Malay** (`facebook/mms-tts-zlm`; MMS files Standard Malay under the macrolanguage code `zlm`). **Licence: CC BY-NC 4.0, the same as the Indonesian voice: non-commercial only, replace it before Thinkerwell ever charges** (`docs/PRODUCT.md`). It is on the Credits page with the others.

**Why this voice.** Free and open-source Malay voices are rare. Two multilingual models (Chatterbox Multilingual and OmniVoice) were tried first and set aside; MMS-TTS Malay was chosen because it speaks Malay natively, runs on a plain CPU like the Indonesian voice, and is the same family learners already accepted. It is plain and a little flat, and a single voice, so a person cannot choose between voices. The comparison notes were lost with an earlier workspace, so this is the summary, not the evidence.

**How it is fed.** `tools/audio/normalise.ts` writes numbers, ordinals, decimals, percentages and letters in Malay words (1,000 as "seribu", 2.5 as "dua perpuluhan lima", 18 as "lapan belas", 8th as "kelapan"; 0 as "kosong"), because the model's alphabet has no digits beyond 0, 3 to 6 and cannot say a digit run. The model's alphabet also lacks `v` and `x`, so `v` is said as `f` and `x` as `ks`, and accents are stripped. A test checks that no digit is left in any Malay lesson text. Output is 16 kHz mono MP3 at 32 kbit/s, like Indonesian.

**Accuracy (measured).** A speech-recognition round trip: 60 sentences spread across the lessons were spoken by the voice, written down again by Whisper (`openai/whisper-small`, told the language is Malay) and compared with what the voice was given. Word error rate **12.6%** (565 words), letter error rate 3.6%; 24 of the 60 sentences came back word for word, and 11.5% (68% of sentences with at most one wrong word) once the three sentences where Whisper wrote a number as digits are left out. Whisper's own mistakes are in that figure (it wrote "zoom" for "zum", and makes errors on clear Malay speech too), so it is an upper bound on the voice's errors, and it does not measure accent or naturalness; only a Malaysian listener can. Typical misses are names and loan words (an English name said as Malay letters, "telefon" heard as "telehon") and a few run-together words. Reproduce it with `asr_check.py`-style code: record, then have Whisper transcribe the cached pieces in `.audio-cache/ms/`.

| | Bahasa Melayu |
| --- | ---: |
| Recordings (sections and the sample) | 145 |
| Length | 101.1 min |
| Size | 24.3 MB |

A device used in Malay only downloads 24.3 MB to have every recording offline; in all three languages, about 70 MB (Settings' "Lesson audio" lists each combination).

**For a Malaysian reviewer, with the translation:** listen to a few parts (Lessons 1, 9 and 17 first), and say whether the voice is clear enough for 10 to 17-year-olds, and which words it gets wrong. A better free voice, or a commercial one once there is money, replaces it by changing `VOICES["ms"]` in `scripts/audio/generate.py` and running `npm run audio:generate -- --lang ms`.

## Preview courses (November 2026)

Nick's call (2 November 2026): Digital World and Southeast Asia Through Time get recordings now, with Our World's voices (Kokoro `af_heart` at 0.92 for English, MMS-TTS `mms-tts-ind` and `mms-tts-zlm` for Indonesian and Malay), so Listen works in Indonesian and Malay on devices that have no voice for them (most Windows laptops have no Malay voice, many no Indonesian one). They were recorded before the courses' review, so a reviewed sentence is recorded again (seconds per section: only changed pieces are spoken).

- **Kept apart.** Each course and language is a "track" of its own (`id/digital-world`): files in `public/audio/<lang>/<course>/`, its own timings file, its entry under `courses` in `tools/audio/manifest.json`, and `src/audio/courseRecordings.json` for the app. Recording a course never touches Our World's files, and recording Our World never touches a course's (`generate.py` prunes only files, never a course's folder).
- **Recording.** `npm run audio:generate -- --all-courses` (or `--course digital-world`, with `--lang` as usual). `tools/audio/export.ts` writes the courses under `courses` (`courseUtterances` in `tools/audio/utterances.ts`): every reading section, both levels, in English and each ready language the course is translated into, laid over the English as the app does.
- **Playing.** The Read stage asks for a recording in its course's track (`recordingRef(…, courseId)`), so a course lesson never plays an Our World file. A course without recordings in a language uses the device's voice, as before.
- **Downloading.** Nothing of a course downloads on a device without its preview: Listen fetches a course's timings and files only inside its lessons, and Settings' "Lesson audio" adds a course's tracks only where `settings.previewCourses` has it. Since 9 November 2026 every course is open on every device (`previewCourses` includes all open courses), so "Download lesson audio" fetches all four courses' recordings in the device's languages: about 75 MB in English, 107 MB in Indonesian and 96 MB in Malay (the size is shown in Settings before anyone taps). Listen still fetches a part only when it plays it, and the device voice or the written text is the fallback.
- **Offline.** The service worker keeps them in the same cache and prunes each track against its own current timings (`audioLang` in `src/offline/sw.ts` reads `/audio/id/digital-world/x.mp3` as `id/digital-world`).
- **Checks.** `npm run check:audio` checks every course track like a language (`courseAudioProblems` in `tools/audio/check.ts`). Tests: `tools/audio/check.test.ts`, `src/audio/recordings.test.ts`.
- **What was recorded** (3 November 2026, no `CHECK:` warnings): Digital World 102 files per language (English 14.9 MB, 62 min; Indonesian 21.9 MB, 91 min; Malay 19.6 MB, 82 min) and Southeast Asia Through Time 72 (English 10.2 MB, 43 min; Indonesian 15.1 MB, 63 min; Malay 13.6 MB, 57 min): 95 MB in the repository and the deployment, none of it precached. On a CPU with one thread, English took about 2 h 10 min (Kokoro), Indonesian about 2 h and Malay about 2 h (MMS-TTS). The precache gained only `courseRecordings.json`'s few lines (the build test still passes under 829 kB, with little to spare).

- **Art, Architecture and Society** (8 November 2026, no `CHECK:` warnings): 120 files per language (English 30.5 MB, 127 min; Indonesian 43.1 MB, 179 min; Malay 38.0 MB, 158 min), another 112 MB in the repository and the deployment, none of it precached. It sat in `SKIPPED_COURSES` (`tools/audio/utterances.ts`) until its English and translations were settled; that list is empty now. With two threads on two cores, English took about 1 h 40 min, Indonesian about 1 h 30 min and Malay about 1 h.

## Vietnamese

Pipeline built in October 2026 on the `vietnamese-preview` branch; Vietnamese offered to everyone on 11 November 2026 (`ready: true`), and **recorded for all four courses on 18 November 2026** on Nick's instruction ("find an open-source free model and put it in"), with the model and settings below, while the translation still waits for a native speaker's review. Until then Listen read Vietnamese only with a voice on the device (`recordings: false` in `src/i18n/locales.ts`, now removed).

**Model.** VieNeu-TTS v3 Turbo (`pnnbao-ump/VieNeu-TTS-v3-Turbo`, PyPI `vieneu` 3.8.3), ONNX on the CPU with no torch, 48 kHz out. Code, weights and the preset voices are **Apache-2.0**; so are its audio codec (`OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano-ONNX`) and `sea-g2p` 0.10.0, its text normaliser and phonemiser (PyPI classifier and the `LICENSE` in the wheel; the copyright line in that file is still the template's `[yyyy] [name of copyright owner]`, so Credits should name the author, Phạm Nguyễn Ngọc Bảo, as the model does). Apache-2.0 allows commercial use, so unlike the Indonesian voice nothing has to be replaced if Thinkerwell ever charges. The optional Perth watermark (`vieneu[watermark]`) is not used. Revisions of both repositories are pinned in `scripts/audio/generate.py` (`VOICES["vi"]`), so the model can't change under the recordings.

**Voice.** A preset voice, not a clone: "Ngọc Huyền" (female, Northern, natural), one constant, `VI_VOICE`, overridable with `AUDIO_VI_VOICE` or `--vi-voice`. The first recordings (18 November 2026) used the library's default, "Trúc Ly", at temperature 0.6 and top-k 25; Nick found them a little robotic next to the other languages, so on 19 November 2026 nine samples of one paragraph were compared (below, "Choosing the voice") and he chose "Ngọc Huyền" at temperature 0.8 and top-k 50, recorded again for all four courses on 20 November 2026. To change it, set `VI_VOICE` and record again (`--lang vi`, then `--all-courses --lang vi`). Other presets worth a listen: "Quỳnh Anh" (female, Northern, story reading), "Đoan Trang" (female, Northern), "Phạm Tuyên" (male, Northern), "Thiện Minh" (male, Northern, narrator); `--list-vi-voices` lists all 25. `--sample DIR` makes a few sections of any voice without touching the repository (`scripts/audio/README.md`). Sampling is fixed so a piece always sounds the same (checked: the same words give identical samples in two processes with 1 and 2 threads): temperature 0.8 and top-k 50 (the library's defaults; 0.6 and 25, used first, were steadier but flatter), top-p 0.95, repetition penalty 1.2, and numpy's and Python's generators seeded from the piece's own words. All of that, and the revisions, are in the voice's record in `tools/audio/manifest.json`, so changing one records everything again. The Northern (Hanoi) accent is what the presets mostly offer ("Quang Sơn" and "Ngọc Trân" are Central, "Thục Đoan", "Kim Thanh" and others Southern); which accent suits the learners is the team's and the reviewers' call.

**Format.** The same as the others: MP3, 32 kbit/s CBR, mono, **24 kHz**: the model's 48 kHz is resampled (`soxr`, highest quality) before it is kept, so the cache is half the size and the files match English. Checked with ffprobe: 24,000 Hz, 1 channel, 32 kbit/s.

**Text for the voice** (`normaliseVietnamese`, `tools/audio/normalise.ts`). Unlike Indonesian, almost nothing has to be written out: VieNeu's own normaliser reads Vietnamese numbers correctly, which was checked on every sentence of the Vietnamese lessons with `sea_g2p.Normalizer("vi")` and its `audit()` (no sentence has a character dropped unspoken), on top of a table of test sentences: "5.500" is "năm nghìn năm trăm", "75.000" "bảy mươi lăm nghìn", "13,8 tỉ" "mười ba phẩy tám tỉ", years as cardinals ("1899" "một nghìn tám trăm chín mươi chín", "2007" "hai nghìn không trăm lẻ bảy"), "những năm 1400", "Năm 8" "năm tám", "Ý tưởng 1", "10–17" "mười đến mười bảy", "50%", "3 kg", "5 km", "20 °C", "thế kỷ XV", "&", "+", "½", dates and times. Latin-script names and words (Bayview, Kenya, Hammurabi, token, coffee) are read with English sounds, and capital letters ("ML") as English letter names ("em el"), which is how the English lessons say them; "Mina L." is "mina lờ". So digits are left alone, and a test (`normalise.test.ts`) fails if a Vietnamese lesson ever uses English number forms, which the voice reads wrongly: "1,000" is read as "một" and "1.5" as "một chấm năm" (Vietnamese writes 1.000 and 1,5). Only what it got wrong is respelt: Vietnamese spellings of foreign names with consonant clusters that aren't Vietnamese syllables ("Ti-grơ" was "the rơ", "Ơ-phrát" "pe-hat rát") are split into syllables ("Ti-gờ rơ", "Ơ-phờ rát"); the Italian "caffè" lost its last syllable ("kaf") and is written "café"; an apostrophe inside a name ("n'Ajjer") and odd spaces are removed. Everything here was judged from the phonemes the voice is given and the length of its output, not by ear.

**Recorded (18 November 2026).** Our World 145 files, 16.8 MB, 70 minutes; Digital World 102 files, 15.9 MB, 66 minutes; Southeast Asia Through Time 72 files, 9.2 MB, 38 minutes; Art, Architecture and Society 120 files, 26.7 MB, 111 minutes: 439 files, 68.6 MB and about 4 hours 45 minutes of speech in all, less than any other language's (Vietnamese is short syllables), with the Settings sample. 5,055 different pieces, recorded in about 2 hours on a two-core machine with two processes side by side (`scripts/audio/README.md`, "Speed"); no piece was flagged `CHECK:` (too short, quiet, fast or slow). When a reviewer changes a Vietnamese sentence, `npm run check:audio` fails as for the other languages, and the changed sections are recorded again (each old file stays in git history; that was the reason for waiting until after review, and the founders chose not to wait). The app needed no change of its own: `src/audio/recordings.json` and `courseRecordings.json` now list `vi`, so Listen, Settings' "Lesson audio" and its sample, and the service worker's audio cache treat it like Malay. Settings' Listen voice says so when the device has no Vietnamese voice (`noVoiceVietnameseRecorded`), and Credits lists the voice (`voiceVietnamese`).

**Choosing the voice (19 November 2026).** One paragraph of Lesson 10 ("Towns near rivers"), recorded by each candidate on this two-core machine, loudness-matched, and transcribed by faster-whisper large-v3-turbo as a check on clarity (word error rate against the text; most errors in every candidate were the foreign names, which the recordings' normaliser respells, not ordinary words):

| Sample | Model and voice | Word errors | Notes |
|---|---|---|---|
| A | VieNeu v3 Turbo, Trúc Ly, 0.6 / 25 (the first recordings) | 15% | |
| B | the same, 0.8 / 50 | 15% | |
| **C** | **VieNeu v3 Turbo, Ngọc Huyền, 0.8 / 50 (chosen)** | 15% | |
| D | VieNeu v3 Turbo, Đoan Trang, 0.8 / 50 | 14% | |
| E | VieNeu v3 Turbo, Quỳnh Anh, 0.6 / 25 | 11% | |
| F | VieNeu v3 Turbo, Phạm Tuyên (male), 0.8 / 50 | 12% | |
| G, H | Supertonic-3 (OpenRAIL-M), F4 and M5 | 14% | about twice as slow; another preset (F3) repeated words |
| I | VietVoice-TTS (MIT), female, story, Northern | 12% | 16 minutes for 20 s of speech on two cores: too slow without a GPU |

Not tried here: VoxCPM2 (Apache-2.0) ran out of memory on an 8 GB machine; VieNeu v2's codec (`neuphonic/neucodec`) needs a Hugging Face account to accept its terms; models that clone a voice need a real speaker's consent and a recording, the most likely way to a more human voice later. All the candidates sounded close, so the choice stayed with VieNeu, which the pipeline already ran.

**Recorded again (20 November 2026), voice "Ngọc Huyền", temperature 0.8, top-k 50.** Our World 145 files, 17.9 MB, 74 minutes; Digital World 102 files, 17.0 MB, 71 minutes; Southeast Asia Through Time 72 files, 9.9 MB, 41 minutes; Art, Architecture and Society 120 files, 28.6 MB, 119 minutes: 439 files, 73.4 MB and about 5 hours 5 minutes of speech (a little slower and fuller than "Trúc Ly", 68.6 MB). All 5,036 different pieces recorded in about 2 hours 20 minutes on two cores (Our World and Digital World side by side, then the other two courses split in two halves); no piece was flagged `CHECK:`, and `npm run check:audio` passes. Not heard in full by a person: Nick chose the voice from the samples, and a native speaker should still listen to a few parts of each course.

**What to expect.** Measured on 25 pieces of the Vietnamese lessons (1,495 characters; 70 s of speech), from the sample sections with numbers, names and loanwords: 0.047 s of speech per character, against 0.059 in English and 0.071 in Indonesian (Vietnamese is short monosyllables), and 21 characters a second. With the app's pauses over all 145 sections that is about **70 minutes (65 to 85) of audio and 16 to 20 MB**, compared with 111 minutes and 26.7 MB for Indonesian and 79 minutes and 18.9 MB for English, so a device used only in Vietnamese would download about 17 MB for every recording offline. Recording is about 0.8 times real time on two CPU cores: roughly 50 to 60 minutes for the 1,343 different pieces (73,850 characters), then under a minute to join and encode. Loading the model takes about 3 s.

**The preview courses (11 November 2026).** Digital World, Southeast Asia Through Time and Art, Architecture and Society are translated into Vietnamese too, and `courseUtterances()` now exports their Vietnamese (with `ready: false`, from `LOCALES`) next to English, Indonesian and Malay, so `npm run audio:generate -- --all-courses --lang vi` records them into `public/audio/vi/<course>/`. Without `--lang vi` a not-ready language is skipped, and `check:audio` skips a not-ready course track that has no recordings, exactly as for Our World's. Measured on the exported text (not recorded in full): Our World 1,343 distinct pieces and 77,000 characters, Digital World 1,100 and 71,000, Southeast Asia Through Time 692 and 40,000, Art, Architecture and Society 1,918 and 126,000. `--sample DIR --all-courses --lang vi` makes a few sections of each course to listen to.

**Not done.** Not heard by a person in full: only checked by numbers (length against text, loudness, no clipped or silent piece; the `CHECK:` lines of the run). A native speaker should listen to a few parts of each course, names and numbers especially, with the translation review. The accent (Northern) is the preset's; whether it suits the learners is the reviewers' call.

## Thai

**Voice.** MakHam (`pythainlp/MakHamTTS`, Apache-2.0, pinned revision): Kokoro-82M, the model of the English voice, retrained for Thai by PyThaiNLP with FastThaiG2P's five-tone phonemes, run with onnxruntime on the CPU (`MakHam` in `scripts/audio/generate.py`, `VOICES["th"]`). The female voice (`newvoice_female`; `AUDIO_TH_VOICE=newvoice_male` for the male one). PyThaiTTS 1.0.0 (Apache-2.0) phonemises the text and turns numbers into words and expands ๆ before the voice reads it; `speechInput()` (`tools/audio/normalise.ts`) only drops thousands commas, says ค.ศ. and พ.ศ. in full and reads a range's dash, "&" and "%". It is deterministic (no sampling), so a piece sounds the same each time. Thai pieces are shorter than other languages' because Listen splits Thai at every space between Thai letters (a sentence or a clause, `src/speech/sentences.ts`); a piece too long for the model (510 phonemes) is split again at spaces or PyThaiNLP's words.

**Choosing the voice (20 November 2026).** One Thai paragraph (Lesson 10's rivers), read clause by clause by each candidate on a two-core machine, loudness-matched, and transcribed by faster-whisper large-v3-turbo (letters misheard, CER; Thai has no spaces, so letters, not words):

| Sample | Model and voice | Letters misheard | Notes |
|---|---|---|---|
| **A** | **MakHam (Kokoro Thai), female (chosen unless the team picks another)** | 9% | Apache-2.0; about 2 s a piece on two cores |
| B | MakHam, male | 17% | |
| C | MakHam Paradee (8M distilled, female) | 16% | very fast, a little flatter |
| D | Meta MMS-TTS (`facebook/mms-tts-tha`) | 10–16% | CC BY-NC 4.0 like Indonesian and Malay; needs ำ decomposed and ๆ expanded |
| E, F | VachanaTTS (MIT), female 2 and male 2 | 24%, 58% | female 1 and male 1 worse |
| G | F5-TTS-THAI (CC BY 4.0), voice cloned from the model card's sample | 13–26% | most natural, but clones an unknown speaker and took 188 s for 16 s of speech on two cores (about 60 hours for every piece) |

**Recorded (20 November 2026).** Our World 145 files, 22.3 MB, 93 minutes; Digital World 102 files, 19.1 MB, 79 minutes; Southeast Asia Through Time 72 files, 11.6 MB, 48 minutes; Art, Architecture and Society 120 files, 34.7 MB, 144 minutes: 439 files, 87.7 MB and about 6 hours 5 minutes of speech, from 6,859 different pieces (more than other languages, because Thai pieces are clauses), recorded in about 2 hours 40 minutes on two cores. `npm run check:audio` passes. The `CHECK:` lines of the run are all one-word pieces (a list such as "ชา ไห ผ้า" splits into words), short by nature. Not heard in full by a person: a native speaker should listen to a few parts of each course with the translation review.

Not usable here: FastThaiG2P's own Kokoro release (GitHub, blocked from the recording machine), ThonburianTTS and KhanomTan 1.0 (non-commercial share-alike), Typhoon2-Audio (Llama licence), SiangTTS (VoxCPM2, too big for 8 GB). A voice cloned from a consenting Thai speaker's recording would be the next step up.

## Not done, or for later

- **Not heard by a person in this branch.** The recordings were checked by numbers (length against text, loudness, no clipped or silent piece) and the approved samples' settings were used exactly; someone should listen to a few parts in each language, Indonesian numbers especially, before the pilot. Samples: `/tmp/tw-audio-samples/` on the build machine (not committed).
- **Not tried on the pilot's tablets.** Especially iPad Safari: the silence-unlock, `preservesPitch` (Safari 17+; older Safari uses `webkitPreservesPitch`), and playing from a blob.
- **Google Cloud Text-to-Speech for Indonesian** is the planned upgrade (and required before anything commercial): change `VOICES["id"]` in `scripts/audio/generate.py` to call it at recording time, and the Credits.
- **The heading's pause** is 0.75 s in the recordings and 0.4 s with the device's voice; neither was tried with learners.
- **Glossary "Hear it"** isn't wired in the app; if it is, record each glossary word and definition the same way.
