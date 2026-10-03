"""What the review spreadsheet holds, shared by export_review.py and
import_review.py: which files, in which tab order, and how each row's ID
maps back to a file and a place in it.

Row IDs:
  ui:lessonPlayer.watch.readInstead   a message in src/i18n/messages/<lang>.json (a plural's one form)
  course:sections.0.title             a string in content/<lang>/course.json
  L01:read.sections.0.text            a string in content/<lang>/lessons/L01.json
  L01:picture.text.3                  a word in content/<lang>/visuals/L01.svg (title, desc, or the 4th label)
  quiz-history:questions.2.question   a string in content/<lang>/quizzes/history.json
"""
import json
import os
import re

import translatable as T

# Tabs: the interface first, then these lessons first (the ones to review
# first), then every other lesson in order.
PRIORITY_LESSONS = ["L01", "L02", "L11", "L12", "L16", "L23"]

# After the lessons: one tab per section check.
QUIZ_TITLES = {"history": "Check - History", "geography": "Check - Geography", "culture": "Check - Culture", "civics": "Check - Civics"}

COLUMNS = ["ID", "Where it appears", "English", "Indonesian", "Back-translation into English",
           "Flag", "Reviewer", "Notes", "Exported Indonesian (do not edit)"]


def lesson_names():
    names = [os.path.basename(e)[:-5] for e, _ in T.lesson_files("en")]
    return PRIORITY_LESSONS + [n for n in names if n not in PRIORITY_LESSONS]


def notes_path(lang, name):
    return os.path.join(T.ROOT, "docs", "translation", lang, "notes", f"{name}.json")


def load_notes(lang, name):
    path = notes_path(lang, name)
    return T.load(path) if os.path.exists(path) else {}


PLURAL_FORMS = {"zero", "one", "two", "few", "many", "other"}


def is_plural(value):
    return isinstance(value, dict) and set(value) <= PLURAL_FORMS and "other" in value


def ui_leaves(data, prefix=()):
    """Every leaf of a messages file, plural forms included, as (path, value)."""
    for key, value in data.items():
        path = prefix + (key,)
        if isinstance(value, dict):
            yield from ui_leaves(value, path)
        else:
            yield path, value


def ui_messages(data, prefix=()):
    """Every message of a messages file as (dotted key, text); a plural
    message is one row, its "other" form (Indonesian has no other)."""
    for key, value in data.items():
        path = prefix + (key,)
        if is_plural(value):
            yield ".".join(path), value["other"]
        elif isinstance(value, dict):
            yield from ui_messages(value, path)
        else:
            yield ".".join(path), value


def ui_value(data, key):
    node = T.get_path(data, tuple(key.split(".")))
    return node.get("other") if is_plural(node) else node


def quiz_names():
    """Section checks in course order (then any other)."""
    names = [os.path.basename(e)[:-5] for e, _ in T.quiz_files("en")]
    return [n for n in QUIZ_TITLES if n in names] + [n for n in names if n not in QUIZ_TITLES]


def split_id(row_id):
    """"L01:read.sections.0.text" -> ("L01", ("read", "sections", 0, "text"))."""
    name, _, path = row_id.partition(":")
    if not path:
        raise ValueError(f"not a row ID: {row_id!r}")
    if name == "ui":
        return name, tuple(path.split("."))
    return name, T.parse_path(path)


def translation_file(lang, name):
    if name == "ui":
        return T.messages_files(lang)
    if name == "course":
        return T.course_files(lang)
    if name.startswith("quiz-"):
        section = name[len("quiz-"):]
        return (os.path.join(T.ROOT, "content", "quizzes", f"{section}.json"),
                os.path.join(T.ROOT, "content", lang, "quizzes", f"{section}.json"))
    return (os.path.join(T.ROOT, "content", "lessons", f"{name}.json"),
            os.path.join(T.ROOT, "content", lang, "lessons", f"{name}.json"))


def picture_files(lang, name):
    """The English picture of lesson `name` and its translated copy, or None."""
    src = (T.load(os.path.join(T.ROOT, "content", "lessons", f"{name}.json")).get("visual") or {}).get("src")
    if not src:
        return None
    return os.path.join(T.ROOT, "content", src), os.path.join(T.ROOT, "content", lang, src)


def picture_rows(lang, name):
    """One row per word in a lesson's picture: its title, description and each label."""
    files = picture_files(lang, name)
    if not files or not os.path.exists(files[1]):
        return []
    E, R = T.svg_texts(files[0]), T.svg_texts(files[1])
    notes = load_notes(lang, f"visual-{name}")
    out = []
    for part, where in (("title", "Picture › title (read out by screen readers)"), ("desc", "Picture › description (read out by screen readers)")):
        out.append((f"{name}:picture.{part}", where, E[part], R[part], dict(notes.get(E[part], {}))))
    for i, english in enumerate(E["text"]):
        translated = R["text"][i] if i < len(R["text"]) else ""
        out.append((f"{name}:picture.text.{i}", f"Picture › label {i + 1} (must fit its place in the picture)", english, translated,
                    dict(notes.get(english, {}))))
    return out


