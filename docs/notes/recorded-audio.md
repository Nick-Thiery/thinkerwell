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

## Vietnamese (hidden preview)

Branch `vietnamese-preview`, October 2026. Vietnamese is a hidden preview language: its interface and lessons are AI drafts that no native speaker has reviewed (`ready: false` in `src/i18n/locales.ts`; CLAUDE.md rule 7), so nobody can choose it yet. The pipeline can record it, so the team can hear it, but the recordings are not on `main`.

**Model.** VieNeu-TTS v3 Turbo (`pnnbao-ump/VieNeu-TTS-v3-Turbo`, PyPI `vieneu` 3.8.3), ONNX on the CPU with no torch, 48 kHz out. Code, weights and the preset voices are **Apache-2.0**; so are its audio codec (`OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano-ONNX`) and `sea-g2p` 0.10.0, its text normaliser and phonemiser (PyPI classifier and the `LICENSE` in the wheel; the copyright line in that file is still the template's `[yyyy] [name of copyright owner]`, so Credits should name the author, Phạm Nguyễn Ngọc Bảo, as the model does). Apache-2.0 allows commercial use, so unlike the Indonesian voice nothing has to be replaced if Thinkerwell ever charges. The optional Perth watermark (`vieneu[watermark]`) is not used. Revisions of both repositories are pinned in `scripts/audio/generate.py` (`VOICES["vi"]`), so the model can't change under the recordings.

**Voice.** A preset voice, not a clone. The default is "Trúc Ly" (female, Northern, natural), one constant, `VI_VOICE`, overridable with `AUDIO_VI_VOICE` or `--vi-voice`. **It is a placeholder until the team has listened.** Other presets worth a listen: "Ngọc Huyền" (female, Northern, reading voice), "Quỳnh Anh" (female, Northern, story reading), "Thiện Minh" (male, Northern, narrator); `--list-vi-voices` lists all 25. `--sample DIR` makes a few sections of any voice without touching the repository (`scripts/audio/README.md`). Sampling is fixed so a piece always sounds the same (checked: the same words give identical samples in two processes with 1 and 2 threads): temperature 0.6 (the library's default is 0.8; lower is steadier and a little flatter), top-k 25, top-p 0.95, repetition penalty 1.2, and numpy's and Python's generators seeded from the piece's own words. All of that, and the revisions, are in the voice's record in `tools/audio/manifest.json`, so changing one records everything again. The Northern (Hanoi) accent is what the presets mostly offer ("Quang Sơn" and "Ngọc Trân" are Central, "Thục Đoan", "Kim Thanh" and others Southern); which accent suits the learners is the team's and the reviewers' call.

**Format.** The same as the others: MP3, 32 kbit/s CBR, mono, **24 kHz**: the model's 48 kHz is resampled (`soxr`, highest quality) before it is kept, so the cache is half the size and the files match English. Checked with ffprobe: 24,000 Hz, 1 channel, 32 kbit/s.

**Text for the voice** (`normaliseVietnamese`, `tools/audio/normalise.ts`). Unlike Indonesian, almost nothing has to be written out: VieNeu's own normaliser reads Vietnamese numbers correctly, which was checked on every sentence of the Vietnamese lessons with `sea_g2p.Normalizer("vi")` and its `audit()` (no sentence has a character dropped unspoken), on top of a table of test sentences: "5.500" is "năm nghìn năm trăm", "75.000" "bảy mươi lăm nghìn", "13,8 tỉ" "mười ba phẩy tám tỉ", years as cardinals ("1899" "một nghìn tám trăm chín mươi chín", "2007" "hai nghìn không trăm lẻ bảy"), "những năm 1400", "Năm 8" "năm tám", "Ý tưởng 1", "10–17" "mười đến mười bảy", "50%", "3 kg", "5 km", "20 °C", "thế kỷ XV", "&", "+", "½", dates and times. Latin-script names and words (Bayview, Kenya, Hammurabi, token, coffee) are read with English sounds, and capital letters ("ML") as English letter names ("em el"), which is how the English lessons say them; "Mina L." is "mina lờ". So digits are left alone, and a test (`normalise.test.ts`) fails if a Vietnamese lesson ever uses English number forms, which the voice reads wrongly: "1,000" is read as "một" and "1.5" as "một chấm năm" (Vietnamese writes 1.000 and 1,5). Only what it got wrong is respelt: Vietnamese spellings of foreign names with consonant clusters that aren't Vietnamese syllables ("Ti-grơ" was "the rơ", "Ơ-phrát" "pe-hat rát") are split into syllables ("Ti-gờ rơ", "Ơ-phờ rát"); the Italian "caffè" lost its last syllable ("kaf") and is written "café"; an apostrophe inside a name ("n'Ajjer") and odd spaces are removed. Everything here was judged from the phonemes the voice is given and the length of its output, not by ear.

**Why the recordings stay off `main` until Vietnamese is ready.** (1) `main` would ship 145 files and about 17 MB of audio for a language no learner can choose, in every clone and deploy, and the Settings "Lesson audio" download would not offer them anyway. (2) They would be recordings of an unreviewed translation. When the native speaker changes a sentence, each changed section is recorded again and its old file stays in git history for good (about 120 kB each); recording once, after review, keeps the history small. (3) `npm run check:audio` would fail on `main` every time someone touched a Vietnamese lesson in the meantime. So: `check:audio` checks every language that is `ready` and any language that already has recordings (in the manifest or in `public/audio/<lang>/`), and does not fail for a translated language that is not ready and has none; `npm run audio:generate` records the ready languages and any with recordings already, and Vietnamese only with `--lang vi`. On the preview's branch, once recorded, `vi` is in the manifest and is checked like the others. When Vietnamese becomes `ready`, record it (`--lang vi`) after the review and merge the recordings with it. The app needs nothing for Vietnamese to be absent: `src/audio/recordings.json` lists only languages that have recordings, `recordingsOf('vi')` is then `undefined`, Listen reads with the device's voice, Settings' lesson-audio download and sample don't offer it, and the service worker's `/audio/` cache routes by path and prunes by that same file.

**What to expect.** Measured on 25 pieces of the Vietnamese lessons (1,495 characters; 70 s of speech), from the sample sections with numbers, names and loanwords: 0.047 s of speech per character, against 0.059 in English and 0.071 in Indonesian (Vietnamese is short monosyllables), and 21 characters a second. With the app's pauses over all 145 sections that is about **70 minutes (65 to 85) of audio and 16 to 20 MB**, compared with 111 minutes and 26.7 MB for Indonesian and 79 minutes and 18.9 MB for English, so a device used only in Vietnamese would download about 17 MB for every recording offline. Recording is about 0.8 times real time on two CPU cores: roughly 50 to 60 minutes for the 1,343 different pieces (73,850 characters), then under a minute to join and encode. Loading the model takes about 3 s.

**Not done.** Not heard by a person. Credits' "Listen's voices" (in `en.json` and the other languages' files, outside this change) has no Vietnamese entry yet: add VieNeu-TTS v3 Turbo, the voice's name, the codec, `sea-g2p` and Apache License 2.0 with the recordings. The Vietnamese Settings sample sentence (`LISTEN_SAMPLES.vi`) is recorded with the lessons.

## Not done, or for later

- **Not heard by a person in this branch.** The recordings were checked by numbers (length against text, loudness, no clipped or silent piece) and the approved samples' settings were used exactly; someone should listen to a few parts in each language, Indonesian numbers especially, before the pilot. Samples: `/tmp/tw-audio-samples/` on the build machine (not committed).
- **Not tried on the pilot's tablets.** Especially iPad Safari: the silence-unlock, `preservesPitch` (Safari 17+; older Safari uses `webkitPreservesPitch`), and playing from a blob.
- **Google Cloud Text-to-Speech for Indonesian** is the planned upgrade (and required before anything commercial): change `VOICES["id"]` in `scripts/audio/generate.py` to call it at recording time, and the Credits.
- **The heading's pause** is 0.75 s in the recordings and 0.4 s with the device's voice; neither was tried with learners.
- **Glossary "Hear it"** isn't wired in the app; if it is, record each glossary word and definition the same way.
