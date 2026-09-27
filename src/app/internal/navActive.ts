/**
 * Whether a header link is the current page. Lessons and section checks are
 * part of the course, so "Course" stays marked (and aria-current) there, as
 * on every lesson screen in docs/screens.
 */
export function isNavLinkActive(to: string, pathname: string): boolean {
  if (to === '/course') {
    return pathname === '/course' || pathname.startsWith('/lesson/') || pathname.startsWith('/section/');
  }
  return pathname === to;
}
