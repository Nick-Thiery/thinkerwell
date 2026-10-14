import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseArgs, planApproval, serialiseVideos, type ApplyOptions } from './apply';
import { lessonKey, readVideosFile, type Candidate, type CandidatesFile } from './lib';
import { formatReport, videoReport } from './report';

// `npm run videos:apply` and `npm run videos:report` (docs/notes/local-language-videos.md),
// run on a small repository made for each test: three English lessons, the research
// notes for Indonesian and its videos file.

let root: string;

const english = (n: number, id: string) => ({ id: `lesson-${n}`, number: n, title: `Lesson ${n}`, watch: { youtubeId: id, title: `English ${n}`, channel: 'English Channel' } });

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    youtubeId: 'AAAAAAAAAAA',
    title: 'Judul video',
    channel: 'Saluran',
    durationSeconds: 200,
    verifiedByOembed: true,
    why: 'Video ini cocok untuk pelajaran ini.',
    beforeQuestion: 'Apa yang kamu tahu?',
    afterQuestion: 'Apa yang baru kamu pelajari?',
    summary: 'Ringkasan video ini.',
    summaryBasis: 'transcript',
    keyPoints: ['Satu.', 'Dua.', 'Tiga.'],
    contentNote: null,
    ...overrides,
  };
}

function write(relative: string, data: unknown) {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'tw-videos-'));
  write('content/lessons/L05.json', english(5, 'E5E5E5E5E5E'));
  write('content/lessons/L06.json', english(6, 'E6E6E6E6E6E'));
  write('content/lessons/L09.json', english(9, 'E9E9E9E9E9E'));
  write('content/id/videos.json', { language: 'id', lessons: {} });
  write('content/ms/videos.json', { language: 'ms', lessons: {} });
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

const options = (overrides: Partial<ApplyOptions> = {}): ApplyOptions => ({
  language: 'id',
  lessons: ['L05'],
  approvedBy: 'Dewi Reviewer',
  approvedOn: '2026-10-20',
  ...overrides,
});

const candidates = (lessons: CandidatesFile['lessons']) => ({ lessons });

describe('parseArgs', () => {
  it('reads the language, the lessons (comma or space separated) and the options', () => {
    expect(parseArgs(['id', 'L05,L9', 'l12', '--approved-by', 'Dewi R', '--accept-unverified-summary', '--dry-run'], '2026-10-14')).toEqual({
      language: 'id',
      lessons: ['L05', 'L09', 'L12'],
      approvedBy: 'Dewi R',
      approvedOn: '2026-10-14',
      acceptUnverifiedSummary: true,
      dryRun: true,
    });
    expect(parseArgs(['ms', 'L01', '--approved-by=Aiman', '--date=2026-11-02'], '2026-10-14')).toMatchObject({
      language: 'ms',
      approvedBy: 'Aiman',
      approvedOn: '2026-11-02',
      acceptUnverifiedSummary: false,
    });
  });

  it('says what is wrong with an unknown language, lesson or option', () => {
    expect(parseArgs(['fr', 'L05'])).toMatch(/Name a language/);
    expect(parseArgs([])).toMatch(/Name a language/);
    expect(parseArgs(['id', 'lesson-five'])).toMatch(/not a lesson/);
    expect(parseArgs(['id', 'L05', '--force'])).toMatch(/Unknown option --force/);
  });

  it('knows a lesson by L05, l5 or 5', () => {
    expect(['L05', 'l5', '5', ' 05 '].map(lessonKey)).toEqual(['L05', 'L05', 'L05', 'L05']);
    expect(lessonKey('L123')).toBeNull();
    expect(lessonKey('five')).toBeNull();
  });
});

