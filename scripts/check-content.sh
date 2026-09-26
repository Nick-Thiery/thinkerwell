#!/bin/sh
# Checks every lesson file against docs/content/SPEC.md with
# scripts/check_lesson.py. Exits non-zero if the checker reports errors.
#
# Uses .venv/bin/python (made by scripts/setup-python.sh, which installs
# wordfreq) when it exists, otherwise python3.
cd "$(dirname "$0")/.." || exit 1

if [ -x .venv/bin/python ]; then
  PY=.venv/bin/python
else
  PY=python3
  echo "Note: .venv not found, using python3; wordfreq checks may be skipped (run sh scripts/setup-python.sh)."
fi

"$PY" scripts/check_lesson.py content/lessons/*.json
