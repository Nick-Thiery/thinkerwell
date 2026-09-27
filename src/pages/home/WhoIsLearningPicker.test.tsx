import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLessons } from '../../content';
import { deleteAllData, type Learner } from '../../storage';
import { WhoIsLearningPicker } from './WhoIsLearningPicker';

afterEach(async () => {
  await deleteAllData();
});

function renderPicker(learners: Learner[]) {
  return render(
    <MemoryRouter>
      <WhoIsLearningPicker
        learners={learners}
        lesson1={getLessons()[0]!}
        onChoose={vi.fn()}
        onAdd={vi.fn(() => Promise.resolve())}
        onRemove={vi.fn(() => Promise.resolve())}
        onLookAround={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe('WhoIsLearningPicker: learners who share a name', () => {
  it('shows the day each was added, so they can be told apart', async () => {
    renderPicker([
      { id: 'a', name: 'Amina', colour: 'lemon', createdAt: '2026-09-02T09:00:00.000Z' },
      { id: 'b', name: 'Yusuf', colour: 'civics', createdAt: '2026-09-03T09:00:00.000Z' },
      { id: 'c', name: 'Amina', colour: 'lemon', createdAt: '2026-09-28T09:00:00.000Z' },
    ]);
    expect(await screen.findByRole('button', { name: /^Amina\s*Not started yet · added Sep 2, 2026$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Amina\s*Not started yet · added Sep 28, 2026$/ })).toBeInTheDocument();
    // Everyone else's tile is as it was.
    expect(screen.getByRole('button', { name: /^Yusuf\s*Not started yet$/ })).toBeInTheDocument();
  });
});
