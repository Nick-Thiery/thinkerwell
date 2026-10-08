#!/usr/bin/env python3
"""Check Thinkerwell v2 lesson JSON files against SPEC.md.

Usage: check_lesson.py L01.json [L02.json ...]
Prints ERROR / WARN lines per lesson, reading stats, and (for several files)
a summary of where the correct answer sits.

Our World's lessons are in content/lessons/. Another course's are in
content/courses/<id>/lessons/ (src/content/courses.ts): their sections come
from that course's own course.json, they have no Base44 original (oldId is
null), and a lesson may have an activity (docs/content/DIGITAL_WORLD_SPEC.md
section 5.2). Its learner-facing words are held to the same level and
house style as the rest of the lesson, and a train-model activity's rounds
must give the results the lesson expects.
"""
import json, re, sys, os
from collections import Counter

try:
    from wordfreq import zipf_frequency
except Exception:  # pragma: no cover
    zipf_frequency = None

SECTIONS = {"history", "geography", "culture", "civics"}
CARD_TYPES = {"items", "timeline", "map", "cases", "sources", "table"}
VISUAL_TYPES = {"map", "timeline", "diagram", "illustration"}
FICTION_LABEL = "Fictional example created for this lesson."
SENSITIVE = [
    r"\byour (home )?country\b", r"\bwhere you (come|came) from\b", r"\byour journey\b",
    r"\bwhy you left\b", r"\byour (mother|father|parents|family's|family)\b", r"\byour religion\b",
    r"\bsalary\b", r"\bget a job\b", r"\bbank loan\b", r"\bcredit card\b", r"\bmortgage\b",
    r"\brefugees?\b", r"\bwar\b", r"\bkill", r"\bdied\b",
]
AMERICAN = [r"\bcolor", r"\bcenter\b", r"\borganiz", r"\burbaniz", r"\bpracticed\b", r"\bfavorite", r"\bneighbor", r"\bbehavior", r"\brecogniz", r"\bcivilizat", r"\bspecializ", r"\bharbor\b"]


def words(t):
    return re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", t)


def sentences(t):
    parts = [s for s in re.split(r"(?<=[.!?])\s+|\n+", t.strip()) if words(s)]
    return parts or [t]


def syllables(w):
    w = w.lower()
    w = re.sub(r"[^a-z]", "", w)
    if len(w) <= 3:
        return 1
    w = re.sub(r"(?:[^laeiouy]es|ed|[^laeiouy]e)$", "", w)
    w = re.sub(r"^y", "", w)
    return max(1, len(re.findall(r"[aeiouy]{1,2}", w)))


def fk(t):
    ws = words(t)
    if not ws:
        return 0.0, 0, 0.0, 0
    ss = sentences(t)
    syl = sum(syllables(w) for w in ws)
    grade = 0.39 * len(ws) / len(ss) + 11.8 * syl / len(ws) - 15.59
    longest = max(len(words(s)) for s in ss)
    return round(grade, 1), len(ws), round(len(ws) / len(ss), 1), longest


def has_word(text, forms):
    for f in forms:
        if re.search(r"\b" + re.escape(f) + r"\b", text, re.I):
            return True
    return False


def learner_strings(L):
    """Everything a learner reads outside the main passages."""
    out = []
    out.append(("warmUp", L.get("warmUp", {}).get("question", "")))
    for c in L.get("read", {}).get("checks", []):
        out.append(("check question", c.get("question", "")))
        for o in c.get("options", []) or []:
            out.append(("check feedback", o.get("feedback", "")))
    w = L.get("write", {})
    out.append(("write prompt", w.get("prompt", "")))
    out.append(("write example", w.get("example", "")))
    out.append(("watch summary", L.get("watch", {}).get("summary", "")))
    for p in L.get("reflect", {}).get("prompts", []):
        out.append(("reflect", p.get("text", "")))
    return out


