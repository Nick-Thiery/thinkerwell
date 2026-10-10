#!/usr/bin/env python3
"""Records Listen's audio: every piece of text Listen reads, in English,
Indonesian, Malay and (once asked for) Vietnamese, both reading levels, from the
list tools/audio/export.ts makes (the app's own sentences).
`npm run audio:generate` runs both steps; see scripts/audio/README.md and
docs/notes/recorded-audio.md.

  python3 scripts/audio/generate.py EXPORT.json [--lang en] [--synth-only]
  python3 scripts/audio/generate.py EXPORT.json --lang vi --sample DIR [--limit 3] [--vi-voice NAME]
  python3 scripts/audio/generate.py --fetch-vieneu
  python3 scripts/audio/generate.py --list-vi-voices

1. Synthesis. Each piece is spoken on its own (English: Kokoro-82M, voice
   af_heart, speed 0.92; Indonesian: Meta's MMS-TTS, facebook/mms-tts-ind;
   Malay: MMS-TTS, facebook/mms-tts-zlm;
   Vietnamese: VieNeu-TTS v3 Turbo, a preset voice) and kept in
   .audio-cache/<lang>/ under a hash of the voice and what it was given to say. A piece already there isn't spoken again, so a stopped
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
import random
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

# Vietnamese: the preset voice (VieNeu-TTS v3 Turbo's own names, see
# `--list-vi-voices`). The team chooses it after listening to samples
# (`--sample`); override it with the AUDIO_VI_VOICE environment variable or
# `--vi-voice`. Changing it records every Vietnamese piece again.
VI_VOICE = "Trúc Ly"

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
    # Malaysian Malay (Standard Malay, ISO 639-3 zsm, which MMS files under the
    # macrolanguage code zlm): the same family of model as Indonesian, chosen
    # after listening (docs/notes/recorded-audio.md, "Malay").
    "ms": {
        "engine": "mms-tts",
        "model": "facebook/mms-tts-zlm",
        "licence": "CC-BY-NC-4.0",
        "seed": 1,
        "sampleRate": 16000,
    },
    "vi": {
        "engine": "vieneu-v3-turbo",
        "package": "vieneu==3.8.3",
        "model": "pnnbao-ump/VieNeu-TTS-v3-Turbo",
        "modelRevision": "61b85e3d937fbbacb387714180e8182823512523",
        "modelFolder": "onnx_update",
        "codec": "OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano-ONNX",
        "codecRevision": "ceff0d0749bfb3fa2d61149794ec6feef0d1e1ae",
        "licence": "Apache-2.0",
        "voice": os.environ.get("AUDIO_VI_VOICE") or VI_VOICE,
        # Sampling, fixed so that a piece sounds the same each time it is recorded (and a change records again).
        # Each piece is also seeded from its own words (VieNeu.say).
        "seed": 1,
        "temperature": 0.6,
        "topK": 25,
        "topP": 0.95,
        "repetitionPenalty": 1.2,
        "silenceP": 0.15,
        # The model speaks at 48 kHz; the recordings are 24 kHz mono, like English.
        "modelSampleRate": 48000,
        "sampleRate": 24000,
    },
}

# Where VieNeu's model files are kept: real files, not the Hugging Face cache's symlinks (see fetch_vieneu_models).
VIENEU_DIR = CACHE / "models" / "vieneu"
# Files the ONNX engine reads (vieneu/_v3_turbo_engine/onnx_runtime_lite.py, _GRAPH_FILES and _CODEC_FILES).
VIENEU_MODEL_FILES = [
    "vieneu_prefill.onnx", "vieneu_decode_step.onnx", "vieneu_acoustic_cached.onnx",
    "vieneu_backbone_shared.data", "vieneu_v3_heads.npz", "config.json", "tokenizer.json",
]
VIENEU_CODEC_FILES = [
    "moss_audio_tokenizer_decode_full.onnx", "moss_audio_tokenizer_decode_shared.data",
    "moss_audio_tokenizer_decode_step.onnx", "codec_browser_onnx_meta.json",
    "moss_audio_tokenizer_encode.onnx", "moss_audio_tokenizer_encode.data",
]

# CPU threads for the engines (--threads, or AUDIO_THREADS); 0 is each engine's own default.
THREADS = 0

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


def set_torch_threads() -> None:
    """--threads for the torch engines (English, Indonesian). Vietnamese needs no torch, so it isn't imported for it."""
    if THREADS:
        import torch

        torch.set_num_threads(THREADS)


class Kokoro:
    def __init__(self) -> None:
        from kokoro import KPipeline

        set_torch_threads()

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
    def __init__(self, lang: str) -> None:
        from transformers import AutoTokenizer, VitsModel

        set_torch_threads()
        self.lang = lang
        v = VOICES[lang]
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
        torch.manual_seed(VOICES[self.lang]["seed"])
        with torch.no_grad():
            wave = self.model(**inputs).waveform[0].numpy()
        return wave.astype(np.float32)


