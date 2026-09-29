#!/usr/bin/env python3
"""Check translated content against the English files.

Usage: check_translation.py id [L01 L02 ...]

Checks content/<lang>/course.json, lessons/*.json, quizzes/*.json and visuals/*.svg:
- the shape matches the English file and every learner-facing string is
  translated (see scripts/i18n/translatable.py for what is and isn't);
- each glossary word (or one of its forms) appears in the standard AND the
  simpler text of at least one reading section, as in English;
- the simpler text is clearly simpler than the standard text;
- house style for the language (for Indonesian: "kamu", never "Anda").

Prints ERROR / WARN lines per file. Exits 1 if there are errors.
"""
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "i18n"))
import translatable as T  # noqa: E402

try:
    from wordfreq import zipf_frequency
except Exception:  # pragma: no cover
    zipf_frequency = None

# House style per language. Only Indonesian so far.
STYLE = {
    "id": {
        "correct_lead": "Benar.",
        "retry_lead": "Belum tepat.",
        "completion": "Kamu sudah menyelesaikan Pelajaran {n}.",
        "self_check_start": "Aku ",
        # Formal "you" and "please": the course speaks to the learner as "kamu".
        "forbidden": [r"\bAnda\b", r"\bsilakan\b", r"\btolong\b", r"\bengkau\b"],
    },
}

WORD = r"[^\W\d_]+(?:-[^\W\d_]+)*"


def words(t):
    return re.findall(WORD, t)


def sentences(t):
    parts = [s for s in re.split(r"(?<=[.!?])\s+|\n+", t.strip()) if words(s)]
    return parts or [t]


def has_form(text, forms):
    for f in forms:
        if re.search(r"(?<![\w-])" + re.escape(f) + r"(?![\w])", text, re.I):
            return True
    return False


def numbers(t):
    """Numbers as digits only (so 1,000 and 1.000 compare equal)."""
    return {re.sub(r"\D", "", n) for n in re.findall(r"\d[\d.,:]*\d|\d", t)}


def english_names(lesson):
    """Likely names in the English lesson: capitalised words mid-sentence that
    are rare in English (Riverstone, Tallgrass, Amara ...)."""
    if not zipf_frequency:
        return set()
    blob = " ".join(v for _, v in T.translatable(lesson) if isinstance(v, str))
    out = set()
    for m in re.finditer(r"(?<=[a-z,;] )([A-Z][a-z]{3,})", blob):
        w = m.group(1)
        if zipf_frequency(w.lower(), "en") < 2.5:
            out.add(w)
    return out


