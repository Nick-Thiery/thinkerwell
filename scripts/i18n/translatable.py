"""Which parts of the content files are translated, and how a translation
file is laid over the English one.

A translation file (content/<lang>/lessons/L01.json, content/<lang>/course.json)
has the same shape as the English file but holds only the text learners read.
Everything else (ids, numbers, correct flags, video ids, links, notes for the
team) comes from the English file, so a translation can never change which
answer is right or which video plays. src/content/translation.ts does the same
merge in the app; keep the two in step.

Rules:
- Objects: every key in the translation must exist in the English object.
- Arrays: the same length as the English array, merged item by item.
  The one exception is a glossary entry's `forms`, which is replaced whole
  (Indonesian has different word forms from English): it may be left out,
  and may be added where the English entry has none.
- Strings replace the English string. Only strings may be translated.

Paths are dotted, with list indexes as numbers: read.sections.0.text.
"""

import json
import os
import re

# THINKERWELL_ROOT lets the tests work on a copy of the repository.
ROOT = os.environ.get("THINKERWELL_ROOT") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# Keys that are never translated, wherever they appear.
FIXED_KEYS = {"id", "oldId", "type", "color", "correct", "optional", "required", "fictional",
              "youtubeId", "src", "url", "schemaVersion", "number", "lessons",
              "totalLessons", "estimatedHours", "durationSeconds", "estimatedMinutes",
              # Section checks: which lesson a question is from, and the skill it tests.
              "skill", "lesson",
              # A glossary word's one-line meanings in learners' languages (for English lessons).
              "translations"}

# Whole branches that stay in English: notes for the team or the video's own
# title and channel (the video itself stays in English).
FIXED_PATHS = {
    ("section",), ("changes",),
    ("watch", "title"), ("watch", "channel"), ("watch", "replacementSuggestion"),
    ("visual", "description"),
}

