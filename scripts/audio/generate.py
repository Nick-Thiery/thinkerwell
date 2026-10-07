#!/usr/bin/env python3
"""Records Listen's audio: every piece of text Listen reads, in English and
Indonesian, both reading levels, from the list tools/audio/export.ts makes
(the app's own sentences). `npm run audio:generate` runs both steps; see
scripts/audio/README.md and docs/notes/recorded-audio.md.

  python3 scripts/audio/generate.py EXPORT.json [--lang en] [--synth-only]

1. Synthesis. Each piece is spoken on its own (English: Kokoro-82M, voice
   af_heart, speed 0.92; Indonesian: Meta's MMS-TTS, facebook/mms-tts-ind)
   and kept in .audio-cache/<lang>/ under a hash of the voice and what it
   was given to say. A piece already there isn't spoken again, so a stopped
   run carries on where it was, and a lesson edit records only what changed.
2. Assembly. Each section (one lesson, one reading level, one part) becomes
   one MP3 in public/audio/<lang>/: the pieces trimmed of silence and joined
   with pauses (longer after the heading and between paragraphs), its name
   ending in a hash of its bytes. Each piece's start and end go into the
   language's timings file (public/audio/<lang>/timings-<hash>.json), which
   Listen highlights from, and into tools/audio/manifest.json, which
   `npm run check:audio` compares with the lessons. src/audio/recordings.json
   tells the app where each language's timings are. Files no section uses
   any more are deleted.

Progress goes to stdout, one line per piece, with an estimate of the time
left. Run it in the background with nohup for a whole language.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import subprocess
import sys
import time
import unicodedata
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / ".audio-cache"
PUBLIC = ROOT / "public" / "audio"
MANIFEST = ROOT / "tools" / "audio" / "manifest.json"
INDEX = ROOT / "src" / "audio" / "recordings.json"

# The voices the founders approved (docs/notes/recorded-audio.md). Changing
# any of these records everything in that language again.
VOICES = {
    "en": {
        "engine": "kokoro",
        "model": "hexgrad/Kokoro-82M",
        "licence": "Apache-2.0",
        "voice": "af_heart",
        "langCode": "a",
        "speed": 0.92,
        "sampleRate": 24000,
    },
    "id": {
        "engine": "mms-tts",
        "model": "facebook/mms-tts-ind",
        "licence": "CC-BY-NC-4.0",
        "seed": 1,
        "sampleRate": 16000,
    },
}

# Pauses, in seconds, after each kind of piece (tools/audio/utterances.ts, PieceGap).
GAPS = {"heading": 0.75, "paragraph": 0.6, "sentence": 0.35, "end": 0.3}
LEAD_IN = 0.1
# Speech-quality MP3: every browser plays it (iPad Safari and old Android Chrome too). Mono, constant bit rate.
BITRATE = "32k"
ENCODING = f"mp3 {BITRATE}bit/s CBR mono, LAME"
# Loudness: each section is brought to about -20 dBFS (RMS of its speech), never peaking above -1 dBFS.
TARGET_RMS = 10 ** (-20 / 20)
PEAK = 10 ** (-1 / 20)
# A piece is trimmed to its speech: from 25 ms before the first sound above -45 dBFS to 60 ms after the last.
TRIM_DB = -45
TRIM_BEFORE = 0.025
TRIM_AFTER = 0.06

# Characters the MMS tokenizer drops that are only punctuation (anything else dropped is an error).
MMS_DROPPABLE = set(".,?!;:\"“”‘’()…")


def log(message: str) -> None:
    print(message, flush=True)


def voice_id(lang: str) -> str:
    return json.dumps(VOICES[lang], sort_keys=True)


def cache_path(lang: str, speak: str) -> Path:
    key = hashlib.sha1(f"{voice_id(lang)}\n{speak}".encode("utf-8")).hexdigest()[:24]
    return CACHE / lang / key[:2] / f"{key}.wav"


class Kokoro:
    def __init__(self) -> None:
        from kokoro import KPipeline

        v = VOICES["en"]
        self.pipe = KPipeline(lang_code=v["langCode"], repo_id=v["model"])
        self.rate = v["sampleRate"]

    def say(self, text: str) -> np.ndarray:
        import torch

        v = VOICES["en"]
        torch.manual_seed(int(hashlib.sha1(text.encode()).hexdigest()[:8], 16))
        chunks = [r.audio.numpy() for r in self.pipe(text, voice=v["voice"], speed=v["speed"]) if r.audio is not None]
        if not chunks:
            raise RuntimeError(f"Kokoro said nothing for {text!r}")
        return np.concatenate(chunks).astype(np.float32)


class Mms:
    def __init__(self) -> None:
        from transformers import AutoTokenizer, VitsModel

        v = VOICES["id"]
        self.model = VitsModel.from_pretrained(v["model"])
        self.model.eval()
        self.tokenizer = AutoTokenizer.from_pretrained(v["model"])
        self.vocab = set(self.tokenizer.get_vocab())
        self.rate = self.model.config.sampling_rate
        assert self.rate == v["sampleRate"], self.rate

    def check(self, text: str) -> None:
        """Fails if the tokenizer would drop anything but punctuation (tools/audio/normalise.ts should have written it out)."""
        dropped = {ch for ch in text.lower() if ch not in self.vocab and ch not in MMS_DROPPABLE}
        if dropped:
            raise ValueError(f"MMS can't say {sorted(dropped)} in {text!r}: write it out in tools/audio/normalise.ts")

    def say(self, text: str) -> np.ndarray:
        import torch

        self.check(text)
        inputs = self.tokenizer(text, return_tensors="pt")
        torch.manual_seed(VOICES["id"]["seed"])
        with torch.no_grad():
            wave = self.model(**inputs).waveform[0].numpy()
        return wave.astype(np.float32)


def engine_for(lang: str):
    return Kokoro() if lang == "en" else Mms()


def synthesise(lang: str, sections: list[dict]) -> None:
    todo: dict[str, Path] = {}
    for section in sections:
        for piece in section["pieces"]:
            if piece["speak"]:
                path = cache_path(lang, piece["speak"])
                if not path.exists():
                    todo[piece["speak"]] = path
    total = len({p["speak"] for s in sections for p in s["pieces"] if p["speak"]})
    log(f"[{lang}] {total} different pieces, {total - len(todo)} already recorded, {len(todo)} to record")
    if not todo:
        return
    engine = engine_for(lang)
    started = time.time()
    spoken_chars = 0
    left_chars = sum(len(t) for t in todo)
    for i, (speak, path) in enumerate(todo.items(), 1):
        audio = engine.say(speak)
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp.wav")
        sf.write(tmp, audio, engine.rate, subtype="PCM_16")
        os.replace(tmp, path)
        spoken_chars += len(speak)
        elapsed = time.time() - started
        eta = elapsed / spoken_chars * (left_chars - spoken_chars)
        log(
            f"[{lang}] {i}/{len(todo)} ({100 * i / len(todo):.1f}%) {len(audio) / engine.rate:5.1f}s audio,"
            f" {elapsed / 60:.1f} min so far, about {eta / 60:.0f} min left: {speak[:60]}"
        )


def trim(audio: np.ndarray, rate: int) -> np.ndarray:
    threshold = 10 ** (TRIM_DB / 20) * max(float(np.abs(audio).max()), 1e-6)
    loud = np.flatnonzero(np.abs(audio) > threshold)
    if loud.size == 0:
        return audio[:0]
    start = max(0, loud[0] - int(TRIM_BEFORE * rate))
    end = min(len(audio), loud[-1] + int(TRIM_AFTER * rate))
    return audio[start:end]


def rms(audio: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(audio, dtype=np.float64)))) if audio.size else 0.0


def encode_mp3(audio: np.ndarray, rate: int) -> bytes:
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes()
    done = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "s16le", "-ar", str(rate), "-ac", "1", "-i", "pipe:0",
            "-c:a", "libmp3lame", "-b:a", BITRATE, "-ac", "1", "-map_metadata", "-1", "-id3v2_version", "0",
            "-fflags", "+bitexact", "-flags:a", "+bitexact", "-f", "mp3", "pipe:1",
        ],
        input=pcm,
        capture_output=True,
        check=True,
    )
    return done.stdout


def slug(key: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFKD", key).lower()).strip("-")


def assemble(lang: str, sections: list[dict], normaliser: int) -> dict:
    rate = VOICES[lang]["sampleRate"]
    out_dir = PUBLIC / lang
    out_dir.mkdir(parents=True, exist_ok=True)
    entries: dict[str, dict] = {}
    timings: dict[str, dict] = {}
    warnings: list[str] = []
    for n, section in enumerate(sections, 1):
        parts: list[np.ndarray] = []
        times: list = []
        at = LEAD_IN
        parts.append(np.zeros(int(LEAD_IN * rate), np.float32))
        speech: list[np.ndarray] = []
        for piece in section["pieces"]:
            if not piece["speak"]:
                times.append(None)
                continue
            raw, file_rate = sf.read(cache_path(lang, piece["speak"]), dtype="float32")
            assert file_rate == rate, (file_rate, rate)
            said = trim(raw, rate)
            seconds = len(said) / rate
            per_char = seconds / max(len(piece["speak"]), 1)
            if seconds < 0.3 or rms(said) < 0.01 or not (0.02 < per_char < 0.2):
                warnings.append(f"{section['key']}: {seconds:.2f}s, RMS {rms(said):.3f} for {piece['speak']!r}")
            times.append([round(at, 3), round(at + seconds, 3)])
            parts.append(said)
            speech.append(said)
            gap = GAPS[piece["after"]]
            parts.append(np.zeros(int(gap * rate), np.float32))
            at += seconds + int(gap * rate) / rate
        audio = np.concatenate(parts)
        loudness = rms(np.concatenate(speech)) if speech else 0.0
        gain = TARGET_RMS / loudness if loudness else 1.0
        peak = float(np.abs(audio).max()) if audio.size else 0.0
        if peak * gain > PEAK:
            gain = PEAK / peak
        mp3 = encode_mp3(audio * gain, rate)
        digest = hashlib.sha256(mp3).hexdigest()[:10]
        name = f"{slug(section['key'])}.{digest}.mp3"
        target = out_dir / name
        if not target.exists():
            target.write_bytes(mp3)
        entries[section["key"]] = {
            "label": section["label"],
            "hash": section["hash"],
            "file": name,
            "bytes": len(mp3),
            "seconds": round(len(audio) / rate, 2),
            "pieces": [
                {"hash": p["hash"], **({"speak": p["speak"]} if p["speak"] != p["text"] else {}), "time": t}
                for p, t in zip(section["pieces"], times)
            ],
        }
        timings[section["key"]] = {"f": name, "h": section["hash"], "b": len(mp3), "t": [t if t else 0 for t in times]}
        if n % 20 == 0 or n == len(sections):
            log(f"[{lang}] assembled {n}/{len(sections)} sections")

    timings_json = json.dumps({"lang": lang, "sections": timings}, separators=(",", ":"), sort_keys=True).encode()
    timings_name = f"timings.{hashlib.sha256(timings_json).hexdigest()[:10]}.json"
    (out_dir / timings_name).write_bytes(timings_json)
    keep = {e["file"] for e in entries.values()} | {timings_name}
    for old in out_dir.iterdir():
        if old.name not in keep:
            old.unlink()
            log(f"[{lang}] deleted {old.name} (no section uses it now)")
    for warning in warnings:
        log(f"[{lang}] CHECK: {warning}")
    return {
        "voice": VOICES[lang],
        "normaliser": normaliser,
        "encoding": ENCODING,
        "timings": f"audio/{lang}/{timings_name}",
        "files": len(entries),
        "bytes": sum(e["bytes"] for e in entries.values()),
        "seconds": round(sum(e["seconds"] for e in entries.values()), 1),
        "sections": entries,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("export", help="the JSON tools/audio/export.ts wrote")
    parser.add_argument("--lang", action="append", help="only this language (en, id); may be given more than once")
    parser.add_argument("--synth-only", action="store_true", help="record the pieces, but don't make the files")
    parser.add_argument("--threads", type=int, default=int(os.environ.get("AUDIO_THREADS", "0") or 0), help="torch threads (0: torch's default)")
    args = parser.parse_args()

    if args.threads:
        import torch

        torch.set_num_threads(args.threads)
    export = json.loads(Path(args.export).read_text("utf-8"))
    languages = [l for l in export["languages"] if not args.lang or l["lang"] in args.lang]
    for language in languages:
        if language["lang"] not in VOICES:
            log(f"No voice is set for {language['lang']} in scripts/audio/generate.py (VOICES).")
            return 1
        synthesise(language["lang"], language["sections"])
    if args.synth_only:
        return 0

    manifest = json.loads(MANIFEST.read_text("utf-8")) if MANIFEST.exists() else {}
    recorded = manifest.get("languages", {})
    for language in languages:
        recorded[language["lang"]] = assemble(language["lang"], language["sections"], language["normaliser"])
    # A language no longer recorded (not in the export) goes from the manifest and the site.
    exported = {l["lang"] for l in export["languages"]}
    for lang in [l for l in recorded if l not in exported]:
        del recorded[lang]
    manifest = {
        "about": "Made by npm run audio:generate (scripts/audio/generate.py). Don't edit by hand. docs/notes/recorded-audio.md",
        "gaps": GAPS,
        "languages": dict(sorted(recorded.items())),
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", "utf-8")
    index = {
        lang: {"timings": f"/{entry['timings']}", "files": entry["files"], "bytes": entry["bytes"]}
        for lang, entry in manifest["languages"].items()
    }
    INDEX.write_text(json.dumps(index, indent=2) + "\n", "utf-8")
    for lang, entry in manifest["languages"].items():
        log(f"[{lang}] {entry['files']} files, {entry['bytes'] / 1e6:.1f} MB, {entry['seconds'] / 60:.1f} min")
    return 0


if __name__ == "__main__":
    sys.exit(main())
