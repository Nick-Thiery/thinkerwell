#!/bin/sh
# Makes .venv-audio (gitignored) with what scripts/audio/generate.py needs to
# record Listen's audio: Kokoro (English) and transformers with torch (MMS-TTS,
# Indonesian). Several gigabytes; only needed by whoever runs
# `npm run audio:generate`, never by the site or CI. Needs ffmpeg on the PATH
# (macOS: brew install ffmpeg; Debian or Ubuntu: apt install ffmpeg). Kokoro's
# English front end (misaki) brings its own espeak-ng for unusual words. The
# first run downloads the voice models from Hugging Face and spaCy's small
# English model. See scripts/audio/README.md.
set -e
cd "$(dirname "$0")/../.."
PY="${PYTHON:-python3}"
"$PY" -m venv .venv-audio
.venv-audio/bin/python -m pip install --quiet --upgrade pip
.venv-audio/bin/python -m pip install --quiet -r scripts/audio/requirements.txt
.venv-audio/bin/python -c "import kokoro, transformers, soundfile; print('kokoro, transformers and soundfile ok')"
command -v ffmpeg >/dev/null 2>&1 || echo "ffmpeg isn't on the PATH: install it before npm run audio:generate." >&2
