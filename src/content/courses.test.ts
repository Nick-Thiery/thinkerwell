import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { activityProblems } from './activityChecks';
import { createCourseContent } from './courseContent';
import { COURSES, DEFAULT_COURSE_ID, findPreviewCourse, PREVIEW_COURSES, previewCourseOfLesson, previewCourseOfSection } from './courses';
import { ContentError } from './errors';
import { loadContent, loadCourse, loadQuizzes, parseContentFile } from './load';
import { DIGITAL_WORLD_SECTION_IDS, digitalWorldLessonSchema, lessonSchema, SOUTHEAST_ASIA_SECTION_IDS, type Activity, type AnyCourseFile, type CourseLesson, type DigitalWorldLesson } from './schema';
import { STAGES, STAGES_WITHOUT_WATCH } from './stages';

// The course model (src/content/courses.ts) and the files of every course
// other than Our World (content/courses/<id>/), checked as the build checks
// them (vite.config.ts, checkContent).

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const read = (...parts: string[]) => JSON.parse(readFileSync(path.join(ROOT, ...parts), 'utf8')) as unknown;
const readLessons = (dir: string) =>
  Object.fromEntries(
    readdirSync(path.join(ROOT, dir))
      .filter((name) => name.endsWith('.json'))
      .map((name) => [`${dir}/${name}`, read(dir, name)]),
  );

const DW = 'content/courses/digital-world';
const dwCourse = read(DW, 'course.json');
const dwLessons = readLessons(`${DW}/lessons`);
const owCourse = read('content', 'course.json');
const owLessons = readLessons('content/lessons');
const lessonFile = (name: string) => structuredClone(dwLessons[`${DW}/lessons/${name}`]) as DigitalWorldLesson;
// Drafts taken out of the course in the social studies rebuild (October 2026): their activities still test the players' checks.
const retiredFile = (name: string) => structuredClone(read(DW, 'retired', name)) as DigitalWorldLesson;

describe('the course list', () => {
  it('has Our World first, as the default, then the three preview courses', () => {
    expect(COURSES[0]).toMatchObject({ id: DEFAULT_COURSE_ID, dir: '', preview: false });
    expect(PREVIEW_COURSES.map((course) => course.id)).toEqual(['digital-world', 'southeast-asia-through-time', 'art-architecture-society']);
    expect(findPreviewCourse('digital-world')?.lessonIdPrefix).toBe('dw-');
    expect(findPreviewCourse('southeast-asia-through-time')?.lessonIdPrefix).toBe('sat-');
    expect(findPreviewCourse('art-architecture-society')?.lessonIdPrefix).toBe('aas-');
  });

  it('never treats Our World, or an unknown id, as a preview course', () => {
    expect(findPreviewCourse(DEFAULT_COURSE_ID)).toBeUndefined();
    expect(findPreviewCourse('whatever')).toBeUndefined();
    expect(findPreviewCourse(undefined)).toBeUndefined();
  });

  it('finds a lesson’s preview course by its id, in any case', () => {
    expect(previewCourseOfLesson('dw-what-ai-is')?.id).toBe('digital-world');
    expect(previewCourseOfLesson('DW-What-AI-Is')?.id).toBe('digital-world');
    expect(previewCourseOfLesson('towns-near-rivers')).toBeUndefined();
    expect(previewCourseOfLesson('l6')).toBeUndefined();
    expect(previewCourseOfLesson(undefined)).toBeUndefined();
  });

  it('lists each preview course’s section ids as its schema has them, so a check’s address finds its course', () => {
    expect(findPreviewCourse('digital-world')?.sectionIds).toEqual([...DIGITAL_WORLD_SECTION_IDS]);
    expect(findPreviewCourse('southeast-asia-through-time')?.sectionIds).toEqual([...SOUTHEAST_ASIA_SECTION_IDS]);
    expect(previewCourseOfSection('trade-and-power')?.id).toBe('southeast-asia-through-time');
    expect(previewCourseOfSection('Thinking-Machines')?.id).toBe('digital-world');
    expect(previewCourseOfSection('history')).toBeUndefined();
    expect(previewCourseOfSection(undefined)).toBeUndefined();
  });

  it('keeps every Our World lesson id clear of other courses’ prefixes', () => {
    const ids = Object.values(owLessons).map((lesson) => (lesson as { id: string }).id);
    for (const course of PREVIEW_COURSES) expect(ids.filter((id) => id.startsWith(course.lessonIdPrefix))).toEqual([]);
  });
});

