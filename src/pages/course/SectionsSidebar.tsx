import { Icon, SectionBadge, type SectionId } from '../../components/ds';
import { useI18n } from '../../i18n';
import type { SectionProgress } from '../../storage';
import { SECTION_ICONS } from './sectionIcons';
import type { OverviewSection, SectionLook } from './overviewTypes';

export interface SectionsSidebarProps {
  sections: readonly OverviewSection[];
  /** A section's tint and icon (Our World's own ids by default). */
  looks?: (sectionId: string) => SectionLook;
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
export function SectionsSidebar({ sections, looks, progressBySection, currentSectionId, hideProgress }: SectionsSidebarProps) {
  const { t, contentLang } = useI18n();
  return (
    <nav aria-label={t('pages.course.sectionsNav')} className="tw-course-nav">
      <span className="eyebrow tw-course-nav-label">{t('pages.course.sectionsNav')}</span>
      {sections.map((section) => {
        const progress = progressBySection.get(section.id);
        const look = looks?.(section.id) ?? { tone: section.id as SectionId, icon: SECTION_ICONS[section.id as SectionId] };
        return (
          <a key={section.id} href={`#${section.id}`} className="tw-course-nav-link" aria-current={section.id === currentSectionId ? 'true' : undefined}>
            <SectionBadge section={look.tone} icon={look.icon} showName={false} size={48} />
            <span className="tw-course-nav-name" {...contentLang}>
              {section.title}
            </span>
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
