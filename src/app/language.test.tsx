import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../i18n/messages/en.json';
import { pseudoLonger } from '../i18n/pseudo';
import type * as Locales from '../i18n/locales';
import { deleteAllData, getStore } from '../storage';
import { routes } from './routes';

// en-XA (the accented test language, src/i18n/pseudo.ts) stands in for a
// second ready language: it has every message, and it looks different.
vi.mock('../i18n/locales', async (importOriginal) => {
  const actual = await importOriginal<typeof Locales>();
  return { ...actual, readyLocales: () => [actual.LOCALES[0]!, actual.findLocale('en-XA')!] };
});

async function seed({ device, learners, current }: { device?: string; learners: Array<{ name: string; language?: string }>; current?: string }) {
  const store = await getStore();
  if (device) await store.updateSettings({ language: device });
  const added = [];
  for (const learner of learners) added.push(await store.addLearner({ ...learner, colour: 'lemon' }));
  if (current) await store.setCurrentLearnerId(added.find((l) => l.name === current)!.id);
}

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);
}

const h1 = () => screen.findByRole('heading', { level: 1 });
const greeting = (name: string) => pseudoLonger(en.pages.home.dashboard.greeting).replace('{name}', name);

beforeEach(() => {
  sessionStorage.clear();
  // The learner switcher watches its own size; jsdom has no ResizeObserver.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await deleteAllData();
});

describe('the interface language', () => {
  it("is the learner's own, and switching learner switches it", async () => {
    await seed({ learners: [{ name: 'Amina', language: 'en-XA' }, { name: 'Reza' }], current: 'Amina' });
    renderAt('/');
    await waitFor(async () => expect(await h1()).toHaveTextContent(greeting('Amina')));
    expect(document.documentElement.lang).toBe('en-XA');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Amina/ }));
    const switcher = await screen.findByRole('dialog');
    await user.click(within(switcher).getByRole('button', { name: /Reza/ }));
    await waitFor(async () => expect(await h1()).toHaveTextContent('Hi Reza'));
    expect(document.documentElement.lang).toBe('en');
  });

  it("is the device's on the home screen, and for a learner who hasn't chosen", async () => {
    await seed({ device: 'en-XA', learners: [{ name: 'Reza' }] });
    renderAt('/');
    await waitFor(async () => expect(await h1()).toHaveTextContent(pseudoLonger(en.pages.home.title)));

    await userEvent.setup().click(screen.getByRole('button', { name: /^Reza/ }));
    await waitFor(async () => expect(await h1()).toHaveTextContent(greeting('Reza')));
  });

  it("is the device's while looking around", async () => {
    await seed({ device: 'en-XA', learners: [{ name: 'Amina', language: 'en' }], current: 'Amina' });
    renderAt('/course?preview=true');
    expect(await screen.findByText(pseudoLonger(en.pages.course.guestNote))).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en-XA');
  });

  it('ignores a saved language that is not offered', async () => {
    await seed({ device: 'so', learners: [{ name: 'Amina', language: 'fa-AF' }], current: 'Amina' });
    renderAt('/');
    await waitFor(async () => expect(await h1()).toHaveTextContent('Hi Amina'));
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