describe('Digital World’s files', () => {
  it('pass the build’s checks: 17 lessons in 4 sections, every id starting "dw-"', () => {
    const loaded = loadCourse('digital-world', dwCourse, dwLessons, { pictures: new Set(), picturesRequired: false });
    expect(loaded.lessons.map((lesson) => lesson.number)).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
    expect(loaded.sections.map((section) => section.id)).toEqual(['thinking-machines', 'who-builds-ai', 'ai-in-daily-life', 'truth-and-power']);
    expect(loaded.lessons.every((lesson) => lesson.id.startsWith('dw-') && lesson.oldId === null)).toBe(true);
  });

  it('keep an activity only where it teaches something the reading can’t (Justin’s brief of 4 November 2026)', () => {
    const loaded = loadCourse('digital-world', dwCourse, dwLessons);
    const withActivity = loaded.lessons.filter((lesson) => lesson.activity).map((lesson) => [lesson.number, lesson.activity!.type]);
    expect(withActivity).toEqual([
      [3, 'train-model'],
      [11, 'ask-tool'],
      [14, 'check-claim'],
      [17, 'design-plan'],
    ]);
    const at = (n: number) => loaded.lessons.find((lesson) => lesson.number === n)!.activity!;
    // Lesson 3's leaf model is an optional extension, folded away; the reading teaches the fair test.
    expect(at(3).extension).toBe(true);
    expect(`${at(17).stage}/${at(17).placement}`).toBe('write/before-prompt');
    // Most lessons now begin with the reading and have a shorter quick check.
    expect(loaded.lessons.filter((lesson) => !lesson.warmUp).length).toBeGreaterThanOrEqual(9);
    expect(loaded.lessons.every((lesson) => lesson.read.checks.length <= 3)).toBe(true);
  });

  it('are pictures planned but not drawn yet: only a required picture is a problem', () => {
    expect(() => loadCourse('digital-world', dwCourse, dwLessons, { pictures: new Set(), picturesRequired: false })).not.toThrow();
    expect(() => loadCourse('digital-world', dwCourse, dwLessons, { pictures: new Set(), picturesRequired: true })).toThrow(/no such file exists/);
  });

  it('are not Our World lessons, and Our World’s are not Digital World’s', () => {
    expect(lessonSchema.safeParse(lessonFile('DW01.json')).success).toBe(false);
    expect(digitalWorldLessonSchema.safeParse(owLessons['content/lessons/L10.json']).success).toBe(false);
    expect(() => loadContent(owCourse, { ...owLessons, 'content/lessons/DW01.json': lessonFile('DW01.json') })).toThrow(ContentError);
  });

  it('may begin straight with the reading and have no quick check, which Our World’s may not', () => {
    const bare = lessonFile('DW01.json') as unknown as Record<string, unknown> & { read: { checks: unknown[] } };
    delete bare.warmUp;
    delete bare.activity;
    bare.read.checks = [];
    expect(digitalWorldLessonSchema.safeParse(bare).success).toBe(true);
    const ow = structuredClone(owLessons['content/lessons/L10.json']) as Record<string, unknown> & { read: { checks: unknown[] } };
    expect(lessonSchema.safeParse({ ...ow, read: { ...ow.read, checks: [] } }).success).toBe(false);
    const { warmUp: _warmUp, ...owWithoutWarmUp } = ow;
    expect(lessonSchema.safeParse(owWithoutWarmUp).success).toBe(false);
  });

  it('name the file and the field for a problem', () => {
    const lesson = lessonFile('DW17.json') as unknown as { activity: { title: string } };
    lesson.activity.title = '';
    expect(() => parseContentFile('lesson', lesson, `${DW}/lessons/DW17.json`, 'digital-world')).toThrow(/DW17\.json: activity\.title/);
  });

  it('refuse a lesson id without the course’s prefix, or a section it doesn’t have', () => {
    const noPrefix = lessonFile('DW01.json');
    noPrefix.id = 'what-ai-is';
    expect(() => loadCourse('digital-world', dwCourse, { ...dwLessons, [`${DW}/lessons/DW01.json`]: noPrefix })).toThrow(/starting "dw-"/);
    const wrongSection = lessonFile('DW01.json') as unknown as { section: string };
    wrongSection.section = 'history';
    expect(() => loadCourse('digital-world', dwCourse, { ...dwLessons, [`${DW}/lessons/DW01.json`]: wrongSection })).toThrow(/section/);
  });

  it('refuse an unknown course', () => {
    expect(() => loadCourse('nope', dwCourse, dwLessons)).toThrow(/no course "nope"/);
    expect(() => parseContentFile('lesson', {}, 'x.json', 'nope')).toThrow(/no schemas for the course "nope"/);
  });
});

const SAT = 'content/courses/southeast-asia-through-time';

