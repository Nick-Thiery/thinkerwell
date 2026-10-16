// Loaded when a lesson or a section check is first opened (src/app/routes.tsx):
// the lesson player and its stages, the section checks, and the lessons
// themselves (src/content/index.ts brings the `content` chunk).
export { LessonRoute } from '../LessonRoute';
export { SectionCheckRoute } from '../SectionCheckRoute';
// For the reviewers' page (/review/videos, src/courses/routes.tsx): the Watch
// step's player and the duration format, so that page plays videos exactly as a
// lesson does without pulling these out of this chunk into files of their own.
export { PLAYER_ALLOW, PLAYER_REFERRER_POLICY, youtubeEmbedUrl } from '../../pages/lesson/watch/youtube';
export { formatDuration } from '../../lesson/format';
