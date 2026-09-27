import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getLessons, getVisualUrl, type Visual } from '../../../content';
import { LessonVisual } from './LessonVisual';

describe('LessonVisual', () => {
  it.each(getLessons().map((lesson) => [lesson.number, lesson] as const))(
    'shows the picture for Lesson %i with its alt text',
    (_number, lesson) => {
      expect(lesson.visual).not.toBeNull();
      render(<LessonVisual visual={lesson.visual} />);
      const img = screen.getByRole('img', { name: lesson.visual!.alt });
      expect(img).toHaveAttribute('src', getVisualUrl(lesson.visual!.src));
    },
  );

  it('renders nothing when there is no visual at all', () => {
    const { container } = render(<LessonVisual visual={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the picture file does not exist', () => {
    const visual: Visual = { type: 'map', description: 'A map.', alt: 'A map.', src: 'visuals/missing.svg' };
    const { container } = render(<LessonVisual visual={visual} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('never shows the team-only description to learners', () => {
    const lesson = getLessons().find((l) => l.number === 10)!;
    render(<LessonVisual visual={lesson.visual} />);
    const figure = screen.getByRole('figure');
    expect(figure).toHaveClass('tw-lesson-visual');
    expect(figure.textContent).not.toContain(lesson.visual!.description);
  });
});
