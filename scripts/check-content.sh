#!/bin/sh
# Checks every lesson file (Our World's, and every other course's in
# content/courses/<id>/lessons/) against docs/content/SPEC.md with
# scripts/check_lesson.py, and every section check against
# docs/content/QUIZ_SPEC.md with scripts/check_quiz.py (which imports
# check_lesson.py from the same folder), then each translation
# (content/<code>/) with scripts/check_translation.py, and each language's own
# Watch videos (content/<code>/videos.json) with scripts/check_videos.py.
# Exits non-zero if any checker reports errors.
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

status=0
"$PY" scripts/check_lesson.py content/lessons/*.json || status=1
"$PY" scripts/check_quiz.py content/quizzes/*.json || status=1
# Every other course (content/courses/<id>/, src/content/courses.ts): its
# lessons against the same spec, with its own sections and its activities,
# its section checks if it has any, and its translations
# (content/courses/<id>/<code>/) like Our World's.
for lessons in content/courses/*/lessons; do
  [ -d "$lessons" ] || continue
  dir=$(dirname "$lessons")
  id=$(basename "$dir")
  echo
  echo "Course: $id"
  "$PY" scripts/check_lesson.py "$lessons"/*.json || status=1
  if [ -d "$dir/quizzes" ]; then "$PY" scripts/check_quiz.py "$dir"/quizzes/*.json || status=1; fi
  for course in "$dir"/*/course.json; do
    [ -f "$course" ] || continue
    lang=$(basename "$(dirname "$course")")
    echo
    echo "Course $id, translation: $lang"
    "$PY" scripts/check_translation.py --course "$id" "$lang" || status=1
  done
done
# Each language whose lessons are translated (content/<code>/, src/i18n/locales.ts)
# against the English, with scripts/check_translation.py.
for course in content/*/course.json; do
  [ -f "$course" ] || continue
  lang=$(basename "$(dirname "$course")")
  echo
  echo "Translation: $lang"
  "$PY" scripts/check_translation.py "$lang" || status=1
  # The language's own videos, if it has a file (docs/notes/local-language-videos.md).
  [ -f "content/$lang/videos.json" ] && { "$PY" scripts/check_videos.py "$lang" || status=1; }
done
exit $status
