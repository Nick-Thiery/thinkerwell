import { useEffect, useRef } from 'react';
import type { Section } from '../../content';
import { Icon } from '../../components/ds';
import { useI18n } from '../../i18n';
import { SECTION_ICONS } from './sectionIcons';

export interface SectionChipsProps {
  sections: readonly Section[];
  /** The section holding the learner's next step: shown pressed/ink, and scrolled into view. */
  currentSectionId?: string;
}

/**
 * Phone-only row of section chips that jump to each section's `#id` anchor.
 * These are plain anchors styled with the ds Chip's own `tw-chip` class,
 * not the Chip component itself: Chip only ever renders a `<button>`
 * (docs/design-system's one-tap-choice component), and a fragment jump
 * needs a real link a keyboard or screen-reader user can open in a new tab
 * or see as a link. Hidden above 1024px in CoursePage.css in favour of
 * SectionsSidebar.
 */
export function SectionChips({ sections, currentSectionId }: SectionChipsProps) {
  const { t, contentLang } = useI18n();
  const currentRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [currentSectionId]);

  return (
    <nav aria-label={t('pages.course.sectionsNav')} className="tw-course-chips">
      {sections.map((section) => {
        const isCurrent = section.id === currentSectionId;
        return (
          <a key={section.id} href={`#${section.id}`} className="tw-chip" aria-current={isCurrent ? 'true' : undefined} ref={isCurrent ? currentRef : undefined}>
            <Icon name={SECTION_ICONS[section.id]} size={18} />
            <span {...contentLang}>{section.title}</span>
          </a>
        );
      })}
    </nav>
  );
}
