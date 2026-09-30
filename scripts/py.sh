#!/bin/sh
# Runs Python from .venv (made by scripts/setup-python.sh) when it exists,
# otherwise python3, from the repository root.
cd "$(dirname "$0")/.." || exit 1
if [ -x .venv/bin/python ]; then exec .venv/bin/python "$@"; fi
exec python3 "$@"
