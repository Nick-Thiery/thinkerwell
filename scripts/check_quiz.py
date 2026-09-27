#!/usr/bin/env python3
"""Check Thinkerwell section-check JSON files against QUIZ_SPEC.md.

Usage: check_quiz.py history.json [geography.json ...]
"""
import json, os, re, sys
from collections import Counter

sys.path.insert(0, os.path.dirname(__file__))
from check_lesson import fk, words, SENSITIVE, AMERICAN  # noqa: E402

SECTION_LESSONS = {"history": range(1, 10), "geography": range(10, 15), "culture": range(15, 20), "civics": range(20, 25)}
COUNTS = {"history": 12, "geography": 10, "culture": 10, "civics": 10}
SKILLS = {"vocabulary", "understand", "evidence", "apply"}


def check(path):
    errs, warns = [], []
    try:
        Q = json.load(open(path))
    except Exception as e:
        return [f"invalid JSON: {e}"], [], {}
    sec = Q.get("section")
    if sec not in SECTION_LESSONS:
        return [f"section must be one of {list(SECTION_LESSONS)}"], [], {}
    for k in ("title", "intro", "questions", "results"):
        if not Q.get(k):
            errs.append(f"missing {k}")
    qs = Q.get("questions") or []
    if len(qs) != COUNTS[sec]:
        errs.append(f"need {COUNTS[sec]} questions, found {len(qs)}")
    lessons = Counter(q.get("lesson") for q in qs)
    for n in SECTION_LESSONS[sec]:
        if lessons[n] == 0:
            errs.append(f"no question on Lesson {n}")
    for n in lessons:
        if n not in SECTION_LESSONS[sec]:
            errs.append(f"question on Lesson {n}, which is not in this section")
    skills = Counter(q.get("skill") for q in qs)
    for s, need in (("vocabulary", 2), ("understand", 3), ("evidence", 2), ("apply", 2)):
        if skills[s] < need:
            warns.append(f"only {skills[s]} {s} questions (aim for at least {need})")
    ids = [q.get("id") for q in qs]
    if len(set(ids)) != len(ids):
        errs.append("question ids are not unique")
    positions, longest = [], 0
    blob = [Q.get("intro", "")] + list((Q.get("results") or {}).values())
    for i, q in enumerate(qs):
        where = q.get("id") or f"questions[{i}]"
        if q.get("skill") not in SKILLS:
            errs.append(f"{where}: skill must be one of {sorted(SKILLS)}")
        if not q.get("question"):
            errs.append(f"{where}: missing question")
        st = q.get("stimulus")
        if q.get("skill") == "apply" and not st:
            warns.append(f"{where}: apply questions usually need a stimulus")
        if st:
            if st.get("type") not in ("text", "items") or not st.get("title"):
                errs.append(f"{where}: stimulus needs type text|items and a title")
            body = st.get("body", "") if st.get("type") == "text" else " ".join(st.get("items") or [])
            n = len(words(body))
            if st.get("type") == "text" and not 25 <= n <= 60:
                warns.append(f"{where}: stimulus body is {n} words (aim 25–60)")
            blob.append(body)
            if fk(body)[0] > 5.5 and n >= 12:
                warns.append(f"{where}: stimulus grade {fk(body)[0]} (target ≤5.5)")
        opts = q.get("options") or []
        if len(opts) != 3:
            errs.append(f"{where}: need 3 options")
        corr = [j for j, o in enumerate(opts) if o.get("correct") is True]
        if len(corr) != 1:
            errs.append(f"{where}: need exactly one correct option")
        else:
            positions.append(corr[0])
            lens = [len(o.get("text", "")) for o in opts]
            if lens[corr[0]] == max(lens) and lens.count(max(lens)) == 1:
                longest += 1
        if re.search(r"\bNOT\b|all of the above|none of the above", q.get("question", "") + " ".join(o.get("text", "") for o in opts)):
            errs.append(f"{where}: no negatives or all/none of the above")
        for j, o in enumerate(opts):
            fb = o.get("feedback", "")
            if o.get("correct") and not fb.startswith("Yes."):
                errs.append(f'{where}: correct feedback must start "Yes."')
            if not o.get("correct"):
                if not fb.startswith("Not quite."):
                    errs.append(f'{where}: option {j + 1} feedback must start "Not quite."')
                if not re.search(r"Look back at Lessons? \d+", fb):
                    warns.append(f'{where}: option {j + 1} feedback should end "Look back at Lesson N."')
            blob.append(o.get("text", "") + " " + fb)
        blob.append(q.get("question", ""))
        for s in [q.get("question", "")] + [o.get("feedback", "") for o in opts]:
            if len(words(s)) >= 12 and fk(s)[0] > 5.5:
                warns.append(f"{where}: grade {fk(s)[0]} (target ≤5.5): {s[:60]}...")
    c = Counter(positions)
    if positions and (max(c.values()) - min(c.get(k, 0) for k in range(3))) > 2:
        warns.append(f"correct positions uneven: {dict(sorted((k + 1, v) for k, v in c.items()))}")
    if positions and longest > len(positions) / 3:
        warns.append(f"correct option is the longest in {longest} of {len(positions)}")
    text = "\n".join(blob)
    for pat in SENSITIVE:
        m = re.search(pat, text, re.I)
        if m:
            warns.append(f'sensitive wording to double-check: "{m.group(0)}"')
    for pat in AMERICAN:
        m = re.search(pat, text, re.I)
        if m:
            warns.append(f'American spelling? "{m.group(0)}"')
    if "!" in text:
        warns.append("exclamation mark")
    return errs, warns, {"positions": [p + 1 for p in positions], "skills": dict(skills), "lessons": dict(sorted(lessons.items()))}


def main(paths):
    bad = 0
    for p in paths:
        e, w, s = check(p)
        bad += len(e)
        print(f"== {os.path.basename(p)}: {len(e)} errors, {len(w)} warnings | {s}")
        for x in e:
            print("   ERROR", x)
        for x in w:
            print("   WARN ", x)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]) if len(sys.argv) > 1 else 2)
