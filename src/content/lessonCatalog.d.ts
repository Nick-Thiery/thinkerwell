// The lesson catalog, made from content/lessons/*.json and
// content/quizzes/*.json at build time by the lesson catalog plugin in
// vite.config.ts. ./catalog.ts reads it and gives it its type.
declare module 'virtual:thinkerwell/lesson-catalog' {
  const catalog: unknown;
  export default catalog;
}
