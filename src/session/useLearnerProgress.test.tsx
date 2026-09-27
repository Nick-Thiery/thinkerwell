import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { deleteAllData, emptyProgress, getStore } from '../storage';
import { useLearnerProgress } from './useLearnerProgress';

afterEach(async () => {
  await deleteAllData();
});

function Probe({ learnerId }: { learnerId: string | null }) {
  const { status, progress } = useLearnerProgress(learnerId);
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="size">{progress.size}</p>
    </div>
  );
}

describe('useLearnerProgress', () => {
  it('is ready with nothing loaded when there is no learner', () => {
    render(<Probe learnerId={null} />);
    expect(screen.getByTestId('status')).toHaveTextContent('ready');
    expect(screen.getByTestId('size')).toHaveTextContent('0');
  });

  it('loads a learner’s saved progress from storage', async () => {
    const store = await getStore();
    const learner = await store.addLearner({ name: 'Amina', colour: 'lemon' });
    await store.updateProgress(learner.id, 'lesson-a', (current) => ({
      ...emptyProgress(learner.id, 'lesson-a'),
      ...current,
      stagesDone: ['read'],
    }));

    render(<Probe learnerId={learner.id} />);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('size')).toHaveTextContent('1');
  });
});