def rows_for(lang, name):
    """(row ID, where, English, translation, notes entry) for one file."""
    eng_path, tr_path = translation_file(lang, name)
    E, R = T.load(eng_path), T.load(tr_path)
    notes = load_notes(lang, name)
    out = []
    if name == "ui":
        for key, english in ui_messages(E):
            out.append((f"ui:{key}", where_ui(key), english, ui_value(R, key), notes.get(key, {})))
    elif name.startswith("quiz-"):
        for path, english in T.translatable(E):
            key = T.path_str(path)
            out.append((f"{name}:{key}", where_quiz(path, E), english, T.get_path(R, path), notes.get(key, {})))
    else:
        for path, english in lesson_paths(E) if name != "course" else T.translatable(E):
            key = T.path_str(path)
            where = where_course(path) if name == "course" else where_lesson(path, E)
            entry = dict(notes.get(key, {}))
            if path[-1] == "forms" and not entry.get("back"):
                entry["back"] = "(other forms of the key word above)"
            out.append((f"{name}:{key}", where, english, T.get_path(R, path), entry))
        if name != "course":
            out += picture_rows(lang, name)
    return out


def lesson_paths(E):
    """A lesson's translatable paths, with a `forms` row after every glossary
    word (whether or not the English entry has forms: a translation may add them)."""
    for path, english in T.translatable(E):
        if path[-1] == "forms":
            continue
        yield path, english
        if len(path) == 4 and path[:2] == ("read", "glossary") and path[3] == "word":
            yield path[:3] + ("forms",), list(E["read"]["glossary"][path[2]].get("forms", []))


def where_quiz(path, quiz):
    p = list(path)
    if p[0] in ("title", "intro"):
        return {"title": "Section check › title", "intro": "Section check › first screen"}[p[0]]
    if p[0] == "results":
        return {"high": "Results › high score", "middle": "Results › middle score", "low": "Results › low score"}[p[1]]
    q = quiz["questions"][p[1]]
    head = f"Question {p[1] + 1} (about Lesson {q['lesson']})"
    if p[2] == "question":
        return f"{head} › question"
    if p[2] == "stimulus":
        return f"{head} › example above it › " + {"title": "title", "body": "text", "items": f"line {p[-1] + 1 if len(p) > 4 else ''}"}[p[3]].strip()
    option = q["options"][p[3]]
    verdict = "the CORRECT answer" if option["correct"] else "a wrong answer"
    return f"{head} › option {letter(p[3])} ({verdict})" + (" › feedback" if p[4] == "feedback" else "")


def cell_text(value):
    if isinstance(value, list):
        return ", ".join(value)
    return "" if value is None else str(value)


# ------------------------------------------------------------ where it appears

UI_PLACES = [
    ("app.", "Everywhere: app name, skip link, page titles"),
    ("nav.", "Header menu"),
    ("stages.", "Lesson step names (everywhere)"),
    ("sections.", "Section check name"),
    ("lesson.", "Lesson labels (course map, home, lesson)"),
    ("lessonPlayer.shell.", "Lesson: around every step"),
    ("lessonPlayer.read.", "Lesson › Read step"),
    ("lessonPlayer.evidence.", "Lesson › Read › evidence cards"),
    ("lessonPlayer.write.", "Lesson › Write step"),
    ("lessonPlayer.speak.", "Lesson › Speak step"),
    ("lessonPlayer.watch.", "Lesson › Watch step"),
    ("lessonPlayer.reflect.", "Lesson › Reflect step"),
    ("lessonPlayer.complete.", "Lesson › Lesson complete screen"),
    ("pages.home.newLearner.", "Home › \"I'm new here\" form"),
    ("pages.home.remove.", "Home › removing a learner"),
    ("pages.home.noStorage.", "Home › when this device can't save"),
    ("pages.home.dashboard.", "Home › a learner's own home page"),
    ("pages.home.", "Home › \"Who's learning today?\""),
    ("pages.course.", "Course map"),
    ("pages.settings.", "Settings page"),
    ("pages.consentForm.", "Consent form (printed for parents and guardians; page 2 for staff and the learner)"),
    ("pages.pilotStudy.", "Consent form and information sheet: the pilot study and what is kept (printed; promises to families)"),
    ("pages.infoSheet.", "Information sheet for families (printed)"),
    ("pages.", "Page titles"),
    ("notFound.", "Page not found"),
    ("routeError.", "Error page"),
    ("header.", "Header › switch learner, looking around"),
    ("dev.", "Developer test mode only (learners never see it)"),
    ("speech.", "Listen (reading aloud)"),
    ("ds.chrome.", "Header, step path and progress (mostly for screen readers)"),
    ("ds.course.", "Course map and home: section names, lesson rows, journal"),
    ("ds.content.", "Lesson: cards, definitions, answers, video"),
    ("ds.actions.", "Lesson: Listen, Say it, Record yourself, writing boxes"),
]


