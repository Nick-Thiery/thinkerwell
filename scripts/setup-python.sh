#!/bin/sh
# Creates .venv (gitignored) with wordfreq, which scripts/check_lesson.py uses.
#
# Why not just `pip install wordfreq`: Homebrew's Python 3.14.7 on macOS 26
# can't load its XML module (pyexpat is linked against an older system
# libexpat). That makes platform.mac_ver() return "" and pip crash with
# "ValueError: invalid literal for int()". So this script picks the first
# Python that can import pyexpat (python3, then Apple's /usr/bin/python3) and
# installs wordfreq into .venv only. Nothing outside this folder is changed.
set -e
cd "$(dirname "$0")/.."

PY=""
for candidate in "${PYTHON:-}" python3 /usr/bin/python3; do
  [ -n "$candidate" ] || continue
  if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c "import pyexpat" 2>/dev/null; then
    PY="$candidate"
    break
  fi
done
if [ -z "$PY" ]; then
  echo "No working Python 3 found (need one that can import pyexpat)." >&2
  exit 1
fi

echo "Using $PY ($("$PY" --version 2>&1))"
"$PY" -m venv .venv
.venv/bin/python -m pip install --quiet --upgrade pip
.venv/bin/python -m pip install --quiet wordfreq
.venv/bin/python -c "from wordfreq import zipf_frequency; print('wordfreq ok')"
