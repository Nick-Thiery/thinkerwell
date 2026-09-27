import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { getSection, getSectionLessons, type Section } from '../../content';
import { emptyProgress, progressByLessonId, type LessonProgress } from '../../storage';
import { SectionCard } from './SectionCard';

const geography = getSection('geography') as Section;
const lessons = getSectionLessons('geography');

const done = (lessonId: string): LessonProgress => ({
  ...emptyProgress('a', lessonId),
  stagesDone: ['read', 'write', 'speak', 'reflect'],
  completedAt: '2026-09-02T00:00:00.000Z',
});

function renderCard(records: LessonProgress[], { expanded = false, hideProgress = false } = {}) {
  return render(
    <MemoryRouter>
      <SectionCard
        section={geography}
        lessons={lessons}
        progress={progressByLessonId(records)}
        hideProgress={hideProgress}
        expanded={expanded}
        onToggle={() => undefined}
      />
    </MemoryRouter>,
  );
}

describe('SectionCard: the section certificate', () => {
  it('links to it, open or closed, once every lesson is finished (the check is never needed)', () => {
    for (const expanded of [false, true]) {
      const { unmount } = renderCard(lessons.map((lesson) => done(lesson.id)), { expanded });
      const link = screen.getByRole('link', { name: 'Get your certificate for Geography & Our Environment' });
      expect(link).toHaveAttribute('href', '/certificate/section/geography');
      expect(link).toHaveTextContent('Get your certificate');
      unmount();
    }
  });

  it('has no link while a lesson is left', () => {
    renderCard(lessons.slice(0, 4).map((lesson) => done(lesson.id)));
    expect(screen.queryByRole('link', { name: /certificate/ })).not.toBeInTheDocument();
  });

  it('has no link while looking around', () => {
    renderCard(lessons.map((lesson) => done(lesson.id)), { hideProgress: true });
    expect(screen.queryByRole('link', { name: /certificate/ })).not.toBeInTheDocument();
  });
});