def where_ui(key):
    for prefix, place in UI_PLACES:
        if key.startswith(prefix):
            return place
    return "Interface"


def where_course(path):
    p = [x for x in path]
    if p[0] == "course":
        return "Course map: course " + {"title": "title", "description": "description"}[p[1]]
    if p[0] == "sections":
        return f"Section {p[1] + 1}: " + {"title": "name", "question": "big question", "description": "description"}[p[2]]
    if p[0] == "practiceOptions":
        return f"Lesson › Speak › \"How did you practise?\" choice {p[1] + 1}"
    if p[0] == "fictionLabel":
        return "Lesson › Read › label on invented examples"
    return T.path_str(path)


def letter(i):
    return "ABCDEFGH"[i]


def where_lesson(path, lesson):
    p = list(path)
    n = lambda i: i + 1  # noqa: E731
    head = p[0]
    if head == "title":
        return "Lesson title (top of every step)"
    if head == "essentialQuestion":
        return "Big question under the title"
    if head == "learningGoal":
        return "About this lesson › learning goal"
    if head == "warmUp":
        return "Read › warm-up question" if p[1] == "question" else f"Read › warm-up choice {n(p[2])}"
    if head == "evidence":
        if p[1] == "label":
            return "Read › evidence › label on invented examples"
        if p[1] == "question":
            return "Read › evidence › question"
        card = f"Read › evidence card {n(p[2])}"
        rest = p[3:]
        if rest == ["title"]:
            return f"{card} › title"
        kind = rest[0]
        labels = {"items": "item", "events": "timeline", "locations": "map place", "legend": "map key",
                  "cases": "example", "sources": "source", "columns": "table heading", "rows": "table row"}
        text = f"{card} › {labels.get(kind, kind)} {n(rest[1])}"
        if kind == "rows":
            text += f", column {n(rest[2])}"
        elif len(rest) > 2:
            field = {"year": "date", "text": "text", "label": "name", "description": "description",
                     "name": "name", "body": "text", "caption": "caption", "details": "detail"}.get(rest[2], rest[2])
            text += f" › {field}" + (f" {n(rest[3])}" if len(rest) > 3 else "")
        return text
    if head == "read":
        if p[1] == "sections":
            part = f"Read › part {n(p[2])}"
            return part + {"heading": " › heading", "text": " › standard text", "simpler": " › SIMPLER text"}[p[3]]
        if p[1] == "glossary":
            word = f"Key word {n(p[2])}"
            return word + {"word": " › the word", "forms": " › other forms marked in the text (comma-separated)",
                           "definition": " › meaning", "example": " › example sentence"}[p[3]]
        if p[1] == "checks":
            check = lesson["read"]["checks"][p[2]]
            q = f"Quick check › question {n(p[2])}"
            if p[3] == "question":
                return q + (" (think question)" if check["type"] == "think" else "")
            if p[3] == "placeholder":
                return q + " › hint inside the answer box"
            option = check["options"][p[4]]
            verdict = "the CORRECT answer" if option["correct"] else "a wrong answer"
            return f"{q} › option {letter(p[4])} ({verdict})" + (" › feedback" if p[5] == "feedback" else "")
    if head == "write":
        return {"prompt": "Write › task", "sentenceStarters": f"Write › sentence starter {n(p[-1]) if len(p) > 2 else ''}",
                "planningBoxes": f"Write › planning box {n(p[-1]) if len(p) > 2 else ''}",
                "selfCheck": f"Write › self-check {n(p[-1]) if len(p) > 2 else ''}",
                "example": "Write › example answer"}[p[1]].strip()
    if head == "speak":
        return {"partnerTask": "Speak › with a partner", "independentTask": "Speak › on your own"}[p[1]]
    if head == "watch":
        return {"why": "Watch › why this video", "beforeQuestion": "Watch › question before the video",
                "afterQuestion": "Watch › question after the video",
                "summary": "Watch › written version (\"Read instead\")",
                "keyPoints": f"Watch › written version › key point {n(p[-1]) if len(p) > 2 else ''}",
                "contentNote": "Watch › \"For teachers\" note"}[p[1]].strip()
    if head == "reflect":
        if p[1] == "completionMessage":
            return "Lesson complete screen › message"
        required = lesson["reflect"]["prompts"][p[2]]["required"]
        return f"Reflect › question {n(p[2])} ({'needed to finish' if required else 'optional'})"
    if head == "visual":
        return "Picture description for screen readers"
    return T.path_str(path)


def placeholders(text):
    return sorted(re.findall(r"\{(\w+)\}", text or ""))


def dumps(data):
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"
