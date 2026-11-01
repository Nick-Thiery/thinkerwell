// Tests only: a Digital World lesson in a ready-made lesson player, as the
// activity and page tests use it. Nothing in the app imports this file.
import { render } from '@testing-library/react';
import { useEffect, useState, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import type { Activity, CourseLesson } from '../../content';
import { LessonPlayerTestProvider, type LessonPlayerMode, type LessonPlayerValue } from '../../lesson';
import { DEFAULT_SETTINGS, emptyProgress, type LessonProgress } from '../../storage';
import { digitalWorld } from './content';

// Drafts taken out of the course (content/courses/digital-world/retired/, October 2026): not loaded by the
// app, kept so the players their activities use (spot-signs, chart-check, the first ask-tool) stay tested.
const retiredModules = import.meta.glob<CourseLesson>('../../../content/courses/digital-world/retired/*.json', {
  eager: true,
  import: 'default',
});

/** A retired draft by its file name ("DW06-scams"), placed in a section the course has so the player can show it. */
export function retiredLesson(name: string): CourseLesson {
  const found = Object.entries(retiredModules).find(([path]) => path.endsWith(`/${name}.json`))?.[1];
  if (!found) throw new Error(`No retired Digital World draft ${name}`);
  return { ...found, section: 'truth-and-power' };
}

/** A Digital World lesson by its number, or a retired draft as it is. */
export function dwLesson(number: number | CourseLesson): CourseLesson {
  if (typeof number !== 'number') return number;
  const lesson = digitalWorld.getLessonByNumber(number);
  if (!lesson) throw new Error(`No Digital World lesson ${number}`);
  return lesson;
}

export function dwActivity<T extends Activity['type']>(number: number | CourseLesson, type: T): Extract<Activity, { type: T }> {
  const activity = dwLesson(number).activity;
  if (activity?.type !== type) throw new Error(`That lesson has no ${type} activity`);
  return activity as Extract<Activity, { type: T }>;
}

export interface Saved {
  /** The progress as the player has it now. */
  progress: LessonProgress;
  /** Every update's options, in order (immediate saves and typing). */
  updates: Array<{ immediate?: boolean } | undefined>;
}

interface PlayerProps {
  lesson: CourseLesson;
  mode: LessonPlayerMode;
  initial: LessonProgress;
  onProgress: (progress: LessonProgress) => void;
  onUpdate: (options: { immediate?: boolean } | undefined) => void;
  children: ReactNode;
}

function Player({ lesson, mode, initial, onProgress, onUpdate, children }: PlayerProps) {
  const [progress, setProgress] = useState<LessonProgress>(initial);
  useEffect(() => onProgress(progress), [progress, onProgress]);
  const value: LessonPlayerValue = {
    lesson,
    section: digitalWorld.getLessonSection(lesson),
    step: 'read',
    status: 'ready',
    mode,
    saving: mode === 'learner',
    progress,
    saveError: false,
    update: (change, options) => {
      onUpdate(options);
      setProgress((p) => change(p));
    },
    flush: () => Promise.resolve(),
    stageEvent: () => undefined,
    readingLevel: 'standard',
    setReadingLevel: () => undefined,
    settings: DEFAULT_SETTINGS,
    setListeningSpeed: () => undefined,
    seedOwner: 'learner-1',
    goTo: () => undefined,
  };
  return <LessonPlayerTestProvider value={value}>{children}</LessonPlayerTestProvider>;
}

/** Renders `ui` inside a Digital World lesson's player; `saved` follows what it saves. */
export function renderInLesson(number: number | CourseLesson, ui: ReactNode, mode: LessonPlayerMode = 'learner') {
  const lesson = dwLesson(number);
  const saved: Saved = { progress: emptyProgress('learner-1', lesson.id), updates: [] };
  const view = render(
    <MemoryRouter>
      <Player
        lesson={lesson}
        mode={mode}
        initial={saved.progress}
        onProgress={(progress) => {
          saved.progress = progress;
        }}
        onUpdate={(options) => saved.updates.push(options)}
      >
        {ui}
      </Player>
    </MemoryRouter>,
  );
  return { view, saved, lesson };
}
