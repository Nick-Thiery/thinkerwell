#!/usr/bin/env python3
"""After translators have written content/<lang>/ files and flagged strings in
docs/translation/<lang>/notes/, record for every translated string the English
it was translated from (`source`), which is how check_translation.py notices
that the English changed later. Also sets each picture's <desc> to its
lesson's translated visual.alt.

Usage: fill_sources.py <lang>

Existing notes (flag, note, back, reviewer) are kept; only `source` is set.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import translatable as T  # noqa: E402


def notes_path(lang, name):
    return os.path.join(T.ROOT, "docs", "translation", lang, "notes", f"{name}.json")


def fill(lang, name, eng_path):
    E = T.load(eng_path)
    path = notes_path(lang, name)
    notes = T.load(path) if os.path.exists(path) else {}
    for p, value in T.translatable(E):
        key = T.path_str(p)
        entry = notes.setdefault(key, {})
        entry["source"] = value
    # keep the key order of the English file
    order = {T.path_str(p): i for i, (p, _) in enumerate(T.translatable(E))}
    notes = dict(sorted(notes.items(), key=lambda kv: order.get(kv[0], 10**9)))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    T.dump(notes, path)
    return len(notes)


def sync_desc(lang, lesson_tr_path, svg_path):
    if not os.path.exists(svg_path) or not os.path.exists(lesson_tr_path):
        return False
    alt = ((T.load(lesson_tr_path).get("visual") or {}).get("alt"))
    if not alt:
        return False
    svg = open(svg_path, encoding="utf-8").read()
    esc = alt.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    new = re.sub(r"(<desc>)(.*?)(</desc>)", lambda m: m.group(1) + esc + m.group(3), svg, count=1, flags=re.S)
    if new != svg:
        open(svg_path, "w", encoding="utf-8").write(new)
        return True
    return False


def main(argv):
    if len(argv) != 1:
        print(__doc__)
        return 2
    lang = argv[0]
    eng, _ = T.course_files(lang)
    fill(lang, "course", eng)
    for eng_path, tr_path in T.lesson_files(lang):
        name = os.path.basename(eng_path)[:-5]
        fill(lang, name, eng_path)
        src = (T.load(eng_path).get("visual") or {}).get("src")
        if src and sync_desc(lang, tr_path, os.path.join(T.ROOT, "content", lang, src)):
            print("synced <desc>", src)
    for eng_path, _ in T.quiz_files(lang):
        fill(lang, "quiz-" + os.path.basename(eng_path)[:-5], eng_path)
    print("sources filled")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
