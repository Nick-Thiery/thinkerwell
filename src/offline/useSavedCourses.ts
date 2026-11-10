/**
 * Which of the courses other than Our World are fully saved on this device
 * (every file of the course and of what the courses share, as "Courses for
 * offline use" in Settings saves them), for the learner Home's offline badge.
 * Read from the kept copies only: nothing is downloaded here. Null while it is
 * being checked; empty where the device keeps nothing.
 */
import { useEffect, useState } from 'react';
import { canKeepCourses, filesOfCourse, loadCourseManifest, storedCourseFiles } from './courseFiles';

export function useSavedCourses(courseIds: readonly string[]): ReadonlySet<string> | null {
  const [saved, setSaved] = useState<ReadonlySet<string> | null>(() => (canKeepCourses() ? null : new Set()));
  const key = courseIds.join(' ');
  useEffect(() => {
    if (!canKeepCourses()) return undefined;
    const controller = new AbortController();
    void (async () => {
      const manifest = await loadCourseManifest(controller.signal);
      if (!manifest) {
        if (!controller.signal.aborted) setSaved(new Set());
        return;
      }
      const done = new Set<string>();
      for (const id of key ? key.split(' ') : []) {
        const files = filesOfCourse(manifest, id);
        if (files.length === 0) continue;
        const stored = await storedCourseFiles(files);
        if (stored.count === files.length) done.add(id);
      }
      if (!controller.signal.aborted) setSaved(done);
    })();
    return () => controller.abort();
  }, [key]);
  return saved;
}
