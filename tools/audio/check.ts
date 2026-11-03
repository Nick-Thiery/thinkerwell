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
//
// Which languages: every language learners can choose (`ready`), and any
// language that already has recordings (in the manifest or in
// public/audio/<lang>/). A translated language that isn't ready and has no
// recordings (Vietnamese, a hidden preview whose audio is kept out of main
// until it is ready) is not checked and doesn't fail anything.
//
// The preview courses (November 2026) are checked the same way, each course
// and language on its own: public/audio/<lang>/<course>/, `courses` in the
// manifest, and src/audio/courseRecordings.json.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { courseUtterances, listenUtterances, ROOT, SKIPPED_COURSES, type CourseUtterances, type LanguageUtterances } from './utterances.ts';

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
  /** The preview courses' recordings, by course and language. */
  courses?: Record<string, Record<string, ManifestLanguage>>;
}

export const MANIFEST_PATH = path.join('tools', 'audio', 'manifest.json');
export const INDEX_PATH = path.join('src', 'audio', 'recordings.json');
export const COURSE_INDEX_PATH = path.join('src', 'audio', 'courseRecordings.json');

const FIX =
  'Run `npm run audio:generate` (and `npm run audio:generate -- --all-courses` for the preview courses; scripts/audio/README.md) to record them again, then commit public/audio/, tools/audio/manifest.json, src/audio/recordings.json and src/audio/courseRecordings.json.';

/** The files (not folders: a course's recordings are in one of its own) in a folder under the repository. */
function filesIn(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir).filter((name) => statSync(path.join(dir, name)).isFile()) : [];
}

/** True when public/audio/<lang>/ holds any file. */
function hasRecordingFiles(lang: string, root: string): boolean {
  return filesIn(path.join(root, 'public', 'audio', lang)).length > 0;
}

/** One set of recordings against what Listen reads: Our World in one language ("id"), or a course in one ("id/digital-world"). */
function trackProblems(track: string, language: LanguageUtterances, recorded: ManifestLanguage, root: string): string[] {
  const problems: string[] = [];
  for (const section of language.sections) {
    const entry = recorded.sections[section.key];
    const where = `${track} ${section.key} (${section.label})`;
    if (!entry) {
      problems.push(`${where}: no recording.`);
      continue;
    }
    if (entry.hash !== section.hash) {
      const changed = section.pieces.findIndex((piece, i) => entry.pieces[i]?.hash !== piece.hash);
      const piece = section.pieces[changed];
      problems.push(`${where}: the text changed since it was recorded${piece ? `, from piece ${changed + 1}: "${piece.text.slice(0, 80)}"` : ''}.`);
      continue;
    }
    section.pieces.forEach((piece, i) => {
      const said = entry.pieces[i];
      if (piece.text && (said?.speak ?? piece.text) !== piece.speak) {
        problems.push(`${where}: piece ${i + 1} is now said as "${piece.speak.slice(0, 80)}" (tools/audio/normalise.ts changed).`);
      }
    });
    const file = path.join(root, 'public', 'audio', track, entry.file);
    if (!existsSync(file)) problems.push(`${where}: public/audio/${track}/${entry.file} is missing.`);
    else if (statSync(file).size !== entry.bytes) problems.push(`${where}: public/audio/${track}/${entry.file} isn't the file that was recorded.`);
  }
  const wanted = new Set(language.sections.map((section) => section.key));
  for (const key of Object.keys(recorded.sections)) {
    if (!wanted.has(key)) problems.push(`${track} ${key}: recorded, but Listen doesn't read it any more.`);
  }
  // The timings file the app loads must say what the manifest says.
  const timingsFile = path.join(root, 'public', recorded.timings);
  if (!existsSync(timingsFile)) {
    problems.push(`${track}: public/${recorded.timings} is missing.`);
  } else {
    const timings = JSON.parse(readFileSync(timingsFile, 'utf8')) as { sections: Record<string, { f: string; h: string }> };
    for (const [key, entry] of Object.entries(recorded.sections)) {
      const timed = timings.sections[key];
      if (!timed || timed.f !== entry.file || timed.h !== entry.hash) problems.push(`${track} ${key}: public/${recorded.timings} doesn't match the manifest.`);
    }
  }
  // Every file in its folder is a recording or the timings in use.
  const used = new Set([path.basename(recorded.timings), ...Object.values(recorded.sections).map((entry) => entry.file)]);
  for (const name of filesIn(path.join(root, 'public', 'audio', track))) {
    if (!used.has(name)) problems.push(`public/audio/${track}/${name}: no section uses it.`);
  }
  return problems;
}

type Index = Record<string, { timings: string; files: number; bytes: number }>;

