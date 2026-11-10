import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { routes } from '../app/routes';
import { LearnerSessionProvider, useLearnerSession } from '../session';
import { deleteAllData } from '../storage';
import { courseFilesManifest, isPreviewModule, previewAssetFileName, previewChunkFileName, previewCourseOfModule, PREVIEW_PRECACHE_IGNORES } from './build';

// The courses every device shows (src/content/courses.ts, `open`), their pages,
// and how the build keeps their code out of a first visit's download.

afterEach(async () => {
  await deleteAllData();
});

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('the courses every device shows', () => {
  it('shows the course choice on the course map with no setting turned on, Our World first, with no "draft"', async () => {
    renderAt('/course');
    const choice = await screen.findByRole('navigation', { name: 'Courses' });
    const links = choice.querySelectorAll('a');
    expect([...links].map((link) => link.getAttribute('href'))).toEqual([
      '/course',
      '/course/digital-world',
      '/course/southeast-asia-through-time',
      '/course/art-architecture-society',
    ]);
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    expect(links[1]).toHaveTextContent('Digital World');
    expect(links[3]).toHaveTextContent('Art, Architecture and Society');
    expect(choice).not.toHaveTextContent(/draft/i);
  });

  it('marks the course on screen in the choice on another course’s map', async () => {
    renderAt('/course/southeast-asia-through-time');
    const choice = await screen.findByRole('navigation', { name: 'Courses' });
    expect(choice.querySelectorAll('a')).toHaveLength(4);
    expect(screen.getByRole('link', { name: 'Southeast Asia Through Time' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { level: 1, name: 'Southeast Asia Through Time' })).toBeInTheDocument();
  });

  it('shows Digital World’s map in Our World’s layout: its four sections, with no overview-only notices, section checks or teacher directory', async () => {
    renderAt('/course/digital-world');
    expect(await screen.findByRole('heading', { level: 1, name: 'Digital World' })).toBeInTheDocument();
    expect(screen.queryByText(/Draft course/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Turn preview off' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Digital World is new/)).not.toBeInTheDocument();
    expect(screen.queryByText(/still checking its facts/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tell us what to fix' })).not.toBeInTheDocument();
    expect(screen.queryByText(/no section checks or certificates/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'How AI developed and how it works',
      'Who builds AI, and at what cost',
      'AI in daily life',
      'Truth, power and choices',
    ]);
    expect(screen.queryByText(/Section check:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'For teachers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Teacher guide, Lesson 3/ })).not.toBeInTheDocument();
  });

  it('sends the old hidden address of a course to its map', async () => {
    const router = renderAt('/preview/digital-world');
    expect(await screen.findByRole('heading', { level: 1, name: 'Digital World' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/course/digital-world');
  });

  it('opens a lesson with its optional extension folded after the evidence, and a different case of its id redirects', async () => {
    const router = renderAt('/lesson/DW-How-AI-Learns');
    expect(await screen.findByRole('heading', { level: 1, name: 'How AI learns from examples' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/lesson/dw-how-ai-learns/read');
    // Lesson 3's leaf model is an optional extension (Justin's brief of 4 November 2026), folded away until wanted.
    expect(await screen.findByText('Try it yourself (optional)')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Try the leaf model', hidden: true })).toBeInTheDocument();
    // Back to the course goes to Digital World's map, at the lesson's section.
    expect(screen.getByRole('link', { name: 'How AI developed and how it works' })).toHaveAttribute('href', '/course/digital-world#thinking-machines');
    expect(screen.queryByText(/Draft course/)).not.toBeInTheDocument();
  });

  it('opens the other two courses’ lessons and teacher guides too', async () => {
    renderAt('/educators/lesson/sat-01-ban-chiang-pot');
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the course' })).toHaveAttribute('href', '/course/southeast-asia-through-time#evidence-and-connections');
  });

  it('prints every lesson, with the four activities on paper', async () => {
    renderAt('/course/digital-world/print');
    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(17);
    // The course's name is marked as English inside the note, so match the whole note.
    const notes = [...document.querySelectorAll('.tw-pc-sheet-note')].map((note) => note.textContent);
    expect(notes).toEqual(Array(17).fill('Digital World: a new course. Its facts are still being checked.'));
    expect(screen.getAllByRole('heading', { level: 2, name: 'Activity' })).toHaveLength(3);
    expect(screen.getAllByRole('heading', { level: 2, name: 'Optional extension' })).toHaveLength(1);
  });

  it('gives each lesson a teacher guide with the activity, its answers and the notes for reviewers', async () => {
    renderAt('/educators/lesson/dw-checking-a-claim');
    expect(await screen.findByRole('heading', { level: 1, name: 'Checking a claim before you share it' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'The activity' })).toBeInTheDocument();
    expect(screen.getAllByText('Correct answer').length).toBeGreaterThan(1);
    expect(screen.getByRole('heading', { level: 2, name: 'For reviewers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the course' })).toHaveAttribute('href', '/course/digital-world#truth-and-power');
  });
});

describe('the session', () => {
  function Probe() {
    const { previewCourses, setPreviewCourse, status } = useLearnerSession();
    if (status === 'loading') return null;
    return (
      <>
        <p data-testid="courses">{previewCourses.join(',')}</p>
        <button type="button" onClick={() => void setPreviewCourse('digital-world', false)}>
          off
        </button>
      </>
    );
  }

  it('shows every open course on a device with nothing set, and turning one “off” does not hide it', async () => {
    const user = userEvent.setup();
    render(
      <LearnerSessionProvider>
        <Probe />
      </LearnerSessionProvider>,
    );
    const all = 'digital-world,southeast-asia-through-time,art-architecture-society';
    expect(await screen.findByTestId('courses')).toHaveTextContent(all);
    await user.click(screen.getByRole('button', { name: 'off' }));
    expect(screen.getByTestId('courses')).toHaveTextContent(all);
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
    // What two courses share (the kit and its words) has no entry of its own.
    expect(previewChunkFileName({ facadeModuleId: null, moduleIds: ['/repo/src/courses/kit/Frame.tsx', '\0tw-messages:previewCourse'] })).toBe(
      'assets/preview/[name]-[hash].js',
    );
    expect(previewChunkFileName({ facadeModuleId: null, moduleIds: ['/repo/src/courses/kit/Frame.tsx', '/repo/src/pages/lesson/LessonPage.tsx'] })).toBeNull();
    expect(previewAssetFileName({ originalFileNames: ['src/courses/kit/previewCourse.css'] })).toBe('assets/preview/[name]-[hash][extname]');
    expect(previewAssetFileName({ originalFileNames: ['content/courses/southeast-asia-through-time/visuals/SAT01-photo.jpg'] })).toBe(
      'assets/preview/southeast-asia-through-time/[name]-[hash][extname]',
    );
    expect(previewAssetFileName({ originalFileNames: ['src/courses/digital-world/digitalWorld.css'] })).toBe('assets/preview/digital-world/[name]-[hash][extname]');
    expect(previewAssetFileName({ originalFileNames: ['content/visuals/L01.svg'] })).toBeNull();
    expect(PREVIEW_PRECACHE_IGNORES).toEqual(['assets/preview/**']);
  });

  it('lists every course’s files for offline use, what the courses share apart, and leaves the reviewers’ page out', () => {
    const manifest = courseFilesManifest([
      { fileName: 'assets/index-abc.js', bytes: 9 },
      { fileName: 'assets/preview/routes-1.js', bytes: 100 },
      { fileName: 'assets/preview/previewCourse-1.css', bytes: 10 },
      { fileName: 'assets/preview/digital-world/index-2.js', bytes: 300 },
      { fileName: 'assets/preview/art-architecture-society/AAS-01-A-3.jpg', bytes: 5000 },
      { fileName: 'assets/preview/video-review/index-4.js', bytes: 7 },
    ]);
    expect(manifest.shared).toEqual([
      { url: '/assets/preview/previewCourse-1.css', bytes: 10 },
      { url: '/assets/preview/routes-1.js', bytes: 100 },
    ]);
    expect(manifest.courses['digital-world']).toEqual([{ url: '/assets/preview/digital-world/index-2.js', bytes: 300 }]);
    expect(manifest.courses['art-architecture-society']).toHaveLength(1);
    expect(manifest.courses['southeast-asia-through-time']).toEqual([]);
    expect(JSON.stringify(manifest)).not.toContain('video-review');
    // A folder that is no course stops the build rather than being left out of an offline copy.
    expect(() => courseFilesManifest([{ fileName: 'assets/preview/mystery/x.js', bytes: 1 }])).toThrow(/no course/);
  });
});