describe('videos:apply', () => {
  it('copies the primary candidate into the language file as approved, with who and when', () => {
    const result = planApproval(options(), candidates({ L05: { primary: candidate() } }), readVideosFile('id', root), root);
    expect(result.refusals).toEqual([]);
    expect(result.changes).toEqual([
      { lesson: 'L05', kind: 'added', title: 'Judul video', channel: 'Saluran', youtubeId: 'AAAAAAAAAAA', summaryBasis: 'transcript' },
    ]);
    expect(result.file.lessons.L05).toEqual({
      approved: true,
      approvedBy: 'Dewi Reviewer',
      approvedOn: '2026-10-20',
      youtubeId: 'AAAAAAAAAAA',
      title: 'Judul video',
      channel: 'Saluran',
      durationSeconds: 200,
      why: 'Video ini cocok untuk pelajaran ini.',
      beforeQuestion: 'Apa yang kamu tahu?',
      afterQuestion: 'Apa yang baru kamu pelajari?',
      summary: 'Ringkasan video ini.',
      summaryBasis: 'transcript',
      keyPoints: ['Satu.', 'Dua.', 'Tiga.'],
      contentNote: null,
    });
    // The text is a file the build would accept.
    expect(serialiseVideos(result.file).endsWith('}\n')).toBe(true);
  });

  it('copies only the primary, not the backup, and none of the research fields', () => {
    const result = planApproval(
      options(),
      candidates({
        L05: {
          primary: { ...candidate(), needsWatching: true, fitScore: 3, fitNotes: 'x', channelCountry: 'ID' } as Candidate,
          backup: candidate({ youtubeId: 'BBBBBBBBBBB' }),
        },
      }),
      readVideosFile('id', root),
      root,
    );
    const entry = result.file.lessons.L05 as unknown as Record<string, unknown>;
    expect(entry.youtubeId).toBe('AAAAAAAAAAA');
    for (const research of ['needsWatching', 'fitScore', 'fitNotes', 'channelCountry', 'verifiedByOembed']) expect(entry).not.toHaveProperty(research);
  });

  it("refuses a summary that isn't based on a transcript, and changes nothing", () => {
    for (const summaryBasis of ['description', 'title-and-description']) {
      const result = planApproval(options(), candidates({ L05: { primary: candidate({ summaryBasis }) } }), readVideosFile('id', root), root);
      expect(result.refusals).toHaveLength(1);
      expect(result.refusals[0]).toContain(summaryBasis);
      expect(result.refusals[0]).toContain('--accept-unverified-summary');
      expect(result.changes).toEqual([]);
      expect(result.file.lessons).toEqual({});
    }
  });

  it('lets --accept-unverified-summary approve it, and records what the summary was based on', () => {
    const result = planApproval(
      options({ acceptUnverifiedSummary: true }),
      candidates({ L05: { primary: candidate({ summaryBasis: 'title-and-description' }) } }),
      readVideosFile('id', root),
      root,
    );
    expect(result.refusals).toEqual([]);
    expect((result.file.lessons.L05 as { summaryBasis: string }).summaryBasis).toBe('title-and-description');
  });

  it('writes nothing at all when any one lesson is refused', () => {
    const result = planApproval(
      options({ lessons: ['L05', 'L06'] }),
      candidates({ L05: { primary: candidate() }, L06: { primary: candidate({ youtubeId: 'CCCCCCCCCCC', summaryBasis: 'description' }) } }),
      readVideosFile('id', root),
      root,
    );
    expect(result.refusals).toHaveLength(1);
    expect(result.changes).toEqual([]);
    expect(result.file.lessons).toEqual({});
  });

  it('refuses a lesson with no candidate, one YouTube did not accept, and a missing name', () => {
    const none = planApproval(options({ lessons: ['L09'] }), candidates({ L09: { primary: null, noGoodMatch: true } }), readVideosFile('id', root), root);
    expect(none.refusals[0]).toMatch(/no primary candidate.*no good match/);
    const unknown = planApproval(options({ lessons: ['L06'] }), candidates({}), readVideosFile('id', root), root);
    expect(unknown.refusals[0]).toMatch(/no primary candidate/);
    const bad = planApproval(options(), candidates({ L05: { primary: candidate({ verifiedByOembed: false }) } }), readVideosFile('id', root), root);
    expect(bad.refusals[0]).toMatch(/YouTube's check did not accept/);
    const anon = planApproval(options({ approvedBy: ' ' }), candidates({ L05: { primary: candidate() } }), readVideosFile('id', root), root);
    expect(anon.refusals[0]).toMatch(/--approved-by/);
  });

  it("refuses a result the build would turn down (the lesson's English video, a lesson that doesn't exist)", () => {
    const sameAsEnglish = planApproval(options(), candidates({ L05: { primary: candidate({ youtubeId: 'E5E5E5E5E5E' }) } }), readVideosFile('id', root), root);
    expect(sameAsEnglish.refusals.join('\n')).toMatch(/English video/);
    const noLesson = planApproval(options({ lessons: ['L24'] }), candidates({ L24: { primary: candidate() } }), readVideosFile('id', root), root);
    expect(noLesson.refusals.join('\n')).toMatch(/no lesson L24/);
    const badId = planApproval(options(), candidates({ L05: { primary: candidate({ youtubeId: 'short' }) } }), readVideosFile('id', root), root);
    expect(badId.refusals.join('\n')).toMatch(/YouTube id/);
  });

  it('keeps entries already in the file, replaces one for the same lesson, and sorts by lesson', () => {
    write('content/id/videos.json', {
      language: 'id',
      lessons: {
        L09: { approved: false, youtubeId: 'DDDDDDDDDDD', title: 'Dipertimbangkan', channel: 'Saluran', note: 'Belum ditonton' },
      },
    });
    const first = planApproval(options({ lessons: ['L09'] }), candidates({ L09: { primary: candidate({ youtubeId: 'DDDDDDDDDDD' }) } }), readVideosFile('id', root), root);
    expect(first.changes[0]!.kind).toBe('replaced');
    const second = planApproval(options({ lessons: ['L05'] }), candidates({ L05: { primary: candidate() } }), first.file, root);
    expect(Object.keys(second.file.lessons)).toEqual(['L05', 'L09']);
    expect(second.file.lessons.L09).toMatchObject({ approved: true });
  });
});

describe('videos:report', () => {
  it('lists every lesson as English until a video is approved', () => {
    const report = videoReport(root);
    expect(report.map((r) => r.language)).toEqual(['id', 'ms']);
    for (const language of report) {
      expect(language.lessons.map((l) => l.source)).toEqual(['english', 'english', 'english']);
      expect(language.problems).toEqual([]);
    }
    expect(formatReport(report)).toContain('id (Bahasa Indonesia): 0 of 3 lessons use a video in the language, 3 use the English video');
  });

  it('shows an approved lesson as local with who approved it, and ignores one that is not approved', () => {
    const approved = planApproval(options(), candidates({ L05: { primary: candidate() } }), readVideosFile('id', root), root).file;
    approved.lessons.L09 = { approved: false, youtubeId: 'DDDDDDDDDDD', title: 'Dipertimbangkan', channel: 'Saluran' };
    write('content/id/videos.json', serialiseVideos(approved));
    write('docs/notes/local-videos/id.json', { language: 'id', lessons: { L05: { primary: candidate() }, L06: { primary: candidate({ youtubeId: 'FFFFFFFFFFF' }) } } });
    const [id, ms] = videoReport(root);
    expect(id!.lessons.map((l) => `${l.lesson}:${l.source}`)).toEqual(['L05:local', 'L06:english', 'L09:english']);
    expect(id!.lessons[0]).toMatchObject({ title: 'Judul video', youtubeId: 'AAAAAAAAAAA', approvedBy: 'Dewi Reviewer', approvedOn: '2026-10-20' });
    expect(id!.lessons[2]).toMatchObject({ title: 'English 9' });
    expect(id!.pending).toBe(1);
    expect(id!.candidatesWaiting).toBe(1);
    expect(ms!.lessons.every((l) => l.source === 'english')).toBe(true);
    const text = formatReport([id!]);
    expect(text).toContain('1 of 3 lessons use a video in the language, 2 use the English video');
    expect(text).toContain('L05  local');
    expect(text).toContain('approved by Dewi Reviewer on 2026-10-20');
  });

  it('reports a videos file the build would turn down', () => {
    write('content/ms/videos.json', { language: 'ms', lessons: { L05: { approved: true, youtubeId: 'AAAAAAAAAAA', title: 'T', channel: 'C' } } });
    const [, ms] = videoReport(root);
    expect(ms!.problems.join('\n')).toMatch(/approvedBy/);
    // And such an entry is not counted as a local video.
    expect(ms!.lessons[0]!.source).toBe('english');
  });
});

describe('the commands', () => {
  const run = (script: string, args: string[] = []) =>
    spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', path.join(import.meta.dirname, script), ...args], { encoding: 'utf8' });

  it('videos:report runs on the real content and says every lesson in the languages uses a video, local or English', () => {
    const done = run('report.ts');
    expect(done.status).toBe(0);
    expect(done.stdout).toMatch(/^id \(Bahasa Indonesia\): \d+ of 24 lessons use a video in the language/m);
    expect(done.stdout).toMatch(/^ms \(Bahasa Melayu\): \d+ of 24 lessons/m);
  });

  it('videos:apply with no language says how to use it and changes nothing', () => {
    const done = run('apply.ts', []);
    expect(done.status).toBe(2);
    expect(done.stderr).toContain('Usage: npm run videos:apply');
  });
});
