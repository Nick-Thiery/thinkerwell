/**
 * The class views' styles (/teach, /program, /admin), a file of its own
 * (`?url`: built into assets/preview/class-views/, src/courses/build.ts)
 * added with a <link> when one of the pages first loads, so the site's one
 * stylesheet, which every learner downloads, never carries them. Like the
 * video reviewers' page (src/courses/video-review/stylesheet.ts).
 */
import href from './classViews.css?url';

function addStylesheet(): void {
  if (typeof document === 'undefined' || document.querySelector('link[data-course="class-views"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.course = 'class-views';
  document.head.append(link);
}

addStylesheet();
