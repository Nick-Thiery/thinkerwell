#!/usr/bin/env python3
"""Translate a content file as a flat list of strings.

  flat.py export <english.json> <flat.json>
      Writes {"path": "English text", ...} for everything a translation covers
      (scripts/i18n/translatable.py). A glossary `forms` list is written as a
      list of strings.
  flat.py build <english.json> <flat-translated.json> <out.json>
      Lays the flat translation over the English shape and writes the
      translation file (the same shape as the English, learner text only).
      Stops if a path is missing or extra.

It exists so a long file can be translated without retyping its structure.
"""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
import translatable as T  # noqa: E402


def export(eng_path, out_path):
    eng = T.load(eng_path)
    flat = {T.path_str(p): v for p, v in T.translatable(eng)}
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(flat, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"{len(flat)} strings -> {out_path}")


def build(eng_path, flat_path, out_path):
    eng = T.load(eng_path)
    flat = T.load(flat_path)
    expected = {T.path_str(p): p for p, _ in T.translatable(eng)}
    # A glossary entry's `forms` may be left out (Vietnamese does not inflect).
    missing = [k for k in expected if k not in flat and not k.endswith(".forms")]
    extra = [k for k in flat if k not in expected]
    if missing or extra:
        print("missing:", missing[:20], "extra:", extra[:20])
        sys.exit(1)
    out = {}
    for key, path in expected.items():
        if key not in flat:
            continue
        T.set_path(out, path, flat[key], eng)
    T.dump(out, out_path)
    print(f"{len(flat)} strings -> {out_path}")


if __name__ == "__main__":
    if len(sys.argv) == 4 and sys.argv[1] == "export":
        export(sys.argv[2], sys.argv[3])
    elif len(sys.argv) == 5 and sys.argv[1] == "build":
        build(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print(__doc__)
        sys.exit(2)
