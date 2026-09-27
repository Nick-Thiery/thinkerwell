import type { ReactNode } from 'react';
import { getCourse, getSections } from '../../content';
import { Badge, Mascot } from '../../components/ds';
import { useI18n } from '../../i18n';
import { LESSON_PHONE_QUERY, useMediaQuery } from '../../lesson';

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
      <Mascot src={MASCOT_SRC} size={phone ? 120 : size} />
      <p className="hero">{t('pages.home.hero.tagline')}</p>
      <p className="body-lg">{t('pages.home.hero.description')}</p>
      {children}
    </section>
  );
}

/** The five stage badges and footnote shown on the plain picker view. */
export function HomeHeroStages() {
  const { t } = useI18n();
  const totalLessons = getCourse().course.totalLessons;
  const totalSections = getSections().length;
  return (
    <div className="tw-home-stages">
      <span className="eyebrow">{t('pages.home.hero.stagesLabel')}</span>
      <div className="tw-home-stages-row">
        <Badge tone="outline" icon="BookOpen">
          {t('stages.read')}
        </Badge>
        <Badge tone="outline" icon="Pencil">
          {t('stages.write')}
        </Badge>
        <Badge tone="outline" icon="MessageCircle">
          {t('stages.speak')}
        </Badge>
        <Badge tone="outline" icon="Play">
          {t('stages.watch')}
        </Badge>
        <Badge tone="outline" icon="RefreshCw">
          {t('stages.reflect')}
        </Badge>
      </div>
      <p className="small">{t('pages.home.hero.footnote', { lessons: totalLessons, sections: totalSections })}</p>
    </div>
  );
}
