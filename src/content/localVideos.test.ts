import { describe, expect, it } from 'vitest';
import { EVENT_SPECS } from '../measurement/events';
import { FIXTURE_UNAPPROVED_ID, FIXTURE_VIDEO_ID, ID_VIDEOS_FIXTURE, translationWithVideos } from '../test/localVideoFixtures';
import { contentFor, englishContent } from './index';
import { checkLocalVideos, parseContentFile } from './load';
import { approvedLocalVideo, approvedLocalVideos, lessonKeyFromPath, onlyApprovedVideos, withLocalVideo } from './localVideos';
import type { ApprovedLocalVideo } from './schema';

const englishLessons = import.meta.glob<unknown>('../../content/lessons/*.json', { eager: true, import: 'default' });
const realVideos = import.meta.glob<unknown>('../../content/*/videos.json', { eager: true, import: 'default' });

const approved = (): ApprovedLocalVideo => structuredClone(ID_VIDEOS_FIXTURE.lessons.L05) as ApprovedLocalVideo;
const fileWith = (entry: unknown, key = 'L05', language = 'id') => ({ language, lessons: { [key]: entry } });
const check = (file: unknown, code = 'id') => checkLocalVideos(code, file, englishLessons);

describe('approvedLocalVideo', () => {
  it('accepts a complete, approved entry', () => {
    expect(approvedLocalVideo(approved())).not.toBeNull();
  });

  it('turns an entry down unless approved is exactly true', () => {
    for (const approvedValue of [false, 'true', 1, undefined, null]) {
      expect(approvedLocalVideo({ ...approved(), approved: approvedValue }), String(approvedValue)).toBeNull();
    }
    expect(approvedLocalVideo(undefined)).toBeNull();
    expect(approvedLocalVideo(null)).toBeNull();
    expect(approvedLocalVideo('L05')).toBeNull();
  });

  it.each(['approvedBy', 'approvedOn', 'summary', 'title', 'channel', 'why', 'beforeQuestion', 'afterQuestion'] as const)(
    'turns an approved entry down when %s is missing or empty',
    (field) => {
      const entry: Record<string, unknown> = { ...approved() };
      delete entry[field];
      expect(approvedLocalVideo(entry)).toBeNull();
      expect(approvedLocalVideo({ ...entry, [field]: '  ' })).toBeNull();
    },
  );

  it('turns an approved entry down without key points, or with a malformed video id', () => {
    expect(approvedLocalVideo({ ...approved(), keyPoints: [] })).toBeNull();
    expect(approvedLocalVideo({ ...approved(), keyPoints: ['ok', ''] })).toBeNull();
    for (const youtubeId of ['', 'short', 'way-too-long-id', 'has space!!', 12345678901]) {
      expect(approvedLocalVideo({ ...approved(), youtubeId }), String(youtubeId)).toBeNull();
    }
  });
});

describe('approvedLocalVideos', () => {
  it('keeps only the approved entries, by lesson', () => {
    const found = approvedLocalVideos(ID_VIDEOS_FIXTURE);
    expect([...found.keys()]).toEqual(['L05']);
  });

  it('is empty for no file, an empty file or something that is not a file', () => {
    expect(approvedLocalVideos(undefined).size).toBe(0);
    expect(approvedLocalVideos({ language: 'id', lessons: {} }).size).toBe(0);
    expect(approvedLocalVideos('nonsense').size).toBe(0);
    expect(approvedLocalVideos({ lessons: [] }).size).toBe(0);
  });
});

describe('withLocalVideo', () => {
  const lesson = englishContent.getLessonByNumber(5)!;

  it("replaces the lesson's Watch step and marks it local, without changing the lesson given", () => {
    const local = withLocalVideo(lesson, approved());
    expect(local.watch).toMatchObject({
      youtubeId: FIXTURE_VIDEO_ID,
      title: approved().title,
      channel: approved().channel,
      durationSeconds: 185,
      summary: approved().summary,
      keyPoints: approved().keyPoints,
      localVideo: true,
      replacementSuggestion: null,
    });
    expect(local.title).toBe(lesson.title);
    expect(lesson.watch.youtubeId).not.toBe(FIXTURE_VIDEO_ID);
    expect(lesson.watch.localVideo).toBeUndefined();
  });

  it('returns the lesson itself when there is no video', () => {
    expect(withLocalVideo(lesson, undefined)).toBe(lesson);
  });
});

