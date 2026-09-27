import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectServiceWorker, resetServiceWorkerForTests } from '../../offline';
import type { Learner } from '../../storage';
import { LearnerDashboard } from './LearnerDashboard';

const learner: Learner = { id: 'a', name: 'Amina', colour: 'lemon', createdAt: '2026-09-01T00:00:00.000Z' };

function renderDashboard() {
  return render(
    <MemoryRouter>
      <LearnerDashboard learner={learner} progress={new Map()} />
    </MemoryRouter>,
  );
}

/** A service worker whose registration has (or hasn't yet) an active worker. */
async function connect(active: boolean): Promise<() => void> {
  let disconnect: () => void = () => undefined;
  await act(async () => {
    disconnect = connectServiceWorker({
      workbox: {
        addEventListener: vi.fn(),
        register: () => Promise.resolve({ active: active ? {} : null } as ServiceWorkerRegistration),
        update: () => Promise.resolve(),
        messageSkipWaiting: vi.fn(),
      },
      isControlled: () => active,
      reload: vi.fn(),
      isOnline: () => true,
      isVisible: () => true,
    });
    await Promise.resolve();
  });
  return disconnect;
}

afterEach(() => {
  resetServiceWorkerForTests();
});

describe('LearnerDashboard: offline badge', () => {
  it('says every lesson works offline once the course is on the device', async () => {
    const disconnect = await connect(true);
    renderDashboard();
    expect(screen.getByText('All 24 lessons work offline')).toBeInTheDocument();
    expect(screen.getByText('Saved on this device')).toBeInTheDocument();
    disconnect();
  });

  it('says the lessons are being saved on the first visit', async () => {
    const disconnect = await connect(false);
    renderDashboard();
    expect(screen.getByText('Saving lessons for offline use')).toBeInTheDocument();
    expect(screen.queryByText(/work offline/)).not.toBeInTheDocument();
    disconnect();
  });

  it('claims nothing where this browser can’t keep the course offline', () => {
    renderDashboard();
    expect(screen.queryByText(/offline/)).not.toBeInTheDocument();
    expect(screen.getByText('Saved on this device')).toBeInTheDocument();
  });
});
