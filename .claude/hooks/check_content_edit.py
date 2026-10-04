#!/usr/bin/env python3
"""Claude Code hook: check a content file right after Claude edits it.

Runs after Edit, Write and MultiEdit (PostToolUse, set in .claude/settings.json).
When the edited file is a lesson, a section check or an Indonesian file, it runs
the same checker as `npm run check:content` on just that file:

  content/lessons/*.json   scripts/check_lesson.py <file>
  content/quizzes/*.json   scripts/check_quiz.py <file>
  content/id/**            scripts/check_translation.py id

If the checker reports errors, the hook exits 2, which shows its output to
Claude so it can fix the file straight away. Warnings stay quiet; `npm run
check:content` still shows them. Any other file, or anything unexpected (no
Python for the checkers, bad input), exits 0 and changes nothing.

Uses .venv/bin/python when it exists (sh scripts/setup-python.sh), like
scripts/py.sh, so the wordfreq checks run too.
"""
import json
import os
import subprocess
import sys

MAX_LINES = 60


def main() -> int:
    try:
        event = json.load(sys.stdin)
    except Exception:
        return 0

    root = os.environ.get("CLAUDE_PROJECT_DIR") or event.get("cwd") or os.getcwd()
    path = (event.get("tool_input") or {}).get("file_path") or ""
    if not path:
        return 0
    rel = os.path.relpath(os.path.abspath(os.path.join(root, path)), root).replace(os.sep, "/")

    if rel.startswith("content/lessons/") and rel.endswith(".json"):
        cmd = ["scripts/check_lesson.py", rel]
    elif rel.startswith("content/quizzes/") and rel.endswith(".json"):
        cmd = ["scripts/check_quiz.py", rel]
    elif rel.startswith("content/id/"):
        cmd = ["scripts/check_translation.py", "id"]
    else:
        return 0

    venv = os.path.join(root, ".venv", "bin", "python")
    python = venv if os.access(venv, os.X_OK) else "python3"
    try:
        done = subprocess.run(
            [python, *cmd], cwd=root, capture_output=True, text=True, timeout=60
        )
    except Exception:
        return 0
    if done.returncode == 0:
        return 0

    lines = (done.stdout + done.stderr).strip().splitlines()
    errors = [l for l in lines if "ERROR" in l or l.startswith("==")]
    shown = errors or lines
    if len(shown) > MAX_LINES:
        shown = shown[:MAX_LINES] + [f"... {len(shown) - MAX_LINES} more lines"]
    print(
        f"{' '.join(cmd)} found errors after this edit. Fix them before moving on "
        "(rules: docs/content/SPEC.md, docs/content/QUIZ_SPEC.md, docs/translation/README.md):",
        file=sys.stderr,
    )
    print("\n".join(shown), file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