describe('onlyApprovedVideos', () => {
  it('drops entries that are not approved, as the build does before the browser downloads the file', () => {
    const kept = onlyApprovedVideos(ID_VIDEOS_FIXTURE);
    expect(Object.keys(kept.lessons)).toEqual(['L05']);
    expect(JSON.stringify(kept)).not.toContain(FIXTURE_UNAPPROVED_ID);
  });
});

describe('the content in a language with videos of its own', () => {
  it('shows an approved video on its lesson and keeps the English video everywhere else', () => {
    const content = contentFor(translationWithVideos(ID_VIDEOS_FIXTURE));
    const l5 = content.getLessonByNumber(5)!;
    expect(l5.watch.youtubeId).toBe(FIXTURE_VIDEO_ID);
    expect(l5.watch.localVideo).toBe(true);
    for (const lesson of content.getLessons().filter((l) => l.number !== 5)) {
      expect(lesson.watch, `lesson ${lesson.number}`).toEqual(englishContent.getLesson(lesson.id)!.watch);
      expect(lesson.watch.localVideo).toBeUndefined();
    }
  });

  it('ignores an entry that is not approved, even if it is in the file', () => {
    const content = contentFor(translationWithVideos(ID_VIDEOS_FIXTURE));
    const l9 = content.getLessonByNumber(9)!;
    expect(l9.watch).toEqual(englishContent.getLesson(l9.id)!.watch);
    // And a file that was not filtered by the build is still locked by the same rule.
    const unlocked = structuredClone(ID_VIDEOS_FIXTURE);
    delete (unlocked.lessons.L05 as Partial<ApprovedLocalVideo>).approvedBy;
    const locked = contentFor(translationWithVideos(unlocked));
    expect(locked.getLessonByNumber(5)!.watch).toEqual(englishContent.getLessonByNumber(5)!.watch);
  });

  it('is the English content, video included, for a language with no videos file or an empty one', () => {
    for (const videos of [undefined, { language: 'id', lessons: {} }]) {
      const content = contentFor(translationWithVideos(videos));
      for (const lesson of content.getLessons()) expect(lesson.watch).toEqual(englishContent.getLesson(lesson.id)!.watch);
    }
  });

  it('never changes the English content', () => {
    contentFor(translationWithVideos(ID_VIDEOS_FIXTURE));
    expect(englishContent.getLessonByNumber(5)!.watch.youtubeId).not.toBe(FIXTURE_VIDEO_ID);
  });
});

describe('lessonKeyFromPath', () => {
  it('is the lesson file name without .json', () => {
    expect(lessonKeyFromPath('../../content/lessons/L05.json')).toBe('L05');
    expect(lessonKeyFromPath('L24.json')).toBe('L24');
  });
});

