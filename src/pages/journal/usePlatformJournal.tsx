/**
 * The journal across every course (Justin's follow-up of 10 November 2026):
 * what the chosen learner wrote in Write and Reflect, in Exploring Our World
 * and in the three other courses. The journal has no store of its own
 * (CLAUDE.md): it is made from the saved progress, which is kept per lesson
 * id whichever course the lesson is in, joined to each course's lessons for
 * the prompts and titles.
 *
 * Our World's lessons are always at hand. Another course's lessons are
 * loaded (src/courses/preview.tsx) only when this learner has saved words in
 * it, so a learner who never opened a course downloads nothing for it. If a
 * course can't be loaded, its entries are still shown from the build-time
 * outline (titles and numbers, no prompts), never dropped.
 */
import { useEffect, useMemo, useState } from 'react';
import { courseSummaries } from '../../content/catalog';
import type { LessonContent } from '../../content/courseContent';
import { COURSES, DEFAULT_COURSE_ID, previewCourseOfLesson } from '../../content/courses';
import { loadCourseOutlines } from '../../content/outline';
import type { CourseOutline, Titles } from '../../content/outlineTypes';
import { useCatalog } from '../../content/useCatalog';
import { useContent } from '../../content/useContent';
import { useI18n } from '../../i18n';
import { journalByLesson, type JournalLesson, type JournalLessonSource, type LessonProgress, type ProgressByLessonId } from '../../storage';

type Tone = 'history' | 'geography' | 'culture' | 'civics';

/** A name that is course text: in the language on screen, or English (marked lang="en") where there is no translation. */
export interface CourseText {
  text: string;
  english: boolean;
}

/** A lesson as the journal shows it: what journalByLesson needs, and what labels it. */
export interface JournalLessonInfo extends JournalLessonSource {
  courseId: string;
  courseName: CourseText;
  title: CourseText;
  sectionTitle: CourseText;
  /** The tint of its section's badge. */
  tone: Tone;
}

export type PlatformJournalEntry = JournalLesson<JournalLessonInfo>;

export interface PlatformJournal {
  status: 'loading' | 'ready';
  entries: PlatformJournalEntry[];
  /** Lesson ids with saved words that belong to no known course (never shown, never touched). */
  unresolved: string[];
}

const NO_ENTRIES: PlatformJournalEntry[] = [];
const NONE: string[] = [];

function hasWords(record: LessonProgress): boolean {
  return record.writing.text.trim() !== '' || Object.values(record.reflections).some((text) => text.trim() !== '');
}

interface Loaded {
  key: string;
  contents: ReadonlyMap<string, LessonContent>;
  /** Only read when a course could not be loaded. */
  outlines: Readonly<Record<string, CourseOutline>> | null;
}

/**
 * `progress` is the learner's saved progress (with any edit just made on the
 * page); `learnerId` ties what is loaded to who it was loaded for, so a read
 * that finishes after a profile switch is ignored.
 */
