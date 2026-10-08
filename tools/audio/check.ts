#!/usr/bin/env node
// npm run check:audio
//
// Fails when Listen's recordings don't match what Listen reads: a section
// whose text changed since it was recorded (or that has no recording), a
// piece the voice would now be given differently (tools/audio/normalise.ts),
// a recording or timings file that is missing or isn't what the manifest
// says, a file no section uses, or src/audio/recordings.json out of step.
// Runs in CI (.github/workflows/checks.yml), which can't run the voice
// models: the fix is always `npm run audio:generate` on a computer that can
// (scripts/audio/README.md). docs/notes/recorded-audio.md.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { listenUtterances, ROOT, SKIPPED_COURSES, type LanguageUtterances } from './utterances.ts';

interface ManifestPiece {
  hash: string;
  speak?: string;
  time: [number, number] | null;
}

interface ManifestSection {
  hash: string;
  file: string;
  bytes: number;
  pieces: ManifestPiece[];
}

interface ManifestLanguage {
  timings: string;
  files: number;
  bytes: number;
  sections: Record<string, ManifestSection>;
}

export interface Manifest {
  languages: Record<string, ManifestLanguage>;
}

export const MANIFEST_PATH = path.join('tools', 'audio', 'manifest.json');
export const INDEX_PATH = path.join('src', 'audio', 'recordings.json');

const FIX = 'Run `npm run audio:generate` (scripts/audio/README.md) to record them again, then commit public/audio/, tools/audio/manifest.json and src/audio/recordings.json.';

/** What is wrong with the recordings, compared with what Listen reads now (`expected`); empty when they match. */
export function audioProblems(expected: readonly LanguageUtterances[], manifest: Manifest | null, root = ROOT): string[] {
  if (!manifest) return [`${MANIFEST_PATH} is missing: nothing has been recorded.`];
  const problems: string[] = [];
  for (const language of expected) {
    const recorded = manifest.languages[language.lang];
    if (!recorded) {
      problems.push(`${language.lang}: no recordings at all.`);
      continue;
    }
    for (const section of language.sections) {
      const entry = recorded.sections[section.key];
      const where = `${language.lang} ${section.key} (${section.label})`;
      if (!entry) {
        problems.push(`${where}: no recording.`);
        continue;
      }
      if (entry.hash !== section.hash) {
        const changed = section.pieces.findIndex((piece, i) => entry.pieces[i]?.hash !== piece.hash);
        const piece = section.pieces[changed];
        problems.push(
          `${where}: the text changed since it was recorded${piece ? `, from piece ${changed + 1}: "${piece.text.slice(0, 80)}"` : ''}.`,
        );
        continue;
      }
      section.pieces.forEach((piece, i) => {
        const said = entry.pieces[i];
        if (piece.text && (said?.speak ?? piece.text) !== piece.speak) {
          problems.push(`${where}: piece ${i + 1} is now said as "${piece.speak.slice(0, 80)}" (tools/audio/normalise.ts changed).`);
        }
      });
      const file = path.join(root, 'public', 'audio', language.lang, entry.file);
      if (!existsSync(file)) problems.push(`${where}: public/audio/${language.lang}/${entry.file} is missing.`);
      else if (statSync(file).size !== entry.bytes) problems.push(`${where}: public/audio/${language.lang}/${entry.file} isn't the file that was recorded.`);
    }
    const wanted = new Set(language.sections.map((section) => section.key));
    for (const key of Object.keys(recorded.sections)) {
      if (!wanted.has(key)) problems.push(`${language.lang} ${key}: recorded, but Listen doesn't read it any more.`);
    }
    // The timings file the app loads must say what the manifest says.
    const timingsFile = path.join(root, 'public', recorded.timings);
    if (!existsSync(timingsFile)) {
      problems.push(`${language.lang}: public/${recorded.timings} is missing.`);
    } else {
      const timings = JSON.parse(readFileSync(timingsFile, 'utf8')) as { sections: Record<string, { f: string; h: string }> };
      for (const [key, entry] of Object.entries(recorded.sections)) {
        const timed = timings.sections[key];
        if (!timed || timed.f !== entry.file || timed.h !== entry.hash) problems.push(`${language.lang} ${key}: public/${recorded.timings} doesn't match the manifest.`);
      }
    }
    // Every file in public/audio/<lang>/ is a recording or the timings in use.
    const dir = path.join(root, 'public', 'audio', language.lang);
    const used = new Set([path.basename(recorded.timings), ...Object.values(recorded.sections).map((entry) => entry.file)]);
    for (const name of existsSync(dir) ? readdirSync(dir) : []) {
      if (!used.has(name)) problems.push(`public/audio/${language.lang}/${name}: no section uses it.`);
    }
  }
  for (const lang of Object.keys(manifest.languages)) {
    if (!expected.some((language) => language.lang === lang)) problems.push(`${lang}: recorded, but Listen has no lessons in it.`);
  }
  // What the app reads (src/audio/recordings.json) must point at the same files.
  const indexFile = path.join(root, INDEX_PATH);
  const index = existsSync(indexFile) ? (JSON.parse(readFileSync(indexFile, 'utf8')) as Record<string, { timings: string; files: number; bytes: number }>) : {};
  for (const [lang, recorded] of Object.entries(manifest.languages)) {
    const entry = index[lang];
    if (!entry || entry.timings !== `/${recorded.timings}` || entry.files !== recorded.files || entry.bytes !== recorded.bytes) {
      problems.push(`${INDEX_PATH}: ${lang} doesn't match ${MANIFEST_PATH}.`);
    }
  }
  return problems;
}

export function readManifest(root = ROOT): Manifest | null {
  const file = path.join(root, MANIFEST_PATH);
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Manifest) : null;
}

function main(): void {
  const manifest = readManifest();
  const problems = audioProblems(listenUtterances(), manifest);
  if (problems.length) {
    console.error(`Listen's recordings don't match the lessons (${problems.length} problem${problems.length === 1 ? '' : 's'}):`);
    for (const problem of problems.slice(0, 30)) console.error(`  ${problem}`);
    if (problems.length > 30) console.error(`  ... ${problems.length - 30} more`);
    console.error(`\n${FIX}`);
    process.exit(1);
  }
  for (const [lang, recorded] of Object.entries(manifest!.languages)) {
    console.log(`${lang}: ${recorded.files} recordings match the lessons (${(recorded.bytes / 1e6).toFixed(1)} MB).`);
  }
  if (SKIPPED_COURSES.length) console.log(`Not recorded, on purpose (preview courses; Listen uses the device's voice): ${SKIPPED_COURSES.join(', ')}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
