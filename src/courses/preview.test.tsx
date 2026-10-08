import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { routes } from '../app/routes';
import { LearnerSessionProvider, useLearnerSession } from '../session';
import { deleteAllData, getStore } from '../storage';
import { isPreviewModule, previewAssetFileName, previewChunkFileName, previewCourseOfModule, PREVIEW_PRECACHE_IGNORES } from './build';

// The preview switch (/preview/<id>), the course's pages behind it, and how
// the build keeps them out of everyone else's download.

afterEach(async () => {
  await deleteAllData();
});

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

async function turnOn() {
  const store = await getStore();
  await store.updateSettings({ previewCourses: ['digital-world'] });
}

describe('with the preview off (every device but one that turned it on)', () => {
  it.each(['/course/digital-world', '/course/digital-world/print', '/lesson/dw-what-ai-is/read', '/lesson/dw-what-ai-is/print', '/educators/lesson/dw-what-ai-is'])(
    '%s is "This page isn\'t here"',
    async (path) => {
      renderAt(path);
      expect(await screen.findByRole('heading', { level: 1, name: "This page isn't here" })).toBeInTheDocument();
      expect(document.querySelector('link[data-course]')).toBeNull();
    },
  );

  it('shows no course choice on the course map', async () => {
    renderAt('/course');
    expect(await screen.findByRole('heading', { level: 1, name: 'Exploring Our World' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Courses on this device' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Digital World/)).not.toBeInTheDocument();
  });

  it('turns it on at its hidden address, saved for this device', async () => {
    renderAt('/preview/digital-world');
    expect(await screen.findByRole('heading', { level: 1, name: 'Digital World preview is on' })).toBeInTheDocument();
    await waitFor(async () => expect((await (await getStore()).getSettings()).previewCourses).toEqual(['digital-world']));
    expect(screen.getByText('Draft course: not yet reviewed')).toBeInTheDocument();
  });
});

describe('with the preview on', () => {
  it('shows the course choice on the course map, Our World first', async () => {
    await turnOn();
    renderAt('/course');
    const choice = await screen.findByRole('navigation', { name: 'Courses on this device' });
    const links = await waitFor(() => {
      const found = choice.querySelectorAll('a');
      expect(found).toHaveLength(2);
      return found;
    });
    expect(links[0]).toHaveTextContent('Exploring Our World');
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    expect(links[1]).toHaveTextContent('Digital WorldDraft');
    expect(links[1]).toHaveAttribute('href', '/course/digital-world');
  });

  it('shows Digital World’s map with the draft banner, its four sections and no section checks', async () => {
    await turnOn();
    renderAt('/course/digital-world');
    expect(await screen.findByRole('heading', { level: 1, name: 'Digital World' })).toBeInTheDocument();
    expect(screen.getByText('Draft course: not yet reviewed')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'How AI works',
      'Check what you see',
      'Use tools wisely',
      'AI where you live',
      'For teachers and reviewers',
    ]);
    expect(screen.queryByText(/Section check:/)).not.toBeInTheDocument();
    expect(screen.getByText('There are no section checks or certificates in this draft yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Teacher guide, Lesson 2: How AI learns from examples/ })).toHaveAttribute('href', '/educators/lesson/dw-how-ai-learns');
  });

  it('opens a lesson with its activity after the evidence, and a different case of its id redirects', async () => {
    await turnOn();
    const router = renderAt('/lesson/DW-How-AI-Learns');
    expect(await screen.findByRole('heading', { level: 1, name: 'How AI learns from examples' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/lesson/dw-how-ai-learns/read');
    expect(await screen.findByRole('heading', { level: 3, name: 'Train the leaf model' })).toBeInTheDocument();
    // Back to the course goes to Digital World's map, at the lesson's section.
    expect(screen.getByRole('link', { name: 'How AI works' })).toHaveAttribute('href', '/course/digital-world#how-ai-works');
  });

  it('turns off from the banner, back to Our World, and the course is gone again', async () => {
    const user = userEvent.setup();
    await turnOn();
    const router = renderAt('/course/digital-world');
    await screen.findByRole('heading', { level: 1, name: 'Digital World' });
    await user.click(screen.getByRole('button', { name: 'Turn preview off' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Exploring Our World' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/course');
    await waitFor(async () => expect((await (await getStore()).getSettings()).previewCourses).toEqual([]));
    await router.navigate('/course/digital-world');
    expect(await screen.findByRole('heading', { level: 1, name: "This page isn't here" })).toBeInTheDocument();
  });

  it('prints every lesson, each with its activity on paper', async () => {
    await turnOn();
    renderAt('/course/digital-world/print');
    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(11);
    expect(screen.getAllByText("Digital World, draft course: not yet reviewed. Don't use it with learners yet.")).toHaveLength(11);
    expect(screen.getAllByRole('heading', { level: 2, name: 'Activity' })).toHaveLength(11);
  });

  it('gives each lesson a teacher guide with the activity, its answers and the notes for reviewers', async () => {
    await turnOn();
    renderAt('/educators/lesson/dw-checking-a-claim');
    expect(await screen.findByRole('heading', { level: 1, name: 'Checking a claim before you share it' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'The activity' })).toBeInTheDocument();
    expect(screen.getAllByText('Correct answer').length).toBeGreaterThan(1);
    expect(screen.getByRole('heading', { level: 2, name: 'For reviewers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the course' })).toHaveAttribute('href', '/course/digital-world#check-what-you-see');
  });
});

describe('the session', () => {
  function Probe() {
    const { previewCourses, setPreviewCourse, status } = useLearnerSession();
    if (status === 'loading') return null;
    return (
      <>
        <p data-testid="courses">{previewCourses.join(',')}</p>
        <button type="button" onClick={() => void setPreviewCourse('digital-world', true)}>
          on
        </button>
        <button type="button" onClick={() => void setPreviewCourse('digital-world', false)}>
          off
        </button>
      </>
    );
  }

  it('keeps preview courses as an optional device setting, read again on the next visit', async () => {
    const user = userEvent.setup();
    const first = render(
      <LearnerSessionProvider>
        <Probe />
      </LearnerSessionProvider>,
    );
    expect(await screen.findByTestId('courses')).toHaveTextContent('');
    await user.click(screen.getByRole('button', { name: 'on' }));
    await user.click(screen.getByRole('button', { name: 'on' }));
    expect(screen.getByTestId('courses')).toHaveTextContent('digital-world');
    await waitFor(async () => expect((await (await getStore()).getSettings()).previewCourses).toEqual(['digital-world']));
    first.unmount();

    render(
      <LearnerSessionProvider>
        <Probe />
      </LearnerSessionProvider>,
    );
    expect(await screen.findByTestId('courses')).toHaveTextContent('digital-world');
  });
});

describe('the build', () => {
  it('finds a preview course’s modules: its code, its content and its own words', () => {
    expect(previewCourseOfModule('/repo/src/courses/digital-world/activities/Sort.tsx')).toBe('digital-world');
    expect(previewCourseOfModule('C:\\repo\\content\\courses\\digital-world\\lessons\\DW01.json')).toBe('digital-world');
    expect(previewCourseOfModule('\0tw-course-messages:digital-world')).toBe('digital-world');
    expect(previewCourseOfModule('/repo/content/lessons/L01.json')).toBeNull();
    expect(previewCourseOfModule('/repo/src/pages/lesson/LessonPage.tsx')).toBeNull();
    // The door to the courses is a preview module too; the build-only helpers aren't in the browser at all.
    expect(isPreviewModule('/repo/src/courses/routes.tsx')).toBe(true);
    expect(isPreviewModule('/repo/src/courses/build.ts')).toBe(false);
  });

  it('puts them in assets/preview/, which the service worker never precaches', () => {
    expect(previewChunkFileName({ facadeModuleId: '/repo/src/courses/digital-world/index.tsx' })).toBe('assets/preview/digital-world/[name]-[hash].js');
    expect(previewChunkFileName({ facadeModuleId: '/repo/src/courses/routes.tsx' })).toBe('assets/preview/[name]-[hash].js');
    expect(previewChunkFileName({ facadeModuleId: '/repo/src/app/lazy/lessonPages.ts' })).toBeNull();
    expect(previewChunkFileName({ facadeModuleId: null })).toBeNull();
    expect(previewAssetFileName({ originalFileNames: ['src/courses/digital-world/digitalWorld.css'] })).toBe('assets/preview/digital-world/[name]-[hash][extname]');
    expect(previewAssetFileName({ originalFileNames: ['content/visuals/L01.svg'] })).toBeNull();
    expect(PREVIEW_PRECACHE_IGNORES).toEqual(['assets/preview/**']);
  });
});