export function usePlatformJournal(learnerId: string | null, progress: ProgressByLessonId): PlatformJournal {
  const ourWorld = useContent();
  const catalog = useCatalog();
  const { locale, contentLocale } = useI18n();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  // The other courses this learner has written in, and any saved words that match no course.
  const { courseIds, unresolved } = useMemo(() => {
    const ids = new Set<string>();
    const unknown: string[] = [];
    for (const [lessonId, record] of progress) {
      if (!hasWords(record)) continue;
      const course = previewCourseOfLesson(lessonId);
      if (course) ids.add(course.id);
      else if (!ourWorld.getLesson(lessonId)) unknown.push(lessonId);
    }
    return { courseIds: [...ids].sort(), unresolved: unknown.length > 0 ? unknown.sort() : NONE };
  }, [progress, ourWorld]);

  const key = `${learnerId ?? ''}|${locale}|${courseIds.join(',')}`;

  useEffect(() => {
    if (courseIds.length === 0) return undefined;
    let current = true;
    void (async () => {
      const results = await Promise.all(
        courseIds.map(async (id) => {
          try {
            const { loadPreviewCourse } = await import('../../courses/preview');
            return [id, (await loadPreviewCourse(id)).contentIn(locale)] as const;
          } catch (error) {
            if (import.meta.env.DEV) console.error(error);
            return [id, null] as const;
          }
        }),
      );
      const failed = results.some(([, content]) => content === null);
      const outlines = failed ? await loadCourseOutlines().catch(() => null) : null;
      if (!current) return;
      const contents = new Map<string, LessonContent>();
      for (const [id, content] of results) if (content) contents.set(id, content);
      setLoaded({ key, contents, outlines });
    })();
    return () => {
      current = false;
    };
    // `key` carries the learner, language and courses this read is for.
  }, [key, courseIds, locale]);

  const ready = courseIds.length === 0 || loaded?.key === key;

  return useMemo(() => {
    if (!ready) return { status: 'loading', entries: NO_ENTRIES, unresolved };
    const named = (titles: Titles | undefined, fallback = ''): CourseText => {
      const translated = titles?.[contentLocale.code];
      // English standing in for a language the lessons are translated into is marked as English.
      return translated ? { text: translated, english: false } : { text: titles?.en ?? fallback, english: contentLocale.code !== 'en' };
    };
    // Course text from a content file is already in the language the files were made for; only the stand-ins need choosing.
    const own = (text: string): CourseText => ({ text, english: false });

    const lessons: JournalLessonInfo[] = [];
    const ourWorldName = own(catalog.getCourse().course.title);
    for (const lesson of ourWorld.getLessons()) {
      const section = ourWorld.getLessonSection(lesson);
      lessons.push({
        id: lesson.id,
        number: lesson.number,
        write: lesson.write,
        reflect: lesson.reflect,
        courseId: DEFAULT_COURSE_ID,
        courseName: ourWorldName,
        title: own(lesson.title),
        sectionTitle: own(section.title),
        tone: section.id,
      });
    }
    for (const course of COURSES) {
      if (course.id === DEFAULT_COURSE_ID || !courseIds.includes(course.id)) continue;
      const courseName = named(courseSummaries[course.id]?.titles, course.id);
      const content = loaded?.contents.get(course.id);
      if (content) {
        for (const lesson of content.getLessons()) {
          const section = content.getLessonSection(lesson);
          lessons.push({
            id: lesson.id,
            number: lesson.number,
            write: lesson.write,
            reflect: lesson.reflect,
            courseId: course.id,
            courseName,
            title: own(lesson.title),
            sectionTitle: own(section.title),
            tone: content.sectionLook(section.id).tone,
          });
        }
        continue;
      }
      // Could not load: the entries stay, labelled from the outline, with no prompts.
      const outline = loaded?.outlines?.[course.id];
      for (const lessonId of courseSummaries[course.id]?.lessonIds ?? []) {
        const record = progress.get(lessonId);
        if (!record || !hasWords(record)) continue;
        const stub = outline?.lessons.find((l) => l.id === lessonId);
        const section = outline?.sections.find((s) => s.id === stub?.section);
        const promptCount = Math.max(-1, ...Object.keys(record.reflections).map(Number).filter(Number.isInteger)) + 1;
        lessons.push({
          id: lessonId,
          number: stub?.number ?? 0,
          write: { prompt: '' },
          reflect: { prompts: Array.from({ length: promptCount }, () => ({ text: '' })) },
          courseId: course.id,
          courseName,
          title: named(stub?.titles, lessonId),
          sectionTitle: named(section?.titles),
          tone: section?.look.tone ?? 'history',
        });
      }
    }
    if (import.meta.env.DEV && unresolved.length > 0) console.warn('Journal: saved words for lessons no course has:', unresolved);
    return { status: 'ready', entries: journalByLesson(lessons, progress), unresolved };
  }, [ready, ourWorld, catalog, contentLocale.code, courseIds, loaded, progress, unresolved]);
}
