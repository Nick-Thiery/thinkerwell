# Listen's recordings

Listen plays recordings of a natural voice for everything it reads: every reading section of every lesson, in English and Bahasa Indonesia, at both reading levels, and the sample sentence in Settings. They are made here, on a computer, and committed to the repository (`public/audio/`). How they are played, downloaded and kept offline is in `docs/notes/recorded-audio.md`.

- **English**: Kokoro-82M (`hexgrad/Kokoro-82M`, Apache-2.0), voice `af_heart` (American English, `lang_code='a'`), speed 0.92.
- **Bahasa Indonesia**: Meta's MMS-TTS (`facebook/mms-tts-ind`, CC BY-NC 4.0: non-commercial use only, with attribution; see `docs/PRODUCT.md`).

These are the founders' choices. Changing a voice, its speed or the encoding in `generate.py` (`VOICES`, `GAPS`, `BITRATE`) records everything in that language again.

## When to run it

Whenever lesson text that Listen reads changes (a reading section's heading, text or simpler text, in English or in `content/id/`), or the way the app splits sentences changes. `npm run check:audio` says when (CI runs it, and Claude Code's content hook reminds you); it fails until the recordings match again.

## Setting up (once)

You need Node 22 (as for the site), Python 3.10 to 3.12 and ffmpeg (`brew install ffmpeg`, or `apt install ffmpeg`).

```sh
sh scripts/audio/setup.sh
```

This makes `.venv-audio/` (gitignored) with Kokoro, transformers, torch and soundfile, about 2 GB, most of it torch. The first run also downloads the two voice models from Hugging Face (about 315 MB and 140 MB) and spaCy's small English model. Nothing here is needed by the site, the tests or CI.

`npm run audio:generate` uses `.venv-audio` when it exists, otherwise `$AUDIO_PYTHON` or `python3`.

## Recording

```sh
npm run audio:generate                 # both languages
npm run audio:generate -- --lang id    # only Indonesian (the other language's files are kept)
AUDIO_THREADS=1 npm run audio:generate -- --lang en   # one CPU thread (run en and id side by side)
```

1. `tools/audio/export.ts` writes everything Listen reads to `.audio-cache/export.json`, split with the app's own code (`src/speech/sentences.ts`), with what each voice is given to say (`tools/audio/normalise.ts`).
2. `scripts/audio/generate.py` speaks each piece that isn't recorded yet and keeps it in `.audio-cache/<lang>/` (gitignored), named by a hash of the voice and the words. So it only records what changed, and a run that was stopped carries on where it was.
3. Then it joins each section's pieces into one MP3 (`public/audio/<lang>/<lesson>-<level>-<part>.<hash>.mp3`) with pauses (0.75 s after the heading, 0.6 s between paragraphs, 0.35 s between sentences), evens out the loudness, and writes:
   - `public/audio/<lang>/timings.<hash>.json`: each section's file and each piece's start and end, which Listen highlights from;
   - `tools/audio/manifest.json`: the same, with each piece's hash and what the voice was given when that differs from the text, for `npm run check:audio` and for reviewers;
   - `src/audio/recordings.json`: where each language's timings file is, and the total size, for the app.

   Files no section uses any more are deleted.

On a laptop with two CPU cores, recording everything takes about an hour per language; a lesson edit takes seconds. Progress goes to the terminal, one line per piece, with the time left. For a full run, start it in the background:

```sh
nohup npm run audio:generate > audio.log 2>&1 &
tail -f audio.log
```

Lines starting `CHECK:` flag a piece that is very short, very quiet, or unusually fast or slow for its length: listen to those.

Then check and commit:

```sh
npm run check:audio
git add public/audio tools/audio/manifest.json src/audio/recordings.json
```

## Format

MP3, 32 kbit/s constant bit rate, mono, 24 kHz for English (Kokoro's own rate) and 16 kHz for Indonesian (MMS's): every browser plays it, iPad Safari and old Android Chrome included, and speech stays clear. One file per section, per reading level, per language, so a device downloads only the parts it plays.