def course_of(path):
    """(course id, its section ids) for a lesson file: Our World's, or another course's from its course.json."""
    full = os.path.abspath(path).replace(os.sep, "/")
    m = re.search(r"/content/courses/([^/]+)/lessons/[^/]+$", full)
    if not m:
        return None, SECTIONS
    course_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(path))), "course.json")
    try:
        sections = {s["id"] for s in json.load(open(course_file))["sections"]}
    except Exception:
        sections = set()
    return m.group(1), sections


def activity_strings(a):
    """Everything a learner reads in an activity (docs/content/DIGITAL_WORLD_SPEC.md 5.2), as (where, text)."""
    out = [("activity title", a.get("title", "")), ("activity instructions", a.get("instructions", ""))]
    t = a.get("type")

    def question(where, q):
        out.append((where, q.get("question", "")))
        for o in q.get("options") or []:
            out.append((where + " option", o.get("text", "")))
            out.append((where + " feedback", o.get("feedback", "")))

    if t == "sort":
        out += [("group", g.get("label", "")) for g in a.get("groups") or []]
        for i in a.get("items") or []:
            out += [("item", i.get("text", "")), ("item feedback", i.get("feedback", ""))]
    elif t == "train-model":
        out += [("label", l.get("label", "")) for l in a.get("labels") or []]
        for f in a.get("features") or []:
            out += [("feature", f.get("label", "")), ("feature scale", f.get("scale", ""))]
        out += [("card", c.get("description", "")) for c in (a.get("examples") or []) + (a.get("tests") or [])]
        for r in a.get("rounds") or []:
            out += [("round title", r.get("title", "")), ("round debrief", r.get("debrief", ""))]
    elif t == "compare-results":
        out.append(("measure", a.get("measure", "")))
        out += [("group", g.get("label", "")) for g in a.get("groups") or []]
        question("afterTap", a.get("afterTap") or {})
    elif t == "check-claim":
        c = a.get("claim") or {}
        out += [("claim from", c.get("from", "")), ("claim", c.get("text", ""))]
        out += [("askFirst", q) for q in a.get("askFirst") or []]
        for so in a.get("sources") or []:
            out += [("source", so.get("name", "")), ("source who", so.get("who", "")), ("source says", so.get("says", ""))]
        question("question", a.get("question") or {})
    elif t == "spot-signs":
        out += [("sign", g.get("label", "")) for g in a.get("signs") or []]
        out.append(("notASign", a.get("notASign", "")))
        for m in a.get("messages") or []:
            out.append(("message from", m.get("from", "")))
            for p in m.get("parts") or []:
                out += [("message part", p.get("text", "")), ("part feedback", p.get("feedback", "") or "")]
    elif t == "ask-tool":
        out.append(("toolLabel", a.get("toolLabel", "")))
        im = a.get("improve") or {}
        st = im.get("start") or {}
        out += [("prompt", st.get("prompt", "")), ("tool answer", st.get("answer", "")), ("improve question", im.get("question", ""))]
        for o in im.get("options") or []:
            out += [("prompt", o.get("prompt", "")), ("tool answer", o.get("answer", "")), ("improve feedback", o.get("feedback", ""))]
        ch = a.get("check") or {}
        ts = ch.get("trustedSource") or {}
        out += [("prompt", ch.get("prompt", "")), ("tool answer", ch.get("answer", "")), ("source", ts.get("name", "")), ("source says", ts.get("says", ""))]
        question("check", ch)
    elif t == "chart-check":
        out.append(("measure", a.get("measure", "")))
        out += [("bar", b.get("label", "")) for b in a.get("bars") or []]
        for v in a.get("views") or []:
            out += [("view", v.get("label", "")), ("view note", v.get("note", ""))]
        question("question", a.get("question") or {})
    elif t == "design-plan":
        out += [("problem", p.get("text", "")) for p in a.get("problems") or []]
        for st in a.get("steps") or []:
            out += [("step title", st.get("title", "")), ("step prompt", st.get("prompt", "")), ("starter", st.get("starter", "") or "")]
            for o in st.get("options") or []:
                out += [("step option", o.get("text", "")), ("step feedback", o.get("feedback", ""))]
            out += [("step question", q) for q in st.get("questions") or []]
    return [(w, x) for w, x in out if x]