# Arrays replaced whole rather than item by item.
WHOLE_LIST_KEYS = {"forms"}


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def dump(data, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def path_str(path):
    return ".".join(str(p) for p in path)


def parse_path(text):
    return tuple(int(p) if p.isdigit() else p for p in text.split("."))


def is_fixed(path):
    if path and isinstance(path[-1], str) and path[-1] in FIXED_KEYS:
        return True
    return any(path[: len(fixed)] == fixed for fixed in FIXED_PATHS)


def translatable(english, path=()):
    """Yields (path, english value) for everything a translation must cover.
    The value is a string, or a list of strings for `forms`."""
    if is_fixed(path):
        return
    if isinstance(english, str):
        yield path, english
    elif isinstance(english, list):
        if path and path[-1] in WHOLE_LIST_KEYS:
            yield path, list(english)
            return
        for i, item in enumerate(english):
            yield from translatable(item, path + (i,))
    elif isinstance(english, dict):
        for key, value in english.items():
            yield from translatable(value, path + (key,))


def skeleton(english):
    """A translation file with the English text in every translatable place."""
    out = {}
    for path, value in translatable(english):
        set_path(out, path, value, english)
    return out


def get_path(data, path):
    node = data
    for p in path:
        if isinstance(node, dict):
            if p not in node:
                return None
            node = node[p]
        elif isinstance(node, list):
            if not isinstance(p, int) or p >= len(node):
                return None
            node = node[p]
        else:
            return None
    return node


def set_path(data, path, value, english):
    """Sets value at path, creating dicts and lists shaped like `english`."""
    node, eng = data, english
    for i, p in enumerate(path[:-1]):
        nxt = path[i + 1]
        eng = eng[p]
        if isinstance(node, dict):
            if p not in node:
                node[p] = [None] * len(eng) if isinstance(nxt, int) else {}
            node = node[p]
        else:
            if node[p] is None:
                node[p] = [None] * len(eng) if isinstance(nxt, int) else {}
            node = node[p]
    node[path[-1]] = value


def problems(english, translation, path=()):
    """Structural problems with a translation file, as strings."""
    out = []
    if isinstance(translation, dict):
        if not isinstance(english, dict):
            return [f"{path_str(path)}: should not be an object"]
        for key, value in translation.items():
            sub = path + (key,)
            if key not in english and key not in WHOLE_LIST_KEYS:
                out.append(f"{path_str(sub)}: not in the English file")
            elif is_fixed(sub):
                out.append(f"{path_str(sub)}: is not translated (it comes from the English file); remove it")
            else:
                out += problems(english.get(key, []), value, sub)
    elif isinstance(translation, list):
        if not isinstance(english, list):
            return [f"{path_str(path)}: should not be a list"]
        if path and path[-1] in WHOLE_LIST_KEYS:
            if not all(isinstance(v, str) and v.strip() for v in translation):
                out.append(f"{path_str(path)}: every form must be a non-empty string")
            return out
        if len(translation) != len(english):
            return [f"{path_str(path)}: has {len(translation)} items, English has {len(english)}"]
        for i, (e, t) in enumerate(zip(english, translation)):
            out += problems(e, t, path + (i,))
    elif isinstance(translation, str):
        if not isinstance(english, str):
            out.append(f"{path_str(path)}: English has no text here")
        elif not translation.strip():
            out.append(f"{path_str(path)}: empty")
    elif translation is not None:
        out.append(f"{path_str(path)}: only text can be translated")
    return out


def missing(english, translation):
    """Translatable paths the translation does not cover (forms may be left out)."""
    out = []
    for path, _ in translatable(english):
        if path[-1] in WHOLE_LIST_KEYS:
            continue
        value = get_path(translation, path)
        if not isinstance(value, str) or not value.strip():
            out.append(path_str(path))
    return out


def merge(english, translation):
    """The English file with the translation laid over it."""
    if isinstance(english, dict) and isinstance(translation, dict):
        out = {}
        for key, value in english.items():
            # English forms never mark translated text.
            if key in WHOLE_LIST_KEYS and translation and key not in translation:
                continue
            out[key] = merge(value, translation[key]) if key in translation else value
        for key in WHOLE_LIST_KEYS:
            if key in translation and key not in english:
                out[key] = translation[key]
        return out
    if isinstance(english, list) and isinstance(translation, list):
        if len(english) != len(translation):
            return translation
        return [merge(e, t) if t is not None else e for e, t in zip(english, translation)]
    if translation is None:
        return english
    return translation


def lesson_files(lang):
    """(English path, translation path) for every lesson, in order."""
    eng_dir = os.path.join(ROOT, "content", "lessons")
    out = []
    for name in sorted(os.listdir(eng_dir)):
        if re.fullmatch(r"L\d\d\.json", name):
            out.append((os.path.join(eng_dir, name), os.path.join(ROOT, "content", lang, "lessons", name)))
    return out


def quiz_files(lang):
    """(English path, translation path) for every section check."""
    eng_dir = os.path.join(ROOT, "content", "quizzes")
    return [(os.path.join(eng_dir, name), os.path.join(ROOT, "content", lang, "quizzes", name))
            for name in sorted(os.listdir(eng_dir)) if name.endswith(".json")]


def course_files(lang):
    return os.path.join(ROOT, "content", "course.json"), os.path.join(ROOT, "content", lang, "course.json")


def messages_files(lang):
    base = os.path.join(ROOT, "src", "i18n", "messages")
    return os.path.join(base, "en.json"), os.path.join(base, f"{lang}.json")


def svg_texts(path):
    """The words in a picture: its <title>, its <desc>, and each <text> (tspans joined by spaces)."""
    import xml.etree.ElementTree as ET
    root = ET.parse(path).getroot()
    tag = lambda el: el.tag.split("}")[-1]  # noqa: E731
    out = {"title": "", "desc": "", "text": []}
    for el in root.iter():
        if tag(el) in ("title", "desc") and not out[tag(el)]:
            out[tag(el)] = "".join(el.itertext()).strip()
        elif tag(el) == "text":
            out["text"].append(" ".join(t.strip() for t in el.itertext() if t.strip()))
    return out
