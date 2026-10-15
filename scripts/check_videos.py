#!/usr/bin/env python3
"""Check a language's own Watch videos (content/<lang>/videos.json).

Usage: check_videos.py id [ms ...]

The same rules the build applies (src/content/schema.ts localVideosFileSchema,
src/content/load.ts checkLocalVideos), plus checks on the words:
- the file is for the language of its folder, and every key is a lesson
  (L01 ... ) that exists;
- an entry with "approved": true says who approved it (approvedBy) and when
  (approvedOn), has a well-formed YouTube id (11 characters), a title, a
  channel, the questions, the written version (summary) and at least one key
  point; optionally the part of a longer video it plays (startSeconds and
  endSeconds, with durationSeconds the part's length) and the publisher's
  channel (channelUrl); an entry with "approved": false has only an id, title,
  channel and an optional note. Unknown fields are errors;
- an approved video is not the lesson's English video;
- the words an approved entry's teachers and learners read (why, the two
  questions, summary, key points, content note) are in the language: not
  English, and for Malay not Indonesian; house style as in
  scripts/check_translation.py (kamu, not Anda; no "please").
Warns when an approved summary is based on a video's title and description and
not on a transcript or on watching it.

Prints ERROR / WARN lines. Exits 1 if there are errors.
"""
import json
import os
import re
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import check_translation as C  # noqa: E402

YOUTUBE_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
LESSON_KEY = re.compile(r"^L\d\d$")
SUMMARY_BASES = {"watched", "transcript", "description", "title-and-description"}
APPROVED_FIELDS = {
    "approved", "approvedBy", "approvedOn", "youtubeId", "title", "channel", "durationSeconds", "why",
    "beforeQuestion", "afterQuestion", "summary", "summaryBasis", "keyPoints", "contentNote",
    "startSeconds", "endSeconds", "channelUrl",
}
CHANNEL_URL = re.compile(r"^https://www\.youtube\.com/[@\w./-]+$")
PENDING_FIELDS = {"approved", "youtubeId", "title", "channel", "note"}
# The words learners and teachers read. (title and channel are YouTube's own words and may be in any language.)
TEXT_FIELDS = ["why", "beforeQuestion", "afterQuestion", "summary", "contentNote"]

# Common English words that are not words in Indonesian or Malay: a text with many of them is English.
ENGLISH_WORDS = {
    "the", "and", "is", "are", "of", "to", "in", "this", "that", "video", "with", "for", "what", "how", "why",
    "was", "were", "they", "their", "from", "about", "can", "does", "which", "when", "it", "an", "be", "by",
    "on", "as", "at", "we", "you", "your", "have", "has", "not", "or", "because", "people", "history",
}


def is_text(value):
    return isinstance(value, str) and value.strip() != ""


def real_date(value):
    if not isinstance(value, str) or not re.match(r"^\d{4}-\d{2}-\d{2}$", value):
        return False
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def english_share(text):
    words = [w.lower() for w in C.words(text)]
    if len(words) < 5:
        return 0.0
    return sum(1 for w in words if w in ENGLISH_WORDS) / len(words)


def english_video_ids():
    out = {}
    lessons = os.path.join(ROOT, "content", "lessons")
    for name in sorted(os.listdir(lessons)):
        if re.match(r"^L\d\d\.json$", name):
            with open(os.path.join(lessons, name), encoding="utf-8") as f:
                out[name[:-5]] = (json.load(f).get("watch") or {}).get("youtubeId")
    return out