def real_files(folder: Path, names: list[str]) -> bool:
    """True when every file is there as a real file: onnxruntime refuses a symlink that leaves the model's folder."""
    return all((folder / n).is_file() and not (folder / n).is_symlink() for n in names)


def fetch_vieneu_models() -> tuple[Path, Path, Path]:
    """Downloads VieNeu v3 Turbo's ONNX files and its audio codec to .audio-cache/models/vieneu/ (once), as REAL files.

    The Hugging Face cache (~/.cache/huggingface) keeps files as symlinks into its blobs folder, and
    onnxruntime 1.31 refuses them ("External data path escapes model directory"), so
    `local_dir=` is used, which writes ordinary files. Both repositories are fetched at the revisions in
    VOICES["vi"], so the model can't change under the recordings. Returns (root, model folder, codec folder).
    """
    from huggingface_hub import snapshot_download

    v = VOICES["vi"]
    model_dir = VIENEU_DIR / v["modelFolder"]
    codec_dir = VIENEU_DIR / "codec"
    if not real_files(model_dir, VIENEU_MODEL_FILES):
        log(f"[vi] downloading {v['model']}/{v['modelFolder']} (about 480 MB) to {VIENEU_DIR}")
        snapshot_download(
            v["model"], revision=v["modelRevision"], local_dir=VIENEU_DIR,
            allow_patterns=[f"{v['modelFolder']}/{n}" for n in VIENEU_MODEL_FILES],
        )
    if not real_files(codec_dir, VIENEU_CODEC_FILES):
        log(f"[vi] downloading {v['codec']} (about 90 MB) to {codec_dir}")
        snapshot_download(v["codec"], revision=v["codecRevision"], local_dir=codec_dir, allow_patterns=VIENEU_CODEC_FILES)
    for folder, names in ((model_dir, VIENEU_MODEL_FILES), (codec_dir, VIENEU_CODEC_FILES)):
        if not real_files(folder, names):
            raise RuntimeError(f"{folder} should hold real (not symlinked) copies of {names}: delete it and run again")
    return VIENEU_DIR, model_dir, codec_dir


class VieNeu:
    """VieNeu-TTS v3 Turbo (Apache-2.0), ONNX on the CPU, no torch. A preset voice, 48 kHz out, written at 24 kHz."""

    def __init__(self) -> None:
        import importlib.metadata

        v = VOICES["vi"]
        name, _, wanted = v["package"].partition("==")
        have = importlib.metadata.version(name)
        if have != wanted:
            raise RuntimeError(f"The Vietnamese recordings were made with {v['package']}, but {name}=={have} is installed: pip install {v['package']}")
        root, model_dir, codec_dir = fetch_vieneu_models()

        from vieneu import Vieneu
        from vieneu._v3_turbo_engine import onnx_runtime_lite as lite

        # V3TurboVieNeuTTS passes `onnx_dir` on but not `codec_dir`, so the engine would look for the codec in the
        # Hugging Face cache (symlinks again). Hand it our real copy instead.
        fetch_original = lite.OnnxV3LiteEngine._fetch

        def fetch(repo: str, files: list[str], subfolder: str | None) -> Path:
            return codec_dir if repo == lite._CODEC_REPO else fetch_original(repo, files, subfolder)

        lite.OnnxV3LiteEngine._fetch = staticmethod(fetch)
        # backbone_repo is the folder itself, so nothing else is looked up on the Hub while it starts.
        self.tts = Vieneu(backbone_repo=str(root), onnx_dir=str(model_dir), threads=THREADS)
        assert self.tts.sample_rate == v["modelSampleRate"], self.tts.sample_rate
        voices = [voice for _, voice in self.tts.list_preset_voices()]
        if self.tts.resolve_voice_name(v["voice"]) is None:
            raise ValueError(f"No Vietnamese voice called {v['voice']!r}. The voices are: {', '.join(voices)}")
        self.preset = self.tts.get_preset_voice(v["voice"])
        self.rate = v["sampleRate"]
        from sea_g2p import Normalizer

        self.normalizer = Normalizer("vi")

    def check(self, text: str) -> None:
        """Fails if VieNeu's own text normaliser would drop a character without reading it (tools/audio/normalise.ts should have changed it)."""
        dropped = self.normalizer.audit(text)
        if dropped:
            raise ValueError(f"VieNeu can't say {dropped} in {text!r}: change it in tools/audio/normalise.ts")

    def say(self, text: str) -> np.ndarray:
        import soxr

        v = VOICES["vi"]
        self.check(text)
        # The engine samples with numpy's global generator: seed it from the piece's own words, so the same piece
        # always sounds the same, whatever was recorded before it.
        seed = (int(hashlib.sha1(text.encode()).hexdigest()[:8], 16) + v["seed"]) % (2**32)
        random.seed(seed)
        np.random.seed(seed)
        wave = self.tts.infer(
            text=text,
            voice=self.preset,
            temperature=v["temperature"],
            top_k=v["topK"],
            top_p=v["topP"],
            repetition_penalty=v["repetitionPenalty"],
            silence_p=v["silenceP"],
            apply_watermark=False,  # the optional Perth watermark is not used
        )
        if wave is None or len(wave) == 0:
            raise RuntimeError(f"VieNeu said nothing for {text!r}")
        wave = np.asarray(wave, dtype=np.float32).reshape(-1)
        return soxr.resample(wave, v["modelSampleRate"], v["sampleRate"], quality="VHQ").astype(np.float32)