/** What the app reads (an index) must point at the files the manifest lists. */
function indexProblems(indexPath: string, index: Index, recorded: Record<string, ManifestLanguage>, label = (key: string) => key): string[] {
  const problems: string[] = [];
  for (const [key, entry] of Object.entries(recorded)) {
    const listed = index[key];
    if (!listed || listed.timings !== `/${entry.timings}` || listed.files !== entry.files || listed.bytes !== entry.bytes) {
      problems.push(`${indexPath}: ${label(key)} doesn't match ${MANIFEST_PATH}.`);
    }
  }
  for (const key of Object.keys(index)) {
    if (!recorded[key]) problems.push(`${indexPath}: ${label(key)} is listed, but ${MANIFEST_PATH} has no recordings of it.`);
  }
  return problems;
}

function readIndex<T>(file: string, empty: T): T {
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as T) : empty;
}

/** The preview courses' recordings against what Listen reads in them (`courses`); empty when they match. */
export function courseAudioProblems(courses: readonly CourseUtterances[], manifest: Manifest | null, root = ROOT): string[] {
  const problems: string[] = [];
  const recordedCourses = manifest?.courses ?? {};
  for (const track of courses) {
    const recorded = recordedCourses[track.course]?.[track.lang];
    const where = `${track.lang}/${track.course}`;
    if (!recorded) problems.push(`${where}: no recordings at all.`);
    else problems.push(...trackProblems(where, track, recorded, root));
  }
  for (const [course, langs] of Object.entries(recordedCourses)) {
    for (const lang of Object.keys(langs)) {
      if (!courses.some((track) => track.course === course && track.lang === lang)) problems.push(`${lang}/${course}: recorded, but Listen has no lessons of it in ${lang}.`);
    }
  }
  const index = readIndex<Record<string, Index>>(path.join(root, COURSE_INDEX_PATH), {});
  for (const course of new Set([...Object.keys(recordedCourses), ...Object.keys(index)])) {
    problems.push(...indexProblems(COURSE_INDEX_PATH, index[course] ?? {}, recordedCourses[course] ?? {}, (lang) => `${lang}/${course}`));
  }
  return problems;
}

/**
 * The languages whose recordings are checked: those learners can choose (`ready`, or not said), and any that has
 * recordings already. A not-ready language with none yet (Vietnamese, a hidden preview) is left out.
 */
export function checkedLanguages(expected: readonly LanguageUtterances[], manifest: Manifest | null, root = ROOT): LanguageUtterances[] {
  return expected.filter((language) => language.ready !== false || Boolean(manifest?.languages[language.lang]) || hasRecordingFiles(language.lang, root));
}

/** What is wrong with the recordings, compared with what Listen reads now (`all`); empty when they match. */
export function audioProblems(all: readonly LanguageUtterances[], manifest: Manifest | null, root = ROOT): string[] {
  if (!manifest) return [`${MANIFEST_PATH} is missing: nothing has been recorded.`];
  const problems: string[] = [];
  const expected = checkedLanguages(all, manifest, root);
  for (const language of expected) {
    const recorded = manifest.languages[language.lang];
    if (!recorded) {
      problems.push(
        hasRecordingFiles(language.lang, root)
          ? `${language.lang}: public/audio/${language.lang}/ has files, but ${MANIFEST_PATH} has no recordings in it.`
          : `${language.lang}: no recordings at all.`,
      );
      continue;
    }
    problems.push(...trackProblems(language.lang, language, recorded, root));
  }
  for (const lang of Object.keys(manifest.languages)) {
    if (!all.some((language) => language.lang === lang)) problems.push(`${lang}: recorded, but Listen has no lessons in it.`);
  }
  // What the app reads (src/audio/recordings.json) must point at the same files.
  problems.push(...indexProblems(INDEX_PATH, readIndex<Index>(path.join(root, INDEX_PATH), {}), manifest.languages));
  return problems;
}

export function readManifest(root = ROOT): Manifest | null {
  const file = path.join(root, MANIFEST_PATH);
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Manifest) : null;
}

function main(): void {
  const manifest = readManifest();
  const all = listenUtterances();
  const courses = courseUtterances();
  const problems = [...audioProblems(all, manifest), ...courseAudioProblems(courses, manifest)];
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
  const checked = new Set(checkedLanguages(all, manifest).map((language) => language.lang));
  const waiting = all.filter((language) => !checked.has(language.lang)).map((language) => language.lang);
  if (waiting.length) console.log(`Not checked, on purpose (not ready for learners and not recorded yet; Listen uses the device's voice): ${waiting.join(', ')}.`);
  for (const [course, langs] of Object.entries(manifest!.courses ?? {})) {
    for (const [lang, recorded] of Object.entries(langs)) {
      console.log(`${lang}/${course}: ${recorded.files} recordings match the lessons (${(recorded.bytes / 1e6).toFixed(1)} MB).`);
    }
  }
  if (SKIPPED_COURSES.length) console.log(`Not recorded, on purpose (preview courses; Listen uses the device's voice): ${SKIPPED_COURSES.join(', ')}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
