import type { Section } from '../../content';
import { Icon, SectionBadge } from '../../components/ds';
import { useI18n } from '../../i18n';
import type { SectionProgress } from '../../storage';

export interface SectionsSidebarProps {
  sections: readonly Section[];
  /** Section id to its completed/total, or undefined (guest) to show every count as 0. */
  progressBySection: ReadonlyMap<string, SectionProgress>;
  /** The section holding the learner's next step, outlined in ink ("you are here"). */
  currentSectionId?: string;
  /** True while looking around: the count is left off rather than shown as a misleading 0. */
  hideProgress?: boolean;
}

/**
 * Desktop-only jump list to each section (plain in-page `#id` anchors, not
 * client-side routes) with the "nothing is locked" note underneath. Hidden
 * under 1024px in favour of SectionChips, in CoursePage.css (a pure CSS
 * toggle: both are just anchor jumps, so no JS breakpoint is needed).
 */
export function SectionsSidebar({ sections, progressBySection, currentSectionId, hideProgress }: SectionsSidebarProps) {
  const { t } = useI18n();
  return (
    <nav aria-label={t('pages.course.sectionsNav')} className="tw-course-nav">
      <span className="eyebrow tw-course-nav-label">{t('pages.course.sectionsNav')}</span>
      {sections.map((section) => {
        const progress = progressBySection.get(section.id);
        return (
          <a key={section.id} href={`#${section.id}`} className="tw-course-nav-link" aria-current={section.id === currentSectionId ? 'true' : undefined}>
            <SectionBadge section={section.id} showName={false} size={40} />
            <span className="tw-course-nav-name">{section.title}</span>
            {hideProgress ? null : (
              <span className="tw-course-nav-count">{t('pages.course.sidebarCount', { completed: progress?.completed ?? 0, total: progress?.total ?? section.lessons.length })}</span>
            )}
          </a>
        );
      })}
      <div className="tw-course-nav-note">
        <Icon name="Info" size={20} />
        <span>{t('pages.course.nothingLocked')}</span>
      </div>
    </nav>
  );
}
