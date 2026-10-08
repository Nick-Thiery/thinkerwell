import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { activityProblems } from './activityChecks';
import { COURSES, DEFAULT_COURSE_ID, findPreviewCourse, PREVIEW_COURSES, previewCourseOfLesson } from './courses';
import { ContentError } from './errors';
import { loadContent, loadCourse, parseContentFile } from './load';
import { digitalWorldLessonSchema, lessonSchema, type Activity, type DigitalWorldLesson } from './schema';

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

describe('the course list', () => {
  it('has Our World first, as the default, and Digital World as a preview course', () => {
    expect(COURSES[0]).toMatchObject({ id: DEFAULT_COURSE_ID, dir: '', preview: false });
    expect(PREVIEW_COURSES.map((course) => course.id)).toEqual(['digital-world']);
    expect(findPreviewCourse('digital-world')?.lessonIdPrefix).toBe('dw-');
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

  it('keeps every Our World lesson id clear of other courses’ prefixes', () => {
    const ids = Object.values(owLessons).map((lesson) => (lesson as { id: string }).id);
    for (const course of PREVIEW_COURSES) expect(ids.filter((id) => id.startsWith(course.lessonIdPrefix))).toEqual([]);
  });
});

describe('Digital World’s files', () => {
  it('pass the build’s checks: 11 lessons in 4 sections, every id starting "dw-"', () => {
    const loaded = loadCourse('digital-world', dwCourse, dwLessons, { pictures: new Set(), picturesRequired: false });
    expect(loaded.lessons.map((lesson) => lesson.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(loaded.sections.map((section) => section.id)).toEqual(['how-ai-works', 'check-what-you-see', 'use-tools-wisely', 'ai-where-you-live']);
    expect(loaded.lessons.every((lesson) => lesson.id.startsWith('dw-') && lesson.oldId === null)).toBe(true);
  });

  it('use every activity type the spec names, one per lesson, where the drafts put them', () => {
    const loaded = loadCourse('digital-world', dwCourse, dwLessons);
    expect(loaded.lessons.map((lesson) => `${lesson.number} ${lesson.activity?.type} ${lesson.activity?.stage}/${lesson.activity?.placement}`)).toEqual([
      '1 sort read/after-evidence',
      '2 train-model read/after-evidence',
      '3 compare-results read/after-evidence',
      '4 sort read/after-evidence',
      '5 check-claim read/after-evidence',
      '6 spot-signs read/after-evidence',
      '7 sort read/after-evidence',
      '8 ask-tool read/after-evidence',
      '9 chart-check read/after-evidence',
      '10 sort read/after-evidence',
      '11 design-plan write/before-prompt',
    ]);
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

  it('name the file and the field for a problem', () => {
    const lesson = lessonFile('DW03.json') as unknown as { activity: { measure: string } };
    lesson.activity.measure = '';
    expect(() => parseContentFile('lesson', lesson, `${DW}/lessons/DW03.json`, 'digital-world')).toThrow(/DW03\.json: activity\.measure/);
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

describe('activityProblems', () => {
  const activityOf = (name: string): Activity => lessonFile(name).activity!;
  const problems = (activity: Activity) => activityProblems(activity, 'here');

  it('finds nothing wrong with the drafts', () => {
    for (const name of Object.keys(dwLessons)) {
      const activity = (dwLessons[name] as DigitalWorldLesson).activity;
      if (activity) expect(problems(activity), name).toEqual([]);
    }
  });

  it('checks a train-model round’s expected result against the model itself', () => {
    const activity = activityOf('DW02.json');
    if (activity.type !== 'train-model') throw new Error('DW02 trains a model');
    activity.rounds[0]!.expectedIfLabelledLikeTheGardener = { right: 5, of: 6, wrong: ['t3'] };
    expect(problems(activity)).toEqual([expect.stringMatching(/round "round-1" expects 5 of 6 .* but the model gets 4 of 6 \(wrong: t3, t4\)/)]);
  });

  it('checks a round’s cards exist and a card has one number per feature', () => {
    const activity = activityOf('DW02.json');
    if (activity.type !== 'train-model') throw new Error('DW02 trains a model');
    activity.rounds[1]!.addExamples.push('e99');
    activity.tests[0]!.features = [1, 2, 3];
    expect(problems(activity).join('\n')).toMatch(/card "t1" has 3 numbers/);
  });

  it('checks a sort item suggests a real group', () => {
    const activity = activityOf('DW01.json');
    if (activity.type !== 'sort') throw new Error('DW01 sorts');
    activity.items[0]!.suggested = 'maybe';
    expect(problems(activity)).toEqual(['here: item "calculator" suggests "maybe", which isn\'t a group']);
  });

  it('checks a placement goes with its stage', () => {
    const activity = activityOf('DW11.json');
    activity.stage = 'read';
    expect(problems(activity)).toEqual(['here: placement "before-prompt" belongs in the write stage, not read']);
  });

  it('checks compare-results names the group with the fewest right', () => {
    const activity = activityOf('DW03.json');
    if (activity.type !== 'compare-results') throw new Error('DW03 compares');
    activity.mostMistakes = 'teachers';
    expect(problems(activity)).toEqual(['here: mostMistakes "teachers" isn\'t the one group with the fewest right']);
  });

  it('checks every warning sign has its feedback and is a real sign', () => {
    const activity = activityOf('DW06.json');
    if (activity.type !== 'spot-signs') throw new Error('DW06 spots signs');
    delete activity.messages[0]!.parts[0]!.feedback;
    activity.messages[0]!.parts[1]!.sign = 'nope';
    expect(problems(activity)).toEqual([
      'here: message "a" part 1 is a sign with no feedback',
      'here: message "a" part 2 has sign "nope", which isn\'t a sign',
    ]);
  });

  it('checks a chart view can show every bar, and a design step has what its kind needs', () => {
    const chart = activityOf('DW09.json');
    if (chart.type !== 'chart-check') throw new Error('DW09 checks a chart');
    chart.views[0]!.axisStart = 51;
    expect(problems(chart)).toEqual(['here: view "poster" can\'t show Stall B (50)']);
    const plan = activityOf('DW11.json');
    if (plan.type !== 'design-plan') throw new Error('DW11 plans');
    delete plan.steps[1]!.options;
    expect(problems(plan)).toEqual(['here: step "should-ai" is a choice with no options']);
  });
});