def engine_for(lang: str):
    if lang == "en":
        return Kokoro()
    if lang == "vi":
        return VieNeu()
    return Mms(lang)


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


def assemble(lang: str, sections: list[dict], normaliser: int, out_dir: Path | None = None, prune: bool = True) -> dict:
    """Joins each section's pieces into its MP3. `out_dir` (default public/audio/<lang>) and `prune=False` are for --sample, which writes elsewhere."""
    rate = VOICES[lang]["sampleRate"]
    out_dir = out_dir or PUBLIC / lang
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
    for old in out_dir.iterdir() if prune else []:
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


def list_vi_voices() -> None:
    """Prints VieNeu's preset voices (name, gender, region, style), from its own list, without loading the model."""
    import importlib.resources

    path = importlib.resources.files("vieneu") / "assets" / "voices_v3_turbo.json"
    data = json.loads(path.read_text("utf-8"))
    for name, voice in data.get("presets", {}).items():
        log(f"{name}\t{voice.get('gender', '')}\t{voice.get('description', '')}")
    log(f"Default in generate.py: {VI_VOICE}. Choose another with --vi-voice NAME or AUDIO_VI_VOICE=NAME.")


def main() -> int:
    global THREADS
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("export", nargs="?", help="the JSON tools/audio/export.ts wrote")
    parser.add_argument("--lang", action="append", help="only this language (en, id, ms, vi); may be given more than once. Without it: the ready languages, and any already recorded")
    parser.add_argument("--synth-only", action="store_true", help="record the pieces, but don't make the files")
    parser.add_argument("--threads", type=int, default=int(os.environ.get("AUDIO_THREADS", "0") or 0), help="CPU threads (0: each engine's default)")
    parser.add_argument("--vi-voice", help=f"VieNeu preset voice for Vietnamese (default {VI_VOICE!r}; AUDIO_VI_VOICE does the same); --list-vi-voices lists them")
    parser.add_argument("--list-vi-voices", action="store_true", help="list VieNeu's preset voices and stop")
    parser.add_argument("--fetch-vieneu", action="store_true", help="download VieNeu's model files to .audio-cache/models/vieneu/ and stop")
    parser.add_argument("--sample", metavar="DIR", help="record a few sections to DIR for listening (MP3 and timings), writing nothing to the repository")
    parser.add_argument("--limit", type=int, default=3, help="with --sample: how many sections (default 3)")
    parser.add_argument("--only", help="with --sample: only sections whose key contains this (for example 'l10/standard')")
    args = parser.parse_args()

    THREADS = args.threads
    if args.vi_voice:
        VOICES["vi"]["voice"] = args.vi_voice
    if args.list_vi_voices:
        list_vi_voices()
        return 0
    if args.fetch_vieneu:
        fetch_vieneu_models()
        log("[vi] VieNeu's model files are in " + str(VIENEU_DIR))
        return 0
    if not args.export:
        parser.error("the export JSON is required (npm run audio:generate makes it)")

    export = json.loads(Path(args.export).read_text("utf-8"))
    manifest = json.loads(MANIFEST.read_text("utf-8")) if MANIFEST.exists() else {}
    recorded = manifest.get("languages", {})
    if args.lang:
        languages = [l for l in export["languages"] if l["lang"] in args.lang]
    else:
        # Not-ready languages (Vietnamese, a hidden preview) are recorded only when asked for, or once they have recordings.
        languages = [l for l in export["languages"] if l.get("ready", True) or l["lang"] in recorded]
        for l in export["languages"]:
            if l not in languages:
                log(f"[{l['lang']}] isn't ready and has no recordings yet: skipped (record it with --lang {l['lang']})")

    if args.sample:
        out = Path(args.sample).resolve()
        if (out == ROOT or ROOT in out.parents) and CACHE.resolve() not in (out, *out.parents):
            parser.error("--sample writes listening files: point it outside the repository, or into .audio-cache/")
        for language in languages:
            if language["lang"] not in VOICES:
                log(f"No voice is set for {language['lang']} in scripts/audio/generate.py (VOICES).")
                return 1
            chosen = [s for s in language["sections"] if not args.only or args.only in s["key"]][: args.limit]
            synthesise(language["lang"], chosen)
            result = assemble(language["lang"], chosen, language["normaliser"], out_dir=out / language["lang"], prune=False)
            log(f"[{language['lang']}] {result['files']} sample file(s) in {out / language['lang']}: {result['seconds'] / 60:.1f} min, voice {VOICES[language['lang']].get('voice', '')}")
        return 0

    for language in languages:
        if language["lang"] not in VOICES:
            log(f"No voice is set for {language['lang']} in scripts/audio/generate.py (VOICES).")
            return 1
        synthesise(language["lang"], language["sections"])
    if args.synth_only:
        return 0

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
