# Listen's recordings

Listen plays recordings of a natural voice for everything it reads: every reading section of every lesson, in English and Bahasa Indonesia (and Vietnamese, once it is ready), at both reading levels, and the sample sentence in Settings. They are made here, on a computer, and committed to the repository (`public/audio/`). How they are played, downloaded and kept offline is in `docs/notes/recorded-audio.md`.

- **English**: Kokoro-82M (`hexgrad/Kokoro-82M`, Apache-2.0), voice `af_heart` (American English, `lang_code='a'`), speed 0.92.
- **Bahasa Indonesia**: Meta's MMS-TTS (`facebook/mms-tts-ind`, CC BY-NC 4.0: non-commercial use only, with attribution; see `docs/PRODUCT.md`).
- **Bahasa Melayu** (Malaysian Malay): MMS-TTS too (`facebook/mms-tts-zlm`, the same licence and the same `Mms` class; why this voice: `docs/notes/recorded-audio.md`, "Malay").
- **Vietnamese** (hidden preview; recorded only when asked for, see below): VieNeu-TTS v3 Turbo (`pnnbao-ump/VieNeu-TTS-v3-Turbo`, Apache-2.0, PyPI `vieneu` 3.8.3), a preset voice (`VI_VOICE` in `generate.py`, "Trúc Ly" until the team has listened and chosen).

These are the founders' choices. Changing a voice, its speed or the encoding in `generate.py` (`VOICES`, `GAPS`, `BITRATE`) records everything in that language again.

## When to run it

Whenever lesson text that Listen reads changes (a reading section's heading, text or simpler text, in English or in `content/id/`), or the way the app splits sentences changes. `npm run check:audio` says when (CI runs it, and Claude Code's content hook reminds you); it fails until the recordings match again.

## Setting up (once)

You need Node 22 (as for the site), Python 3.10 to 3.12 and ffmpeg (`brew install ffmpeg`, or `apt install ffmpeg`).

```sh
sh scripts/audio/setup.sh
```

This makes `.venv-audio/` (gitignored) with Kokoro, transformers, torch and soundfile, about 2 GB, most of it torch, and `vieneu` with its text front end `sea-g2p` and `onnxruntime` (no torch of its own, so it shares the one above; it also installs gradio and librosa, which `vieneu` requires and the recordings don't use). The first run also downloads the two voice models from Hugging Face (about 315 MB and 140 MB) and spaCy's small English model. Nothing here is needed by the site, the tests or CI.

A computer that records only Vietnamese needs just `pip install vieneu==3.8.3 sea-g2p==0.10.0 onnxruntime==1.31.0 soxr soundfile numpy` (Python 3.10 to 3.13) and ffmpeg.

`npm run audio:generate` uses `.venv-audio` when it exists, otherwise `$AUDIO_PYTHON` or `python3`.

## Recording

```sh
npm run audio:generate                 # the ready languages (English, Indonesian, Malay), and any other that already has recordings
npm run audio:generate -- --lang id    # only Indonesian (the other languages' files are kept)
npm run audio:generate -- --lang ms    # only Malay
npm run audio:generate -- --lang vi    # Vietnamese (a hidden preview: only when asked for, see below)
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

## Vietnamese

Vietnamese is a hidden preview (`ready: false` in `src/i18n/locales.ts`), so its recordings are kept out of `main` until a native speaker has reviewed the lessons (`docs/notes/recorded-audio.md`, "Vietnamese"). `npm run audio:generate` skips a language that isn't ready and has no recordings yet, and `npm run check:audio` doesn't check it; once it has recordings (on the preview's branch), both treat it like the others.

**Choosing the voice.** The preset voices are listed by `--list-vi-voices`. Make a few short samples without touching the repository and listen to them:

```sh
sh scripts/audio/python.sh scripts/audio/generate.py --list-vi-voices
npm run audio:export -- .audio-cache/export.json
sh scripts/audio/python.sh scripts/audio/generate.py .audio-cache/export.json --lang vi --sample ~/vi-samples --limit 3 --vi-voice "Ngọc Huyền"
```

`--sample DIR` records the first `--limit` sections (or those whose key contains `--only`, such as `--only towns-near-rivers/standard/1`) into `DIR/vi/` as MP3 and writes nothing else. Then set `VI_VOICE` in `generate.py` (or `AUDIO_VI_VOICE`/`--vi-voice` for a run) and record: `npm run audio:generate -- --lang vi`. The voice, its sampling settings (temperature 0.6, top-k 25, top-p 0.95, repetition penalty 1.2, a seed taken from each piece's own words) and the model revisions are part of the voice's record: changing any of them records every Vietnamese piece again, and the same words always sound the same.

**Model files.** `--fetch-vieneu` (or the first Vietnamese run) downloads VieNeu v3 Turbo's `onnx_update` folder (about 480 MB, `pnnbao-ump/VieNeu-TTS-v3-Turbo`) and its audio codec (about 90 MB, `OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano-ONNX`) to `.audio-cache/models/vieneu/` (gitignored), at the revisions pinned in `generate.py`. Two things from the library need working around, and `generate.py` does both:

- **Real files, not symlinks.** The Hugging Face cache (`~/.cache/huggingface`) stores files as symlinks into a blobs folder, and onnxruntime 1.31 refuses them ("External data path escapes model directory"). So the files are downloaded with `snapshot_download(..., local_dir=...)`, which writes ordinary files, and `generate.py` checks that none is a symlink. If the model never loads on your machine, delete `.audio-cache/models/vieneu/` and run `--fetch-vieneu` again.
- **The codec.** `vieneu` hands the model folder (`onnx_dir`) to its ONNX engine but not the codec folder (`codec_dir`), so the engine would look for the codec in the Hugging Face cache (symlinks again). `generate.py` replaces the engine's `OnnxV3LiteEngine._fetch` so the codec's repository resolves to the real copy. If a new `vieneu` renames that, `generate.py` fails loudly; it is pinned to 3.8.3 and says so if another version is installed.

Nothing else is looked up on the Hub while it records (the model folder is given as `backbone_repo` too), the optional Perth watermark (`vieneu[watermark]`) is not installed or used, and the model's output (48 kHz) is resampled to 24 kHz with `soxr`. On two CPU cores it speaks at about 0.8 times real time.

**Licences** (also in `/credits`): the `vieneu` code, the model weights and the preset voices are Apache-2.0 (Phạm Nguyễn Ngọc Bảo, `pnnbao-ump`); the codec `MOSS-Audio-Tokenizer-Nano` (OpenMOSS-Team) is Apache-2.0; `sea-g2p` (the text normaliser and phonemiser, Rust with a Python wrapper, same author) is Apache-2.0 (its PyPI classifier and `LICENSE`). Apache-2.0 allows commercial use, so unlike Indonesian these recordings need no replacement if Thinkerwell ever charges; it asks for the licence text and a notice of the work's origin to be kept, which Credits does.

## Format

MP3, 32 kbit/s constant bit rate, mono, 24 kHz for English (Kokoro's own rate) and Vietnamese (VieNeu speaks at 48 kHz; it is resampled) and 16 kHz for Indonesian and Malay (MMS's): every browser plays it, iPad Safari and old Android Chrome included, and speech stays clear. One file per section, per reading level, per language, so a device downloads only the parts it plays.