def check_lesson(lang, eng_path, tr_path):
    errs, warns, stats = [], [], {}
    style = STYLE[lang]
    if not os.path.exists(tr_path):
        return [f"missing {os.path.relpath(tr_path, T.ROOT)}"], [], {}
    E = T.load(eng_path)
    try:
        R = T.load(tr_path)
    except Exception as e:  # noqa: BLE001
        return [f"invalid JSON: {e}"], [], {}
    errs += T.problems(E, R)
    errs += [f"{p}: not translated" for p in T.missing(E, R)]
    if errs:
        return errs, warns, stats
    L = T.merge(E, R)

    # Left in English by mistake (longer strings only: names can stay).
    for path, value in T.translatable(E):
        tr = T.get_path(R, path)
        if isinstance(value, str) and tr == value and len(words(value)) > 3:
            errs.append(f"{T.path_str(path)}: still the same as English")

    name = os.path.basename(eng_path)[:-5]
    warns += stale(lang, name, [(T.path_str(p), v) for p, v in T.translatable(E)])

    secs = L["read"]["sections"]
    text = "\n".join(s["text"] for s in secs)
    simp = "\n".join(s["simpler"] for s in secs)

    # Simpler must be simpler.
    n_t, n_s = len(words(text)), len(words(simp))
    avg_t = n_t / len(sentences(text))
    avg_s = n_s / len(sentences(simp))
    long_s = max(len(words(s)) for s in sentences(simp))
    wl_t = sum(len(w) for w in words(text)) / max(n_t, 1)
    wl_s = sum(len(w) for w in words(simp)) / max(n_s, 1)
    stats.update(text_words=n_t, simple_words=n_s, text_avg=round(avg_t, 1), simple_avg=round(avg_s, 1),
                 simple_longest=long_s)
    if n_s > 0.85 * n_t:
        errs.append(f"simpler has {n_s} words, standard {n_t}: simpler must be clearly shorter")
    if avg_s >= avg_t:
        errs.append(f"simpler sentences average {avg_s:.1f} words, standard {avg_t:.1f}: simpler must use shorter sentences")
    if avg_s > 10:
        warns.append(f"simpler sentences average {avg_s:.1f} words (aim for 9 or fewer)")
    if long_s > 15:
        warns.append(f"simpler has a sentence of {long_s} words (aim for 14 or fewer)")
    if wl_s > wl_t + 0.2:
        warns.append(f"simpler uses longer words on average ({wl_s:.1f} letters) than standard ({wl_t:.1f})")
    for i, s in enumerate(secs):
        a, b = len(words(s["text"])), len(words(s["simpler"]))
        if b > a:
            warns.append(f"read.sections.{i}: simpler ({b} words) is longer than standard ({a})")

    # Glossary words appear in both versions of one section.
    gl = L["read"]["glossary"]
    gforms = set()
    for i, g in enumerate(gl):
        forms = [g["word"]] + list(g.get("forms") or [])
        gforms |= {f.lower() for f in forms}
        if not any(has_form(s["text"], forms) and has_form(s["simpler"], forms) for s in secs):
            where = [n for n, t in (("standard", text), ("simpler", simp)) if not has_form(t, forms)]
            errs.append(f'read.glossary.{i} "{g["word"]}" is not in both the standard and the simpler text of one section '
                        f'(missing from: {", ".join(where) or "the same section"}); add a form or reword')
        if re.search(r"(?<!\w)" + re.escape(g["word"].lower()) + r"(?!\w)", g["definition"].lower()):
            warns.append(f'read.glossary.{i} "{g["word"]}": definition uses the word itself')

    # Quick checks keep their shape and tone.
    for i, c in enumerate(L["read"]["checks"]):
        if c["type"] != "choice":
            continue
        texts = [o["text"].strip().lower() for o in c["options"]]
        if len(set(texts)) != len(texts):
            errs.append(f"read.checks.{i}: two options have the same text")
        for j, o in enumerate(c["options"]):
            lead = style["correct_lead"] if o["correct"] else style["retry_lead"]
            if not o["feedback"].startswith(lead):
                warns.append(f'read.checks.{i}.options.{j}.feedback should start "{lead}"')

    # Learner voice and closing message.
    for i, s in enumerate(L["write"]["selfCheck"]):
        if not s.startswith(style["self_check_start"]):
            warns.append(f'write.selfCheck.{i} should start "{style["self_check_start"].strip()}"')
    done = style["completion"].format(n=L["number"])
    if not L["reflect"]["completionMessage"].startswith(done):
        warns.append(f'reflect.completionMessage should start "{done}"')
    for i, (e, t) in enumerate(zip(E["write"]["sentenceStarters"], L["write"]["sentenceStarters"])):
        for mark in ("...", "___"):
            if e.rstrip().endswith(mark) and not t.rstrip().endswith(mark):
                warns.append(f'write.sentenceStarters.{i} should end with "{mark}" like the English')

    # Style over everything learners read.
    blob = "\n".join(v for _, v in T.translatable(L) if isinstance(v, str))
    for pat in style["forbidden"]:
        m = re.search(pat, blob)
        if m:
            errs.append(f'uses "{m.group(0)}": speak to the learner as "kamu", without "please"')
    if "!" in blob:
        warns.append("exclamation mark in learner text")

    # Numbers and names survive.
    for path, value in T.translatable(E):
        tr = T.get_path(R, path)
        if isinstance(value, str) and isinstance(tr, str):
            lost = numbers(value) - numbers(tr)
            if lost:
                warns.append(f"{T.path_str(path)}: number {', '.join(sorted(lost))} is missing")
    for name in sorted(english_names(E)):
        if name not in blob:
            warns.append(f'name "{name}" from the English lesson does not appear; names stay as they are')

    # Uncommon words in the simpler text.
    if zipf_frequency:
        rare = sorted({w for w in words(simp) if w[0].islower() and w.lower() not in gforms
                       and "-" not in w and zipf_frequency(w.lower(), lang) < 2.5})
        if rare:
            warns.append("uncommon words in simpler (swap or explain): " + ", ".join(rare[:12]))

    return errs, warns, stats


