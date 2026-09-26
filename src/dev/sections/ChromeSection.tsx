import { useI18n } from '../../i18n';
import { Badge } from '../../components/ds/Badge';
import type { IconName } from '../../components/ds/types';
import { Logo } from '../../components/ds/Logo';
import { Mascot } from '../../components/ds/Mascot';
import { MascotTip } from '../../components/ds/MascotTip';
import { ProgressBar } from '../../components/ds/ProgressBar';
import { ProgressRing } from '../../components/ds/ProgressRing';
import { SiteHeader } from '../../components/ds/SiteHeader';
import { StageDots } from '../../components/ds/StageDots';
import { StagePath } from '../../components/ds/StagePath';

const MASCOT_SRC = '/images/thinkerwell-mascot-transparent.png';

/**
 * /dev/components: Logo, Mascot, MascotTip, SiteHeader, StagePath, StageDots,
 * ProgressRing, ProgressBar, Badge in their main states.
 *
 * StagePath and StageDots below use Read and Write done, Speak current, Watch
 * and Reflect not started, so a reviewer can see the mix and that nothing is
 * ever visually locked. Add `?dir=rtl` to the page address to check that
 * everything here mirrors (see AppLayout's `?dir=rtl` switch).
 */
export function ChromeSection() {
  const { t } = useI18n();
  const links: Array<{ label: string; href: string; icon?: IconName; active?: boolean }> = [
    { label: t('nav.home'), href: '/', icon: 'Home' },
    { label: t('nav.course'), href: '/course', icon: 'BookOpen', active: true },
    { label: t('nav.journal'), href: '/journal' },
    { label: t('nav.educators'), href: '/educators' },
    { label: t('nav.about'), href: '/about' },
  ];
  const learner = { name: 'Amina', tone: 'lavender' };

  return (
    <section id="chrome" className="tw-dev-section" aria-label="Chrome components">
      <h2 className="h2">Chrome: Logo, Mascot, SiteHeader, StagePath, StageDots, ProgressRing, ProgressBar, Badge</h2>

      <h3 className="h3">SiteHeader (full, with a learner; full, no learner; compact)</h3>
      {/*
       * The full (non-compact) layout is meant for wide viewports; a real
       * page picks one variant for the width it is rendered at. This dev
       * page shows every variant at once, so the wide ones scroll inside
       * their own box on a narrow device instead of widening the page.
       */}
      <div style={{ overflowX: 'auto' }}>
        <SiteHeader logoSrc={MASCOT_SRC} links={links} learner={learner} />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <SiteHeader logoSrc={MASCOT_SRC} links={links} learner={null} />
      </div>
      <SiteHeader logoSrc={MASCOT_SRC} learner={learner} compact />

      <h3 className="h3">Logo, Mascot and MascotTip</h3>
      <div className="tw-dev-row">
        <Logo src={MASCOT_SRC} />
        <Logo src={MASCOT_SRC} wordmark={false} />
        <Mascot src={MASCOT_SRC} size={120} />
        <MascotTip src={MASCOT_SRC} size={80}>
          Look for a detail on the object itself.
        </MascotTip>
      </div>

      <h3 className="h3">StagePath: horizontal, vertical (with a sublabel) and compact</h3>
      {/* Horizontal is meant for a tablet-width rail; it does not wrap, so it
          scrolls inside its own box rather than widening a narrow page. */}
      <div style={{ overflowX: 'auto' }}>
        <StagePath current="speak" done={['read', 'write']} />
      </div>
      <StagePath
        current="speak"
        done={['read', 'write']}
        orientation="vertical"
        sublabels={{ read: '3 parts · quick check' }}
      />
      {/* Compact is sized for a phone's own page padding (space-4); this dev
          page's fixed padding (dev.css) is slightly wider, so wrap it too. */}
      <div style={{ overflowX: 'auto' }}>
        <StagePath current="speak" done={['read', 'write']} compact />
      </div>

      <h3 className="h3">StageDots and progress</h3>
      <div className="tw-dev-row">
        <StageDots current="speak" done={['read', 'write']} />
        <ProgressRing value={3} max={5} />
        <ProgressRing value={0} max={5} label={null} ariaLabel="No sections started yet" />
      </div>
      <ProgressBar value={3} max={10} label="Question 3 of 10" />

      <h3 className="h3">Badge</h3>
      <div className="tw-dev-row">
        <Badge tone="lemon">Optional</Badge>
        <Badge tone="lavender">Help</Badge>
        <Badge tone="outline">Draft</Badge>
        <Badge tone="correct" icon="Check">
          Correct
        </Badge>
        <Badge tone="retry" icon="RotateCcw">
          Not quite yet
        </Badge>
        <Badge tone="ink">New</Badge>
        <Badge tone="history">History</Badge>
        <Badge tone="geography">Geography</Badge>
        <Badge tone="culture">Culture</Badge>
        <Badge tone="civics">Civics</Badge>
      </div>
    </section>
  );
}
