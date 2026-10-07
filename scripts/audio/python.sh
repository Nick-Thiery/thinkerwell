#!/bin/sh
# Runs Python for the recordings: .venv-audio (sh scripts/audio/setup.sh) when it
# exists, else $AUDIO_PYTHON, else python3, from the repository root.
cd "$(dirname "$0")/../.." || exit 1
if [ -x .venv-audio/bin/python ]; then exec .venv-audio/bin/python "$@"; fi
exec "${AUDIO_PYTHON:-python3}" "$@"