def check_entry(lang, key, entry, english_ids):
    errs, warns = [], []
    where = f"lessons.{key}"
    if not isinstance(entry, dict):
        return [f"{where}: must be an object"], warns
    approved = entry.get("approved")
    if approved is not True and approved is not False:
        return [f"{where}.approved: must be true or false"], warns
    allowed = APPROVED_FIELDS if approved else PENDING_FIELDS
    for field in sorted(set(entry) - allowed):
        errs.append(f"{where}.{field}: not a field of {'an approved' if approved else 'an unapproved'} entry")
    for field in ("title", "channel"):
        if not is_text(entry.get(field)):
            errs.append(f"{where}.{field}: required")
    if not isinstance(entry.get("youtubeId"), str) or not YOUTUBE_ID.match(entry.get("youtubeId", "")):
        errs.append(f"{where}.youtubeId: must be an 11-character YouTube id")
    if not approved:
        if "note" in entry and not is_text(entry["note"]):
            errs.append(f"{where}.note: empty")
        return errs, warns

    if not is_text(entry.get("approvedBy")):
        errs.append(f"{where}.approvedBy: an approved video needs the name of the person who watched it")
    if not real_date(entry.get("approvedOn")):
        errs.append(f"{where}.approvedOn: an approved video needs the date, like 2026-10-14")
    duration = entry.get("durationSeconds", "missing")
    if duration == "missing" or not (duration is None or (isinstance(duration, int) and not isinstance(duration, bool) and duration > 0)):
        errs.append(f"{where}.durationSeconds: a whole number of seconds, or null")
    # The part of a longer video the lesson plays: both ends or neither, in order, and the length is the part's.
    start, end = entry.get("startSeconds"), entry.get("endSeconds")
    if start is not None or end is not None:
        whole = lambda v: isinstance(v, int) and not isinstance(v, bool) and v >= 0  # noqa: E731
        if not whole(start) or not whole(end):
            errs.append(f"{where}.startSeconds/endSeconds: both, as whole seconds, or neither")
        elif end <= start:
            errs.append(f"{where}.endSeconds: must be after startSeconds")
        elif duration != end - start:
            errs.append(f"{where}.durationSeconds: must be the part's length, {end - start}")
    if "channelUrl" in entry and not (isinstance(entry["channelUrl"], str) and CHANNEL_URL.match(entry["channelUrl"])):
        errs.append(f"{where}.channelUrl: a YouTube channel address like https://www.youtube.com/@name")
    for field in ["why", "beforeQuestion", "afterQuestion", "summary"]:
        if not is_text(entry.get(field)):
            errs.append(f"{where}.{field}: required")
    points = entry.get("keyPoints")
    if not isinstance(points, list) or not points or not all(is_text(p) for p in points):
        errs.append(f"{where}.keyPoints: needs at least one key point, each with text")
    if "contentNote" not in entry:
        errs.append(f"{where}.contentNote: required (text, or null)")
    elif entry["contentNote"] is not None and not is_text(entry["contentNote"]):
        errs.append(f"{where}.contentNote: text, or null")
    if entry.get("summaryBasis") not in SUMMARY_BASES:
        errs.append(f"{where}.summaryBasis: one of {', '.join(sorted(SUMMARY_BASES))}")
    elif entry["summaryBasis"] not in ("watched", "transcript"):
        warns.append(f"{where}.summary: based on the video's {entry['summaryBasis'].replace('-', ' ')}, not on what it says; "
                     "make sure the person who approved it read it against the video")
    if english_ids.get(key) and entry.get("youtubeId") == english_ids[key]:
        errs.append(f"{where}.youtubeId: this is the lesson's English video, not a video in the language")

    style = C.STYLE.get(lang)
    texts = [(f, entry.get(f)) for f in TEXT_FIELDS] + [(f"keyPoints.{i}", p) for i, p in enumerate(points if isinstance(points, list) else [])]
    for field, text in texts:
        if not is_text(text):
            continue
        if english_share(text) > 0.25:
            errs.append(f"{where}.{field}: looks like English; it must be in the language of the file ({lang})")
        if style:
            for pattern in style["forbidden"]:
                match = re.search(pattern, text)
                if match:
                    errs.append(f"{where}.{field}: {match.group(0)!r}; {style.get('voice_hint', 'house style')}")
                    break
    return errs, warns


def check_file(lang):
    path = os.path.join(ROOT, "content", lang, "videos.json")
    rel = os.path.relpath(path, ROOT)
    if not os.path.exists(path):
        return rel, [], [], False
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:  # noqa: BLE001
        return rel, [f"invalid JSON: {e}"], [], True
    errs, warns = [], []
    if not isinstance(data, dict) or set(data) != {"language", "lessons"}:
        return rel, ['must be an object with exactly "language" and "lessons"'], [], True
    if data["language"] != lang:
        errs.append(f'language: is "{data["language"]}", but the file is in the folder for "{lang}"')
    if not isinstance(data["lessons"], dict):
        return rel, errs + ["lessons: must be an object"], warns, True
    english_ids = english_video_ids()
    for key, entry in data["lessons"].items():
        if not LESSON_KEY.match(key):
            errs.append(f"lessons.{key}: a lesson file name like L05")
            continue
        if key not in english_ids:
            errs.append(f"lessons.{key}: there is no lesson {key}")
            continue
        e, w = check_entry(lang, key, entry, english_ids)
        errs += e
        warns += w
    return rel, errs, warns, True


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    total = 0
    for lang in argv:
        rel, errs, warns, found = check_file(lang)
        if not found:
            print(f"== {rel}: none (every lesson shows the English video)")
            continue
        total += len(errs)
        print(f"== {rel}: {len(errs)} errors, {len(warns)} warnings")
        for e in errs:
            print("   ERROR", e)
        for w in warns:
            print("   WARN ", w)
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
