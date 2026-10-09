import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { piecesHash, textHash } from '../../src/audio/textHash';
import { audioProblems, checkedLanguages, type Manifest } from './check';
import { recordedLanguages, type LanguageUtterances } from './utterances';

const TEXTS = ['Rivers.', 'They flood.', 'Mud is fertile.'];

function expected(texts = TEXTS, speak = texts): LanguageUtterances[] {
  return [
    {
      lang: 'en',
      normaliser: 1,
      sections: [
        {
          key: 'rivers/standard/1',
          label: 'L10 part 1, standard',
          hash: piecesHash(texts),
          pieces: texts.map((text, i) => ({ text, hash: textHash(text), speak: speak[i]!, after: 'sentence' as const })),
        },
      ],
    },
  ];
}

let root: string;

/** A recorded repository: the manifest, the timings, the recording and the app's index, as audio:generate leaves them. */
function recorded(texts = TEXTS): Manifest {
  const manifest: Manifest = {
    languages: {
      en: {
        timings: 'audio/en/timings.t1.json',
        files: 1,
        bytes: 4,
        sections: {
          'rivers/standard/1': {
            hash: piecesHash(texts),
            file: 'rivers-standard-1.a1.mp3',
            bytes: 4,
            pieces: texts.map((text, i) => ({ hash: textHash(text), time: [i, i + 0.5] })),
          },
        },
      },
    },
  };
  mkdirSync(path.join(root, 'public', 'audio', 'en'), { recursive: true });
  mkdirSync(path.join(root, 'src', 'audio'), { recursive: true });
  writeFileSync(path.join(root, 'public', 'audio', 'en', 'rivers-standard-1.a1.mp3'), 'mp3!');
  writeFileSync(
    path.join(root, 'public', 'audio', 'en', 'timings.t1.json'),
    JSON.stringify({ lang: 'en', sections: { 'rivers/standard/1': { f: 'rivers-standard-1.a1.mp3', h: piecesHash(texts) } } }),
  );
  writeFileSync(path.join(root, 'src', 'audio', 'recordings.json'), JSON.stringify({ en: { timings: '/audio/en/timings.t1.json', files: 1, bytes: 4 } }));
  return manifest;
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'tw-audio-check-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('check:audio', () => {
  it('passes when every recording matches what Listen reads', () => {
    expect(audioProblems(expected(), recorded(), root)).toEqual([]);
  });

  it('fails, naming the sentence, when a lesson changed after it was recorded', () => {
    const manifest = recorded();
    const problems = audioProblems(expected(['Rivers.', 'They flood every year.', 'Mud is fertile.']), manifest, root);
    expect(problems).toEqual([expect.stringMatching(/rivers\/standard\/1.*text changed.*piece 2: "They flood every year\."/)]);
  });

  it('fails when the voice would now be given different words', () => {
    const problems = audioProblems(expected(TEXTS, ['Rivers.', 'They flood.', 'Mud is very fertile.']), recorded(), root);
    expect(problems).toEqual([expect.stringMatching(/piece 3 is now said as/)]);
  });

  it('fails on a missing recording, a missing file and a file no section uses', () => {
    const manifest = recorded();
    rmSync(path.join(root, 'public', 'audio', 'en', 'rivers-standard-1.a1.mp3'));
    writeFileSync(path.join(root, 'public', 'audio', 'en', 'old.zz.mp3'), 'old');
    const more = expected();
    more[0]!.sections.push({ ...more[0]!.sections[0]!, key: 'rivers/simpler/1', label: 'L10 part 1, simpler' });
    const problems = audioProblems(more, manifest, root);
    expect(problems).toContainEqual(expect.stringMatching(/rivers-standard-1\.a1\.mp3 is missing/));
    expect(problems).toContainEqual(expect.stringMatching(/rivers\/simpler\/1.*no recording/));
    expect(problems).toContainEqual(expect.stringMatching(/old\.zz\.mp3: no section uses it/));
  });

  it('fails when nothing has been recorded, or the app points at other files', () => {
    expect(audioProblems(expected(), null, root)).toEqual([expect.stringMatching(/manifest\.json is missing/)]);
    const manifest = recorded();
    writeFileSync(path.join(root, 'src', 'audio', 'recordings.json'), '{}');
    expect(audioProblems(expected(), manifest, root)).toEqual([expect.stringMatching(/recordings\.json: en doesn't match/)]);
  });
});

/** A translated language that learners can't choose yet, as the export lists it (Vietnamese, a hidden preview). */
function withPreviewLanguage(texts = TEXTS): LanguageUtterances[] {
  const [en] = expected(texts);
  return [en!, { ...en!, lang: 'vi', ready: false }];
}

describe('a language that is not ready (Vietnamese, a hidden preview)', () => {
  it('is not checked, and fails nothing, while it has no recordings', () => {
    const manifest = recorded();
    expect(checkedLanguages(withPreviewLanguage(), manifest, root).map((l) => l.lang)).toEqual(['en']);
    expect(audioProblems(withPreviewLanguage(), manifest, root)).toEqual([]);
    expect(audioProblems(withPreviewLanguage(['Rivers.', 'They flood every day.', 'Mud is fertile.']), manifest, root)).toEqual([
      expect.stringMatching(/^en rivers\/standard\/1/),
    ]);
  });

  it('is checked like any other once the manifest has recordings for it', () => {
    const manifest = recorded();
    manifest.languages.vi = manifest.languages.en!;
    mkdirSync(path.join(root, 'public', 'audio', 'vi'), { recursive: true });
    writeFileSync(path.join(root, 'public', 'audio', 'vi', 'rivers-standard-1.a1.mp3'), 'mp3!');
    writeFileSync(path.join(root, 'public', 'audio', 'vi', 'timings.t1.json'), JSON.stringify({ lang: 'vi', sections: { 'rivers/standard/1': { f: 'rivers-standard-1.a1.mp3', h: piecesHash(TEXTS) } } }));
    writeFileSync(
      path.join(root, 'src', 'audio', 'recordings.json'),
      JSON.stringify({ en: { timings: '/audio/en/timings.t1.json', files: 1, bytes: 4 }, vi: { timings: '/audio/en/timings.t1.json', files: 1, bytes: 4 } }),
    );
    expect(checkedLanguages(withPreviewLanguage(), manifest, root).map((l) => l.lang)).toEqual(['en', 'vi']);
    rmSync(path.join(root, 'public', 'audio', 'vi', 'rivers-standard-1.a1.mp3'));
    expect(audioProblems(withPreviewLanguage(), manifest, root)).toContainEqual(expect.stringMatching(/^vi rivers\/standard\/1.*rivers-standard-1\.a1\.mp3 is missing/));
  });

  it('is checked once public/audio/<lang>/ has files, so a half-committed recording fails', () => {
    const manifest = recorded();
    mkdirSync(path.join(root, 'public', 'audio', 'vi'), { recursive: true });
    writeFileSync(path.join(root, 'public', 'audio', 'vi', 'x.mp3'), 'mp3!');
    expect(audioProblems(withPreviewLanguage(), manifest, root)).toEqual([expect.stringMatching(/^vi: public\/audio\/vi\/ has files, but .*manifest\.json has no recordings/)]);
  });

  it('fails if the app is told about recordings the manifest does not have, and is fine without any', () => {
    const manifest = recorded();
    writeFileSync(
      path.join(root, 'src', 'audio', 'recordings.json'),
      JSON.stringify({ en: { timings: '/audio/en/timings.t1.json', files: 1, bytes: 4 }, vi: { timings: '/audio/vi/timings.x.json', files: 1, bytes: 4 } }),
    );
    expect(audioProblems(withPreviewLanguage(), manifest, root)).toEqual([expect.stringMatching(/recordings\.json: vi is listed, but .*manifest\.json has no recordings/)]);
  });

  it('is exported for recording, ready or not, because its lessons are translated', () => {
    expect(recordedLanguages(root)).toContain('vi');
    expect(recordedLanguages(root)[0]).toBe('en');
  });
});

describe('preview courses', () => {
  it('are skipped on purpose: nothing of Digital World is recorded or checked', async () => {
    const { listenUtterances, SKIPPED_COURSES } = await import('./utterances.ts');
    expect(SKIPPED_COURSES).toEqual(['digital-world']);
    for (const language of listenUtterances()) {
      expect(language.sections.filter((section) => section.key.startsWith('dw-'))).toEqual([]);
    }
  });
});
