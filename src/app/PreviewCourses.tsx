import { lazy, Suspense } from 'react';
import { useLearnerSession } from '../session';

// Loaded only on a device that has turned a preview course on (src/courses/):
// nothing is downloaded for it anywhere else, and a failed download shows nothing.
const PreviewCourseChoice = lazy(() =>
  import('../courses/routes').then(
    (routes) => ({ default: routes.PreviewCourseChoice }),
    () => ({ default: (_: { current?: string }) => null }),
  ),
);

/**
 * The course choice on the home page and the course map (Our World first,
 * then the preview course), only on a device that has turned a preview
 * course on at its hidden address. Everywhere else, nothing.
 */
export function PreviewCourses({ current }: { current?: string }) {
  const { previewCourses } = useLearnerSession();
  if (previewCourses.length === 0) return null;
  return (
    <Suspense fallback={null}>
      <PreviewCourseChoice current={current} />
    </Suspense>
  );
}
