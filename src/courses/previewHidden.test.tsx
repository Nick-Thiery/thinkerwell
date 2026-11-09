import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

// A course that is not marked `open` stays what a hidden preview always was: invisible unless a
// device turns it on at /preview/<id>. Here Digital World is made one, as a future draft course would be.
vi.mock('../content/courses', async (importOriginal) => {
  const original = await importOriginal<typeof import('../content/courses')>();
  const courses = original.COURSES.map((course) => (course.id === 'digital-world' ? { ...course, open: false } : course));
  const previews = courses.filter((course) => course.preview);
  return {
    ...original,
    COURSES: courses,
    PREVIEW_COURSES: previews,
    OPEN_COURSE_IDS: courses.filter((course) => course.open).map((course) => course.id),
    findPreviewCourse: (id: string | undefined) => (id === undefined ? undefined : previews.find((course) => course.id === id.toLowerCase())),
    previewCourseOfLesson: (lessonId: string | undefined) => (lessonId ? previews.find((course) => lessonId.toLowerCase().startsWith(course.lessonIdPrefix)) : undefined),
  };
});

const { routes } = await import('../app/routes');
const { deleteAllData, getStore } = await import('../storage');

afterEach(async () => {
  await deleteAllData();
});

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('a course that is not open', () => {
  it.each(['/course/digital-world', '/lesson/dw-what-ai-is/read', '/educators/lesson/dw-what-ai-is'])('%s is "This page isn\'t here"', async (path) => {
    renderAt(path);
    expect(await screen.findByRole('heading', { level: 1, name: "This page isn't here" })).toBeInTheDocument();
  });

  it('is left out of the course choice', async () => {
    renderAt('/course');
    const choice = await screen.findByRole('navigation', { name: 'Courses' });
    expect(choice).not.toHaveTextContent('Digital World');
    expect(choice.querySelectorAll('a')).toHaveLength(3);
  });

  it('turns on at its hidden address, saved for this device, and then shows in the choice', async () => {
    const user = userEvent.setup();
    renderAt('/preview/digital-world');
    expect(await screen.findByRole('heading', { level: 1, name: 'Digital World preview is on' })).toBeInTheDocument();
    await waitFor(async () => expect((await (await getStore()).getSettings()).previewCourses).toEqual(['digital-world']));
    await user.click(screen.getByRole('link', { name: /Open Digital World/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Digital World' })).toBeInTheDocument();
    expect(await screen.findByRole('navigation', { name: 'Courses' })).toHaveTextContent('Digital World');
  });
});
