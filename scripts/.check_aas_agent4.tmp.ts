import { readFileSync, readdirSync } from 'node:fs';
import { artLessonSchema, artCourseFileSchema } from '/home/claude/thinkerwell/src/content/schema';
const dir = '/home/claude/thinkerwell/content/courses/art-architecture-society';
const c = artCourseFileSchema.safeParse(JSON.parse(readFileSync(`${dir}/course.json`, 'utf8')));
console.log('course.json', c.success ? 'ok' : JSON.stringify(c.error.issues.slice(0, 3)));
for (const f of readdirSync(`${dir}/lessons`).sort()) {
  const r = artLessonSchema.safeParse(JSON.parse(readFileSync(`${dir}/lessons/${f}`, 'utf8')));
  console.log(f, r.success ? 'ok' : JSON.stringify(r.error.issues.slice(0, 4)));
}
