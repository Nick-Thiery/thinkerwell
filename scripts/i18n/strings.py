#!/usr/bin/env python3
"""List the translatable strings of a file, one per line, as JSON.

Usage:
  strings.py <lang> <L01|course|ui|quiz-history>            the translation
  strings.py <lang> <L01|course|ui|quiz-history> --english  the English source

Each line: {"path": "read.sections.0.text", "text": "..."} (glossary forms as a list).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import translatable as T  # noqa: E402


def files(lang, name):
    if name == "course":
        return T.course_files(lang)
    if name == "ui":
        return T.messages_files(lang)
    if name.startswith("quiz-"):
        section = name[len("quiz-"):]
        return (os.path.join(T.ROOT, "content", "quizzes", f"{section}.json"),
                os.path.join(T.ROOT, "content", lang, "quizzes", f"{section}.json"))
    eng = os.path.join(T.ROOT, "content", "lessons", f"{name}.json")
    return eng, os.path.join(T.ROOT, "content", lang, "lessons", f"{name}.json")


def ui_strings(data, prefix=()):
    """Every message in a messages file: plural forms become key.one, key.other."""
    for key, value in data.items():
        path = prefix + (key,)
        if isinstance(value, dict):
            yield from ui_strings(value, path)
        else:
            yield path, value


def pairs(lang, name, english=False):
    eng_path, tr_path = files(lang, name)
    E = T.load(eng_path)
    source = E if english else T.load(tr_path)
    if name == "ui":
        return list(ui_strings(source))
    return [(path, T.get_path(source, path)) for path, _ in T.translatable(E)]


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    for path, text in pairs(sys.argv[1], sys.argv[2], "--english" in sys.argv[3:]):
        print(json.dumps({"path": T.path_str(path), "text": text}, ensure_ascii=False))
