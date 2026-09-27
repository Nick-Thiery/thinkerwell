/**
 * Whether a header link is the current page. Lessons and section checks are
 * part of the course, so "Course" stays marked (and aria-current) there, as
 * on every lesson screen in docs/screens. The teacher guides and answer keys
 * (/educators/...) are part of "For educators".
 */
export function isNavLinkActive(to: string, pathname: string): boolean {
  if (to === '/course') {
    return pathname === '/course' || pathname.startsWith('/lesson/') || pathname.startsWith('/section/');
  }
  if (to === '/educators') {
    return pathname === '/educators' || pathname.startsWith('/educators/');
  }
  return pathname === to;
}