describe('checking a videos file (what stops the build)', () => {
  it('passes the fixture', () => {
    expect(check(ID_VIDEOS_FIXTURE).language).toBe('id');
  });

  it('passes an empty file, and parses as a videos file', () => {
    expect(check({ language: 'ms', lessons: {} }, 'ms').lessons).toEqual({});
    expect(parseContentFile('videos', { language: 'id', lessons: {} }, 'content/id/videos.json')).toEqual({ language: 'id', lessons: {} });
  });

  it.each(['approvedBy', 'approvedOn', 'summary', 'keyPoints', 'summaryBasis', 'contentNote'] as const)(
    'turns an approved entry down without %s',
    (field) => {
      const entry: Record<string, unknown> = { ...approved() };
      delete entry[field];
      expect(() => check(fileWith(entry))).toThrow(new RegExp(`lessons\\.L05\\.${field}`));
    },
  );

  it('turns an approved entry down with empty key points, an empty summary or an empty name', () => {
    expect(() => check(fileWith({ ...approved(), keyPoints: [] }))).toThrow(/keyPoints/);
    expect(() => check(fileWith({ ...approved(), summary: '  ' }))).toThrow(/summary/);
    expect(() => check(fileWith({ ...approved(), approvedBy: '' }))).toThrow(/approvedBy/);
  });

  it('turns down a malformed video id or approval date', () => {
    expect(() => check(fileWith({ ...approved(), youtubeId: 'short' }))).toThrow(/11-character YouTube id/);
    expect(() => check(fileWith({ ...approved(), approvedOn: '14/10/2026' }))).toThrow(/approvedOn/);
    expect(() => check(fileWith({ ...approved(), approvedOn: '2026-02-31' }))).toThrow(/real date/);
    expect(() => check(fileWith({ ...approved(), youtubeId: 'bad id here' }))).toThrow(/YouTube id/);
  });

  it('turns down a file for the wrong language', () => {
    expect(() => check({ ...ID_VIDEOS_FIXTURE, language: 'ms' })).toThrow(/language is "ms", but the file is in the folder for "id"/);
    expect(() => check({ language: 'xx-', lessons: {} })).toThrow(/language code/);
  });

  it('turns down a lesson that does not exist, and a key that is not a lesson name', () => {
    expect(() => check(fileWith(approved(), 'L99'))).toThrow(/there is no lesson L99/);
    expect(() => check(fileWith(approved(), 'lesson-5'))).toThrow(/lessons\.lesson-5/);
  });

  it("turns down an approved video that is the lesson's English video", () => {
    const english = (englishLessons['../../content/lessons/L05.json'] as { watch: { youtubeId: string } }).watch.youtubeId;
    expect(() => check(fileWith({ ...approved(), youtubeId: english }))).toThrow(/English video/);
  });

  it('turns down fields it does not know, and an unapproved entry that says too much', () => {
    expect(() => check(fileWith({ ...approved(), needsWatching: true }))).toThrow();
    expect(() => check(fileWith({ approved: false, youtubeId: FIXTURE_UNAPPROVED_ID, title: 'T', channel: 'C', summary: 'x' }, 'L09'))).toThrow();
    expect(() => check(fileWith({ approved: 'yes' }))).toThrow();
  });

  it('lets an unapproved entry be just a note', () => {
    expect(() => check(fileWith({ approved: false, youtubeId: FIXTURE_UNAPPROVED_ID, title: 'T', channel: 'C', note: 'Not watched' }, 'L09'))).not.toThrow();
  });
});

describe('the real content/<code>/videos.json files', () => {
  it('exist for Indonesian and Malay and pass the checks, and none is a test fixture', () => {
    const codes = Object.keys(realVideos).map((path) => path.replace(/^.*\/content\/([^/]+)\/videos\.json$/, '$1')).sort();
    expect(codes).toEqual(['id', 'ms']);
    for (const [path, raw] of Object.entries(realVideos)) {
      const code = path.replace(/^.*\/content\/([^/]+)\/videos\.json$/, '$1');
      const file = check(raw, code);
      // Whatever a person has approved (`npm run videos:apply`) is complete and not a test video.
      for (const [key, entry] of Object.entries(file.lessons)) {
        expect(entry.youtubeId, `${code} ${key}`).not.toMatch(/^tw_test_/);
        if (entry.approved) expect(approvedLocalVideo(entry), `${code} ${key}`).not.toBeNull();
      }
    }
  });
});

describe('pilot measurement', () => {
  it("records the lesson, never which video: a local video adds no field the consent form doesn't cover", () => {
    // The video events carry the lesson only (plus a choice, a quarter of the way through, or why it failed).
    expect(Object.keys(EVENT_SPECS.video_play.value)).toEqual([]);
    expect(Object.keys(EVENT_SPECS.video_choice.value)).toEqual(['choice']);
    expect(Object.keys(EVENT_SPECS.video_progress.value)).toEqual(['percent']);
    expect(Object.keys(EVENT_SPECS.video_fail.value)).toEqual(['reason']);
  });
});