describe('Southeast Asia Through Time’s files', () => {
  const satCourse = read(SAT, 'course.json');
  const satLessons = readLessons(`${SAT}/lessons`);

  it('pass the build’s checks: 12 lessons in 4 sections of 3, every id starting "sat-"', () => {
    const loaded = loadCourse('southeast-asia-through-time', satCourse, satLessons, { pictures: new Set(), picturesRequired: false });
    expect(loaded.lessons.map((lesson) => lesson.number)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(loaded.sections.map((section) => section.lessons)).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      [10, 11, 12],
    ]);
    expect(loaded.lessons.every((lesson) => lesson.id.startsWith('sat-') && lesson.oldId === null)).toBe(true);
  });

  it('have a section check for each section, two questions per lesson, each about a lesson in its section', () => {
    const loaded = loadCourse('southeast-asia-through-time', satCourse, satLessons, { pictures: new Set(), picturesRequired: false });
    const quizzes = loadQuizzes(readLessons(`${SAT}/quizzes`), loaded.lessons, 'southeast-asia-through-time');
    expect(quizzes.map((quiz) => quiz.section).sort()).toEqual([...SOUTHEAST_ASIA_SECTION_IDS].sort());
    for (const quiz of quizzes) expect(quiz.questions, quiz.section).toHaveLength(6);
    // Our World's section ids aren't this course's.
    expect(() => loadQuizzes({ 'content/courses/x/quizzes/history.json': { ...quizzes[0], section: 'history' } }, loaded.lessons, 'southeast-asia-through-time')).toThrow(
      /section/,
    );
  });

  it('give every lesson two pictures that exist: a diagram and a credited real picture (or a second diagram)', () => {
    const files = new Set(readdirSync(path.join(ROOT, SAT, 'visuals')).map((name) => `visuals/${name}`));
    for (const raw of Object.values(satLessons)) {
      const lesson = raw as { number: number; visual: { src: string }; secondVisual: { src: string; type: string; credit: unknown } };
      expect(files.has(lesson.visual.src), `lesson ${lesson.number}: ${lesson.visual.src}`).toBe(true);
      expect(files.has(lesson.secondVisual.src), `lesson ${lesson.number}: ${lesson.secondVisual.src}`).toBe(true);
      if (lesson.secondVisual.type === 'photo') expect(lesson.secondVisual.credit, `lesson ${lesson.number}`).not.toBeNull();
    }
  });
});

describe('a lesson with no video', () => {
  it('has four steps, without Watch, and a lesson with a video has five (createCourseContent’s stagesFor)', () => {
    const lessons = [
      { number: 1, id: 'sat-a', section: 's', watch: null },
      { number: 2, id: 'sat-b', section: 's', watch: { youtubeId: 'abcdefghijk' } },
    ] as unknown as CourseLesson[];
    const course = { sections: [{ id: 's', number: 1, lessons: [1, 2] }] } as unknown as AnyCourseFile;
    const content = createCourseContent(course, lessons, {
      courseId: 'test',
      pictureUrls: new Map(),
      hasSectionChecks: false,
      sectionLook: () => ({ tone: 'history', icon: 'Map' }),
      coursePath: () => '/course/test',
    });
    expect(content.stagesFor({ number: 1 })).toEqual(STAGES_WITHOUT_WATCH);
    expect(content.stagesFor({ number: 2 })).toEqual(STAGES);
  });
});