def train_model_errors(a):
    """Each round's expected result against a nearest-neighbour model (k = 1, ties to the example added first)."""
    errs = []
    examples = {c["id"]: c for c in a.get("examples") or []}
    tests = {c["id"]: c for c in a.get("tests") or []}
    added = []
    for r in a.get("rounds") or []:
        added += [examples[i] for i in r.get("addExamples") or [] if i in examples]
        if not added:
            errs.append(f'activity round "{r.get("id")}" has no examples to learn from')
            continue
        wrong = []
        for tid in r.get("test") or []:
            t = tests.get(tid)
            if not t:
                errs.append(f'activity round "{r.get("id")}" tests "{tid}", which is not a test leaf')
                continue
            best = None
            for e in added:
                d = sum((x - y) ** 2 for x, y in zip(t["features"], e["features"])) ** 0.5
                if best is None or d < best[0]:
                    best = (d, e)
            if best[1]["gardenerSays"] != t["gardenerSays"]:
                wrong.append(tid)
        exp = r.get("expectedIfLabelledLikeTheGardener") or {}
        n = len(r.get("test") or [])
        if exp.get("of") != n or exp.get("right") != n - len(wrong) or exp.get("wrong") != wrong:
            errs.append(f'activity round "{r.get("id")}" expects {exp.get("right")} of {exp.get("of")}, but the model gets {n - len(wrong)} of {n} (wrong: {", ".join(wrong) or "none"})')
    return errs


