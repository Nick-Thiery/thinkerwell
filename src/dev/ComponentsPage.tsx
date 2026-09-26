import { useI18n } from '../i18n';
import { ActionsSection } from './sections/ActionsSection';
import { ChromeSection } from './sections/ChromeSection';
import { ContentSection } from './sections/ContentSection';
import { CourseSection } from './sections/CourseSection';
import './dev.css';

/**
 * Dev only (see src/app/routes.tsx): every design-system component in its
 * main states, grouped the way the four phase-2 sub-tasks built them.
 * Compare with /dev/reference (the original bundle) and docs/screens.
 *
 * Add `?dir=rtl` to check mirroring (src/i18n/direction.ts).
 */
const JUMP_LINKS = [
  { href: '#chrome', label: 'Chrome' },
  { href: '#course', label: 'Course' },
  { href: '#content', label: 'Content' },
  { href: '#actions', label: 'Actions and voice' },
];

export default function ComponentsPage() {
  const { dir } = useI18n();
  return (
    <div className="tw-dev-components">
      <h1 className="h1" tabIndex={-1}>
        Design-system components
      </h1>
      <p className="body-lg">
        Current direction: <strong>{dir}</strong>. Add <code>?dir=rtl</code> to the address to check mirroring.
      </p>
      <nav className="tw-dev-jumpnav" aria-label="Jump to section">
        <ul role="list">
          {JUMP_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <ChromeSection />
      <CourseSection />
      <ContentSection />
      <ActionsSection />
    </div>
  );
}