def check_quiz(lang, eng_path, tr_path):
    """A section check: shape, completeness, verdicts and style, like a lesson's quick checks."""
    errs, warns = [], []
    style = STYLE[lang]
    if not os.path.exists(tr_path):
        return [f"missing {os.path.relpath(tr_path, T.ROOT)}"], []
    E, R = T.load(eng_path), T.load(tr_path)
    errs += T.problems(E, R) + [f"{p}: not translated" for p in T.missing(E, R)]
    if errs:
        return errs, warns
    Q = T.merge(E, R)
    for path, value in T.translatable(E):
        tr = T.get_path(R, path)
        if isinstance(value, str) and tr == value and len(words(value)) > 3:
            errs.append(f"{T.path_str(path)}: still the same as English")
        if isinstance(value, str) and isinstance(tr, str):
            lost = numbers(value) - numbers(tr)
            if lost:
                warns.append(f"{T.path_str(path)}: number {', '.join(sorted(lost))} is missing")
    for i, q in enumerate(Q["questions"]):
        texts = [o["text"].strip().lower() for o in q["options"]]
        if len(set(texts)) != len(texts):
            errs.append(f"questions.{i}: two options have the same text")
        lens = [len(o["text"]) for o in q["options"]]
        right = next(j for j, o in enumerate(q["options"]) if o["correct"])
        if lens[right] == max(lens) and lens.count(max(lens)) == 1 and max(lens) > 1.2 * sorted(lens)[1]:
            warns.append(f"questions.{i}: the correct option is clearly the longest")
        for j, o in enumerate(q["options"]):
            lead = style["correct_lead"] if o["correct"] else style["retry_lead"]
            if not o["feedback"].startswith(lead):
                warns.append(f'questions.{i}.options.{j}.feedback should start "{lead}"')
    blob = "\n".join(v for _, v in T.translatable(Q) if isinstance(v, str))
    for pat in style["forbidden"]:
        m = re.search(pat, blob)
        if m:
            errs.append(f'uses "{m.group(0)}": speak to the learner as "kamu", without "please"')
    name = os.path.basename(eng_path)[:-5]
    warns += stale(lang, f"quiz-{name}", [(T.path_str(p), v) for p, v in T.translatable(E)])
    return errs, warns


def check_visual(lang, eng_svg, tr_svg, lesson_tr):
    """A translated picture: it exists, parses, says the translated alt text, and has no English words left."""
    errs, warns = [], []
    rel = os.path.relpath(tr_svg, T.ROOT)
    if not os.path.exists(tr_svg):
        return [f"{rel} is missing"], []
    try:
        E, R = T.svg_texts(eng_svg), T.svg_texts(tr_svg)
    except Exception as e:  # noqa: BLE001
        return [f"{rel}: not valid SVG ({e})"], []
    alt = ((lesson_tr or {}).get("visual") or {}).get("alt")
    if alt and R["desc"] != alt:
        warns.append(f"{rel}: <desc> is not the lesson's translated visual.alt")
    if len(R["text"]) < len(E["text"]):
        warns.append(f"{rel}: has {len(R['text'])} labels, the English has {len(E['text'])}")
    left = [t for t in R["text"] if t in E["text"] and len(words(t)) > 1 and zipf_frequency and
            any(zipf_frequency(w.lower(), "en") > 4 and zipf_frequency(w.lower(), lang) < 3 for w in words(t))]
    if left:
        warns.append(f"{rel}: still English: {', '.join(left[:5])}")
    return errs, warns


def check_consistency(lang, only):
    """The same short English string (a planning box, "Something else") should
    read the same in every lesson. Returns warnings."""
    seen = {}
    for eng_path, tr_path in T.lesson_files(lang):
        name = os.path.basename(eng_path)[:-5]
        if (only and name not in only) or not os.path.exists(tr_path):
            continue
        E, R = T.load(eng_path), T.load(tr_path)
        for path, value in T.translatable(E):
            tr = T.get_path(R, path)
            if isinstance(value, str) and isinstance(tr, str) and len(words(value)) <= 8:
                seen.setdefault(value, {}).setdefault(tr, []).append(f"{name} {T.path_str(path)}")
    warns = []
    for english, versions in sorted(seen.items()):
        if len(versions) > 1:
            parts = "; ".join(f'"{tr}" ({len(where)}x, e.g. {where[0]})' for tr, where in
                              sorted(versions.items(), key=lambda kv: -len(kv[1])))
            warns.append(f'"{english}" is translated {len(versions)} ways: {parts}')
    return warns