def check(path):
    errs, warns, stats = [], [], {}
    try:
        L = json.load(open(path))
    except Exception as e:
        return [f"invalid JSON: {e}"], [], {}, None
    course, sections = course_of(path)

    def need(obj, key, where):
        if not isinstance(obj, dict) or key not in obj or obj[key] in (None, "", []):
            errs.append(f"missing {where}{key}")
            return False
        return True

    for k in ["id", "number", "section", "title", "essentialQuestion", "learningGoal",
              "warmUp", "evidence", "read", "write", "speak", "watch", "reflect", "sources",
              "changes"]:
        need(L, k, "")
    if course is None:
        need(L, "oldId", "")
    elif "oldId" not in L or L["oldId"] is not None:
        errs.append(f"oldId must be null: {course} lessons have no Base44 original")
    if course is not None and "activity" in L and not isinstance(L["activity"], dict):
        errs.append("activity must be an object (docs/content/DIGITAL_WORLD_SPEC.md 5.2)")
    if course is None and "activity" in L:
        errs.append("activity: Our World lessons have none")
    # Notes for teachers: sensitive topics in sensitiveNotes, everything else
    # in educatorNotes. Either list may be empty, but not both.
    for k in ("sensitiveNotes", "educatorNotes"):
        if not isinstance(L.get(k), list):
            errs.append(f"missing {k} (use [] if there are none)")
    notes = (L.get("sensitiveNotes") or []) + (L.get("educatorNotes") or [])
    if not notes:
        errs.append("sensitiveNotes and educatorNotes are both empty: add at least one note for teachers")
    elif len(notes) > 4:
        warns.append(f"notes for teachers: aim for 1–4 in all, found {len(notes)}")
    if "visual" not in L:
        errs.append("missing visual (use null only if a picture would not help)")
    if L.get("section") not in sections:
        errs.append(f"section must be one of {sorted(sections)}")
    if "nextLesson" in L:
        warns.append("nextLesson is derived automatically now; remove it")

    # evidence
    ev = L.get("evidence") or {}
    if ev:
        need(ev, "question", "evidence.")
        if ev.get("fictional") is True and ev.get("label") != FICTION_LABEL:
            errs.append(f'evidence.label must be "{FICTION_LABEL}" when fictional')
        if ev.get("fictional") not in (True, False):
            errs.append("evidence.fictional must be true or false")
        cards = ev.get("cards") or []
        if not cards:
            errs.append("evidence.cards is empty")
        for i, c in enumerate(cards):
            if c.get("type") not in CARD_TYPES:
                errs.append(f"evidence.cards[{i}].type must be one of {sorted(CARD_TYPES)}")
            if not c.get("title"):
                errs.append(f"evidence.cards[{i}].title missing")

    # read
    rd = L.get("read") or {}
    secs = rd.get("sections") or []
    if not 2 <= len(secs) <= 3:
        errs.append(f"read.sections: need 2 or 3, found {len(secs)}")
    text = "\n".join(s.get("text", "") for s in secs)
    simp = "\n".join(s.get("simpler", "") for s in secs)
    for i, s in enumerate(secs):
        for k in ("heading", "text", "simpler"):
            if not s.get(k):
                errs.append(f"read.sections[{i}].{k} missing")
    g_t, n_t, a_t, long_t = fk(text)
    g_s, n_s, a_s, long_s = fk(simp)
    stats.update(text_words=n_t, text_grade=g_t, text_avg=a_t, simple_words=n_s, simple_grade=g_s, simple_avg=a_s, simple_longest=long_s)
    if not 220 <= n_t <= 320:
        errs.append(f"text length {n_t} words (need 220–320)")
    if not 5.0 <= g_t <= 6.5:
        (errs if (g_t > 7.0 or g_t < 4.0) else warns).append(f"text grade {g_t} (target 5.0–6.5)")
    if a_t > 15:
        warns.append(f"text average sentence {a_t} words (target ≤15)")
    if not 130 <= n_s <= 220:
        errs.append(f"simpler length {n_s} words (need 130–220)")
    if g_s > 3.5:
        (errs if g_s > 4.0 else warns).append(f"simpler grade {g_s} (target ≤3.5)")
    if a_s > 9:
        (errs if a_s > 10 else warns).append(f"simpler average sentence {a_s} words (target ≤9)")
    if long_s > 14:
        warns.append(f"simpler has a sentence of {long_s} words (max 14)")
    if n_t and n_s and n_s > 0.85 * n_t:
        warns.append("simpler is nearly as long as text; make it genuinely simpler")
    # copied sentences
    ts = {s.strip().lower() for s in sentences(text)}
    copied = [s for s in sentences(simp) if s.strip().lower() in ts and len(words(s)) > 6]
    if len(copied) > 1:
        warns.append(f"{len(copied)} sentences copied word-for-word from text into simpler")

    # glossary
    gl = rd.get("glossary") or []
    if not 4 <= len(gl) <= 6:
        errs.append(f"glossary: need 4–6 words, found {len(gl)}")
    for gword in gl:
        w = gword.get("word", "")
        forms = [w] + list(gword.get("forms", []) or [])
        if not gword.get("definition") or not gword.get("example"):
            errs.append(f'glossary "{w}": needs definition and example')
        if len(words(gword.get("definition", ""))) > 14:
            warns.append(f'glossary "{w}": definition over 14 words')
        in_t = any(has_word(s.get("text", ""), forms) and has_word(s.get("simpler", ""), forms) for s in secs)
        if not in_t:
            where = []
            if not has_word(text, forms): where.append("text")
            if not has_word(simp, forms): where.append("simpler")
            errs.append(f'glossary "{w}" does not appear in both text and simpler of one section (missing from: {", ".join(where) or "same section"})')
        if re.search(r"\b" + re.escape(w.lower()) + r"\b", gword.get("definition", "").lower()):
            warns.append(f'glossary "{w}": definition uses the word itself')

    # rare words in simpler not in glossary
    if zipf_frequency:
        gforms = {f.lower() for g in gl for f in [g.get("word", "")] + list(g.get("forms", []) or [])}
        rare = sorted({w for w in words(simp) if w[0].islower() and w.lower() not in gforms and zipf_frequency(w.lower(), "en") < 3.3})
        if rare:
            warns.append("uncommon words in simpler (swap or explain): " + ", ".join(rare[:12]))
        stats["rare_simpler"] = len(rare)

    # checks
    positions = []
    ck = rd.get("checks") or []
    types = [c.get("type") for c in ck]
    if types != ["choice", "choice", "think"]:
        errs.append(f"read.checks must be [choice, choice, think], found {types}")
    longest_correct = 0
    for i, c in enumerate(ck):
        if c.get("type") == "choice":
            opts = c.get("options") or []
            if len(opts) != 3:
                errs.append(f"checks[{i}]: need 3 options, found {len(opts)}")
            corr = [j for j, o in enumerate(opts) if o.get("correct") is True]
            if len(corr) != 1:
                errs.append(f"checks[{i}]: need exactly one correct option")
            else:
                positions.append(corr[0])
                lens = [len(o.get("text", "")) for o in opts]
                if lens[corr[0]] == max(lens) and lens.count(max(lens)) == 1:
                    longest_correct += 1
            for j, o in enumerate(opts):
                fb = o.get("feedback", "")
                if not fb:
                    errs.append(f"checks[{i}].options[{j}] missing feedback")
                elif o.get("correct") and not fb.startswith("Yes."):
                    warns.append(f'checks[{i}] correct feedback should start "Yes."')
                elif not o.get("correct") and not fb.startswith("Not quite."):
                    warns.append(f'checks[{i}].options[{j}] wrong feedback should start "Not quite."')
            if re.search(r"\bnot\b", c.get("question", ""), re.I) and re.search(r"\bNOT\b|which .* not", c.get("question", ""), re.I):
                warns.append(f"checks[{i}]: avoid negative questions")
        elif c.get("type") == "think":
            if c.get("optional") is not True:
                errs.append(f"checks[{i}]: think question must be optional: true")
            if not c.get("placeholder"):
                warns.append(f"checks[{i}]: think question needs a placeholder")
    stats["correct_positions"] = positions
    stats["longest_is_correct"] = longest_correct

    # write
    wr = L.get("write") or {}
    for k in ("prompt", "sentenceStarters", "planningBoxes", "selfCheck", "example"):
        need(wr, k, "write.")
    if not 4 <= len(wr.get("sentenceStarters") or []) <= 5:
        errs.append("write.sentenceStarters: need 4–5")
    if not 3 <= len(wr.get("planningBoxes") or []) <= 4:
        errs.append("write.planningBoxes: need 3–4")
    sc = wr.get("selfCheck") or []
    if not isinstance(sc, list) or len(sc) != 3:
        errs.append("write.selfCheck: need a list of exactly 3")
    elif not all(s.startswith("I ") for s in sc):
        warns.append('write.selfCheck items should start "I "')
    n_ex = len(words(wr.get("example", "")))
    if not 60 <= n_ex <= 100:
        (errs if not 45 <= n_ex <= 115 else warns).append(f"write.example is {n_ex} words (need 60–100)")

    # speak
    sp = L.get("speak") or {}
    need(sp, "partnerTask", "speak.")
    need(sp, "independentTask", "speak.")

    # watch
    wa = L.get("watch") or {}
    for k in ("youtubeId", "title", "channel", "why", "beforeQuestion", "afterQuestion", "summary", "keyPoints"):
        need(wa, k, "watch.")
    if "durationSeconds" not in wa:
        errs.append("watch.durationSeconds missing (use null if unknown)")
    if "contentNote" not in wa or "replacementSuggestion" not in wa:
        errs.append("watch.contentNote and watch.replacementSuggestion must be present (null allowed)")
    n_sum = len(words(wa.get("summary", "")))
    if not 90 <= n_sum <= 140:
        (errs if not 75 <= n_sum <= 160 else warns).append(f"watch.summary is {n_sum} words (need 90–140)")
    if len(wa.get("keyPoints") or []) != 3:
        errs.append("watch.keyPoints: need exactly 3")
    yid = wa.get("youtubeId", "")
    if yid and not re.fullmatch(r"[A-Za-z0-9_-]{11}", yid):
        errs.append(f'watch.youtubeId "{yid}" is not an 11-character YouTube id')

    # reflect
    rf = L.get("reflect") or {}
    pr = rf.get("prompts") or []
    if [p.get("required") for p in pr] != [True, False]:
        errs.append("reflect.prompts: need exactly 2, first required true, second false")
    cm = rf.get("completionMessage", "")
    if not cm.startswith(f"You finished Lesson {L.get('number')}."):
        warns.append(f'reflect.completionMessage should start "You finished Lesson {L.get("number")}."')

    # visual
    vi = L.get("visual")
    if vi is not None:
        if vi.get("type") not in VISUAL_TYPES:
            errs.append(f"visual.type must be one of {sorted(VISUAL_TYPES)}")
        if not vi.get("description") or not vi.get("alt"):
            errs.append("visual needs description and alt")

    # sources
    for s in L.get("sources") or []:
        if not str(s.get("url", "")).startswith("http"):
            errs.append(f'source "{s.get("label")}" has no URL')
    if not 2 <= len(L.get("sources") or []) <= 5:
        warns.append("sources: aim for 2–4")

    # learner-facing strings level
    act = L.get("activity") if isinstance(L.get("activity"), dict) else None
    act_strings = activity_strings(act) if act else []
    if act:
        g_a = fk("\n".join(x for _, x in act_strings))[0]
        stats["activity_grade"] = g_a
        if act.get("type") == "train-model":
            errs += train_model_errors(act)
    for where, s in learner_strings(L) + act_strings:
        if len(words(s)) >= 12:
            g = fk(s)[0]
            if g > 5.5:
                warns.append(f"{where} grade {g} (target ≤5.5): {s[:70]}...")

    # sensitivity and spelling, learner-facing only
    blob_parts = [text, simp] + [s for _, s in learner_strings(L)]
    blob_parts += wr.get("sentenceStarters") or []
    blob_parts += [sp.get("partnerTask", ""), sp.get("independentTask", "")]
    blob_parts += [g.get("definition", "") + " " + g.get("example", "") for g in gl]
    blob_parts += [x for _, x in act_strings]
    blob = "\n".join(blob_parts)
    for pat in SENSITIVE:
        m = re.search(pat, blob, re.I)
        if m:
            warns.append(f'sensitive wording to double-check: "{m.group(0)}"')
    for pat in AMERICAN:
        m = re.search(pat, blob, re.I)
        if m:
            warns.append(f'American spelling? "{m.group(0)}" (use British)')
    if "!" in blob:
        warns.append("exclamation mark in learner text")

    return errs, warns, stats, L


def main(paths):
    all_pos, all_long, total_err = [], 0, 0
    for p in paths:
        errs, warns, stats, L = check(p)
        total_err += len(errs)
        name = os.path.basename(p)
        print(f"== {name}: {len(errs)} errors, {len(warns)} warnings")
        if stats:
            print(f"   text {stats.get('text_words')}w grade {stats.get('text_grade')} avg {stats.get('text_avg')} | "
                  f"simpler {stats.get('simple_words')}w grade {stats.get('simple_grade')} avg {stats.get('simple_avg')} longest {stats.get('simple_longest')} | "
                  f"correct at {[x + 1 for x in stats.get('correct_positions', [])]}"
                  + (f" | activity grade {stats['activity_grade']}" if "activity_grade" in stats else ""))
            all_pos += stats.get("correct_positions", [])
            all_long += stats.get("longest_is_correct", 0)
        for e in errs:
            print("   ERROR", e)
        for w in warns:
            print("   WARN ", w)
    if len(paths) > 1 and all_pos:
        c = Counter(x + 1 for x in all_pos)
        print(f"\nCorrect option position across files: {dict(sorted(c.items()))} "
              f"(longest option is the correct one in {all_long} of {len(all_pos)})")
    return 1 if total_err else 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1:]))
