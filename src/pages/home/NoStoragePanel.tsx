import { Button } from '../../components/ds';
import { useI18n } from '../../i18n';

export interface NoStoragePanelProps {
  onLookAround: () => void;
}

/** Shown when IndexedDB isn't available at all (some private windows): explain, then offer to look around. */
export function NoStoragePanel({ onLookAround }: NoStoragePanelProps) {
  const { t } = useI18n();
  return (
    <div className="tw-home-message">
      <h1 className="h1" tabIndex={-1}>
        {t('pages.home.noStorage.title')}
      </h1>
      <p className="body-lg">{t('pages.home.noStorage.body')}</p>
      <Button variant="primary" onClick={onLookAround}>
        {t('pages.home.noStorage.cta')}
      </Button>
    </div>
  );
}
