import type { ReactNode } from 'react';
import { useCatalog } from '../../content/useCatalog';
import { Badge, Mascot, STAGE_ICON } from '../../components/ds';
import { commonStages } from '../../content/stages';
import { useI18n } from '../../i18n';
import { LESSON_PHONE_QUERY, useMediaQuery } from '../../lesson/useMediaQuery';

const MASCOT_SRC = '/images/thinkerwell-mascot-transparent.png';

/**
 * The left-hand hero pane shared by the "who's learning" picker and the new
 * learner form (Main.dc.html / NewLearner.dc.html): mascot, tagline and
 * description are always the same; `children` is the part that differs (the
 * five stage badges and footnote, or the "you will start with" card).
 *
 * On a phone the mascot and the tagline are smaller (PhoneHome.dc.html:
 * 120px and 52px), so "Who's learning today?" isn't pushed a whole screen
 * down.
 */
export function HomeHero({ size = 184, children }: { size?: number; children: ReactNode }) {
  const { t } = useI18n();
  const phone = useMediaQuery(LESSON_PHONE_QUERY);
  return (
    <section className="tw-home-hero">
      <Mascot src={MASCOT_SRC} size={phone ? 120 : size} alt={t('app.mascotAlt')} />
      <p className="hero">{t('pages.home.hero.tagline')}</p>
      <p className="body-lg">{t('pages.home.hero.description')}</p>
      {children}
    </section>
  );
}

/** The stage badges (five, or four without Watch in a translated language) and footnote shown on the plain picker view. */
export function HomeHeroStages() {
  const { t } = useI18n();
  const catalog = useCatalog();
  const totalLessons = catalog.getCourse().course.totalLessons;
  const totalSections = catalog.getSections().length;
  const stages = commonStages(catalog.getLessons(), catalog.stagesFor);
  return (
    <div className="tw-home-stages">
      <span className="eyebrow">{t(stages.includes('watch') ? 'pages.home.hero.stagesLabel' : 'pages.home.hero.stagesLabelNoWatch')}</span>
      <div className="tw-home-stages-row">
        {stages.map((stage) => (
          <Badge key={stage} tone="outline" icon={STAGE_ICON[stage]}>
            {t(`stages.${stage}`)}
          </Badge>
        ))}
      </div>
      <p className="small">{t('pages.home.hero.footnote', { lessons: totalLessons, sections: totalSections })}</p>
    </div>
  );
}