def stale(lang, name, english_strings):
    """Strings whose English changed after they were translated: the notes
    file keeps the English each translation was made from ("source")."""
    path = os.path.join(T.ROOT, "docs", "translation", lang, "notes", f"{name}.json")
    if not os.path.exists(path):
        return []
    notes = T.load(path)
    out = []
    for key, english in english_strings:
        source = notes.get(key, {}).get("source")
        if source is not None and source != english:
            out.append(f"{key}: the English changed after this was translated; update the translation, "
                       f"then its \"source\" in docs/translation/{lang}/notes/{name}.json")
    return out


def check_course(lang):
    eng_path, tr_path = T.course_files(lang)
    if not os.path.exists(tr_path):
        return [f"missing {os.path.relpath(tr_path, T.ROOT)}"], []
    E, R = T.load(eng_path), T.load(tr_path)
    errs = T.problems(E, R) + [f"{p}: not translated" for p in T.missing(E, R)]
    warns = stale(lang, "course", [(T.path_str(p), v) for p, v in T.translatable(E)])
    return errs, warns


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    lang, only = argv[0], set(argv[1:])
    if lang not in STYLE:
        print(f"No house style for {lang!r} yet; add it to STYLE.")
        return 2
    total = 0
    errs, warns = check_course(lang)
    total += len(errs)
    print(f"== {lang}/course.json: {len(errs)} errors, {len(warns)} warnings")
    for e in errs:
        print("   ERROR", e)
    for w in warns:
        print("   WARN ", w)
    ui_en, _ = T.messages_files(lang)
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "i18n"))
    import review_sheet as S
    ui_stale = stale(lang, "ui", S.ui_messages(T.load(ui_en)))
    print(f"== {lang}: interface messages: {len(ui_stale)} warnings")
    for w in ui_stale:
        print("   WARN ", w)
    for eng_path, tr_path in T.lesson_files(lang):
        name = os.path.basename(eng_path)[:-5]
        if only and name not in only:
            continue
        errs, warns, stats = check_lesson(lang, eng_path, tr_path)
        total += len(errs)
        print(f"== {lang}/{name}: {len(errs)} errors, {len(warns)} warnings")
        if stats:
            print(f"   standard {stats['text_words']}w avg {stats['text_avg']} | simpler {stats['simple_words']}w "
                  f"avg {stats['simple_avg']} longest {stats['simple_longest']}")
        for e in errs:
            print("   ERROR", e)
        for w in warns:
            print("   WARN ", w)
    for eng_path, tr_path in T.quiz_files(lang):
        name = os.path.basename(eng_path)[:-5]
        if only and f"quiz-{name}" not in only:
            continue
        errs, warns = check_quiz(lang, eng_path, tr_path)
        total += len(errs)
        print(f"== {lang}/quizzes/{name}: {len(errs)} errors, {len(warns)} warnings")
        for e in errs:
            print("   ERROR", e)
        for w in warns:
            print("   WARN ", w)
    for eng_path, tr_path in T.lesson_files(lang):
        name = os.path.basename(eng_path)[:-5]
        if only and name not in only:
            continue
        src = ((T.load(eng_path).get("visual") or {}).get("src"))
        if not src:
            continue
        lesson_tr = T.load(tr_path) if os.path.exists(tr_path) else None
        errs, warns = check_visual(lang, os.path.join(T.ROOT, "content", src), os.path.join(T.ROOT, "content", lang, src), lesson_tr)
        total += len(errs)
        if errs or warns:
            print(f"== {lang}/{src}: {len(errs)} errors, {len(warns)} warnings")
        for e in errs:
            print("   ERROR", e)
        for w in warns:
            print("   WARN ", w)
    warns = check_consistency(lang, only)
    print(f"== {lang}: consistency across lessons: {len(warns)} warnings")
    for w in warns:
        print("   WARN ", w)
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
