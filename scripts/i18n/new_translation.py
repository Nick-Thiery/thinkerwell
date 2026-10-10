#!/usr/bin/env python3
"""Start the translated content of a language: a file for every lesson, section
check and the course, each with the English text in every place a translator
fills in, and a copy of every lesson picture to redraw in the language.

Usage: new_translation.py <lang> [--force]

Writes (never over an existing file, unless --force):
  content/<lang>/course.json
  content/<lang>/lessons/L01.json ... L24.json
  content/<lang>/quizzes/<section>.json
  content/<lang>/visuals/L01.svg ...

The files hold only what translators change (scripts/i18n/translatable.py has
the rules): ids, correct answers, links and the notes for the team come from
the English files. The interface's messages (src/i18n/messages/<lang>.json)
are made with `npm run i18n:export` and `i18n:import` (docs/TRANSLATING.md).

To translate, replace the English text in place, then check it:
  python3 scripts/check_translation.py <lang> L01
"""
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(__file__))
import translatable as T  # noqa: E402


def write(path, data, force):
    if os.path.exists(path) and not force:
        return False
    os.makedirs(os.path.dirname(path), exist_ok=True)
    T.dump(data, path)
    return True


def main(argv):
    force = "--force" in argv
    args = [a for a in argv if not a.startswith("--")]
    if len(args) != 1:
        print(__doc__)
        return 2
    lang = args[0]
    made = []

    eng, tr = T.course_files(lang)
    if write(tr, T.skeleton(T.load(eng)), force):
        made.append(tr)
    for eng, tr in T.lesson_files(lang):
        lesson = T.load(eng)
        if write(tr, T.skeleton(lesson), force):
            made.append(tr)
        src = (lesson.get("visual") or {}).get("src")
        if src:
            target = os.path.join(T.ROOT, "content", lang, src)
            if force or not os.path.exists(target):
                os.makedirs(os.path.dirname(target), exist_ok=True)
                shutil.copyfile(os.path.join(T.ROOT, "content", src), target)
                made.append(target)
    for eng, tr in T.quiz_files(lang):
        if write(tr, T.skeleton(T.load(eng)), force):
            made.append(tr)

    for path in made:
        print("wrote", os.path.relpath(path, T.ROOT))
    print(f"{len(made)} files")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
