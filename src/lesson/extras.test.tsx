import { render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { englishContent } from '../content';
import { createCourseContent } from '../content/courseContent';
import { CourseContentProvider, useLessonContent } from '../content/useContent';
import { LessonExtrasProvider, LessonSlot } from './extras';

// The two things that let the shared lesson pages show another course:
// useLessonContent() (Our World unless a course provides its own) and the
// slots a course fills (nothing in Our World).

describe('LessonSlot', () => {
  it('shows nothing without a course’s extras, so Our World’s pages are unchanged', () => {
    const { container } = render(<LessonSlot name="read:after-evidence" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows what the course puts in that place, and nothing in the others', () => {
    render(
      <LessonExtrasProvider value={{ slot: (name) => (name === 'read:after-evidence' ? <p>An activity</p> : null) }}>
        <LessonSlot name="read:after-evidence" />
        <LessonSlot name="write:before-prompt" />
      </LessonExtrasProvider>,
    );
    expect(screen.getAllByText('An activity')).toHaveLength(1);
  });
});

describe('useLessonContent', () => {
  it('is Our World without a provider', () => {
    const { result } = renderHook(() => useLessonContent());
    expect(result.current.courseId).toBe('our-world');
    expect(result.current.getLesson('towns-near-rivers')?.number).toBe(10);
  });

  it('is the provided course below a CourseContentProvider', () => {
    const course = createCourseContent(
      { ...englishContent.getCourse(), sections: [{ ...englishContent.getSections()[0]!, id: 'made-up', lessons: [] }] },
      [],
      {
        courseId: 'made-up-course',
        pictureUrls: new Map(),
        hasSectionChecks: false,
        sectionLook: () => ({ tone: 'civics', icon: 'Info' }),
        coursePath: () => '/course/made-up-course',
      },
    );
    const wrapper = ({ children }: { children: ReactNode }) => <CourseContentProvider value={course}>{children}</CourseContentProvider>;
    const { result } = renderHook(() => useLessonContent(), { wrapper });
    expect(result.current.courseId).toBe('made-up-course');
    expect(result.current.getSection('made-up')).toBeDefined();
    expect(result.current.hasSectionChecks).toBe(false);
  });
});

describe('Our World’s course details', () => {
  it('keep its own addresses, tints and icons, and its section checks', () => {
    expect(englishContent.courseId).toBe('our-world');
    expect(englishContent.hasSectionChecks).toBe(true);
    expect(englishContent.coursePath()).toBe('/course');
    expect(englishContent.coursePath('history')).toBe('/course#history');
    expect(englishContent.educatorsPath?.('civics')).toBe('/educators?section=civics');
    expect(englishContent.sectionLook('geography')).toEqual({ tone: 'geography', icon: 'Map' });
  });
});