describe('Art, Architecture and Society’s files', () => {
  const AAS = 'content/courses/art-architecture-society';
  const aasCourse = read(AAS, 'course.json') as AnyCourseFile;
  const aasLessons = readLessons(`${AAS}/lessons`);

  it('pass the build’s checks: 20 lessons in 4 sections of 5, ids from Justin’s brief', () => {
    const loaded = loadCourse('art-architecture-society', aasCourse, aasLessons);
    expect(loaded.lessons.map((lesson) => lesson.number)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(loaded.sections.map((section) => section.lessons)).toEqual([
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
      [11, 12, 13, 14, 15],
      [16, 17, 18, 19, 20],
    ]);
    // The four lessons added on 7 November have ids of their own; the earlier sixteen keep theirs.
    expect(loaded.lessons.filter((lesson) => !/^aas-\d\d-/.test(lesson.id)).map((lesson) => lesson.number)).toEqual([5, 10, 15, 19]);
  });

  it('teach through two real, credited images each, with Read asking nothing and no Watch step', () => {
    const loaded = loadCourse('art-architecture-society', aasCourse, aasLessons);
    for (const lesson of loaded.lessons) {
      expect(lesson.warmUp, lesson.id).toBeUndefined();
      expect(lesson.read.checks, lesson.id).toEqual([]);
      expect(lesson.watch, lesson.id).toBeNull();
      for (const picture of [lesson.visual, lesson.secondVisual]) {
        expect(picture?.type, lesson.id).toBe('photo');
        expect(picture?.src, lesson.id).toMatch(/^visuals\/AAS-\d\d-[AB]\.jpg$/);
        const credit = (picture as { credit?: { sourceUrl: string; licence: string } }).credit;
        expect(credit?.sourceUrl, lesson.id).toMatch(/^https:\/\//);
        expect(credit?.licence, lesson.id).toBeTruthy();
      }
    }
    // Three placements revisit earlier works, honestly: Lesson 12 Lesson 1's painting, Lesson 20 Lesson 16's two works.
    const at = (n: number) => loaded.lessons.find((lesson) => lesson.number === n)!;
    expect(at(12).visual?.src).toBe('visuals/AAS-01-B.jpg');
    expect([at(20).visual?.src, at(20).secondVisual?.src]).toEqual(['visuals/AAS-16-A.jpg', 'visuals/AAS-16-B.jpg']);
  });
});

describe('activityProblems', () => {
  const activityOf = (name: string): Activity => lessonFile(name).activity!;
  const retiredActivity = (name: string): Activity => retiredFile(name).activity!;
  const problems = (activity: Activity) => activityProblems(activity, 'here');

  it('finds nothing wrong with the drafts', () => {
    for (const name of Object.keys(dwLessons)) {
      const activity = (dwLessons[name] as DigitalWorldLesson).activity;
      if (activity) expect(problems(activity), name).toEqual([]);
    }
  });

  it('checks a train-model round’s expected result against the model itself', () => {
    const activity = activityOf('DW03.json');
    if (activity.type !== 'train-model') throw new Error('DW03 trains a model');
    activity.rounds[0]!.expectedIfLabelledLikeTheGardener = { right: 5, of: 6, wrong: ['t3'] };
    expect(problems(activity)).toEqual([expect.stringMatching(/round "round-1" expects 5 of 6 .* but the model gets 4 of 6 \(wrong: t3, t4\)/)]);
  });

  it('checks a round’s cards exist and a card has one number per feature', () => {
    const activity = activityOf('DW03.json');
    if (activity.type !== 'train-model') throw new Error('DW03 trains a model');
    activity.rounds[1]!.addExamples.push('e99');
    activity.tests[0]!.features = [1, 2, 3];
    expect(problems(activity).join('\n')).toMatch(/card "t1" has 3 numbers/);
  });

  it('checks a sort item suggests a real group', () => {
    const activity = retiredActivity('DW01-ai-or-not.json');
    if (activity.type !== 'sort') throw new Error('the retired Lesson 1 sorts');
    activity.items[0]!.suggested = 'maybe';
    expect(problems(activity)).toEqual(['here: item "calculator" suggests "maybe", which isn\'t a group']);
  });

  it('checks a placement goes with its stage', () => {
    const activity = activityOf('DW17.json');
    activity.stage = 'read';
    expect(problems(activity)).toEqual(['here: placement "before-prompt" belongs in the write stage, not read']);
  });

  it('checks compare-results names the group with the fewest right', () => {
    const activity = retiredActivity('DW08-comparing-results.json');
    if (activity.type !== 'compare-results') throw new Error('the retired Lesson 8 compares');
    activity.mostMistakes = 'teachers';
    expect(problems(activity)).toEqual(['here: mostMistakes "teachers" isn\'t the one group with the fewest right']);
  });

  it('checks every warning sign has its feedback and is a real sign', () => {
    const activity = retiredActivity('DW06-scams.json');
    if (activity.type !== 'spot-signs') throw new Error('DW06 spots signs');
    delete activity.messages[0]!.parts[0]!.feedback;
    activity.messages[0]!.parts[1]!.sign = 'nope';
    expect(problems(activity)).toEqual([
      'here: message "a" part 1 is a sign with no feedback',
      'here: message "a" part 2 has sign "nope", which isn\'t a sign',
    ]);
  });

  it('checks a chart view can show every bar, and a design step has what its kind needs', () => {
    const chart = retiredActivity('DW09-numbers.json');
    if (chart.type !== 'chart-check') throw new Error('DW09 checks a chart');
    chart.views[0]!.axisStart = 51;
    expect(problems(chart)).toEqual(['here: view "poster" can\'t show Stall B (50)']);
    const plan = activityOf('DW17.json');
    if (plan.type !== 'design-plan') throw new Error('DW17 plans');
    delete plan.steps[1]!.options;
    expect(problems(plan)).toEqual(['here: step "should-ai" is a choice with no options']);
  });
});
