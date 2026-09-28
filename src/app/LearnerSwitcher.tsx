import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Icon, LearnerTile } from '../components/ds';
import { useI18n } from '../i18n';
import { addedOn, learnersWithSameName } from '../session';
import type { Learner } from '../storage';
import { trapTabKey } from './internal/focusTrap';
import './LearnerSwitcher.css';

export interface LearnerSwitcherProps {
  /**
   * The header's learner chip that opened this switcher, so closing can
   * return focus to it and so its own pointerdown never counts as
   * "outside". Passed explicitly by the caller (captured from the click
   * event that opened this) rather than read back from
   * document.activeElement: Safari (Mac and iPad) and Firefox on Mac don't
   * reliably focus a button on click, so activeElement can be <body> or
   * whatever had focus before, which used to leave outside clicks unable to
   * close the popover and Escape unable to return focus (r2-spec-2).
   */
  trigger: HTMLElement | null;
  learners: Learner[];
  currentLearnerId: string | null;
  onChoose: (id: string) => void;
  onLookAround: () => void;
  /** "I'm new here": clears the current learner and opens the new-learner form directly. */
  onAddNew: () => void;
  /** Clears the current learner and shows the full "who's learning" grid, with nobody picked. */
  onBackToPicker: () => void;
  onClose: () => void;
}

/**
 * The popover the header's learner chip opens: every learner on this device,
 * "I'm new here", "Just look around" and a way back to the full picker.
 * Escape or an outside click closes it and returns focus to the chip that
 * opened it; a second click on that same chip also closes it (the chip's own
 * pointerdown is deliberately excluded from "outside", or its click handler
 * toggling the state straight back open would fight this).
 */
export function LearnerSwitcher({ trigger, learners, currentLearnerId, onChoose, onLookAround, onAddNew, onBackToPicker, onClose }: LearnerSwitcherProps) {
  const { t, formatDate } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Whether the tile list has content below the fold. Drives the bottom
  // fade on .tw-switcher-scroll, since an overlay scrollbar can be
  // invisible until touched and a clipped last row otherwise looks like a
  // complete list (r3-browser-1).
  const [hasMoreBelow, setHasMoreBelow] = useState(false);
  // Captured once, at mount (the caller mounts a fresh LearnerSwitcher every
  // time it opens), rather than re-read from the `trigger` prop on every
  // render.
  const triggerRef = useRef<Element | null>(trigger);

  const close = useCallback(() => {
    onClose();
    if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
  }, [onClose]);

  useEffect(() => {
    rootRef.current?.querySelector<HTMLElement>('button')?.focus();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function update() {
      if (!el) return;
      setHasMoreBelow(el.scrollHeight - el.clientHeight - el.scrollTop > 1);
    }
    update();
    el.addEventListener('scroll', update);
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      resizeObserver.disconnect();
    };
    // Re-measure whenever the tile count changes (a learner is added or removed
    // while the switcher is open, or it opens with a different device state).
  }, [learners.length]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (triggerRef.current instanceof Node && triggerRef.current.contains(event.target)) return;
      if (rootRef.current && !rootRef.current.contains(event.target)) onClose();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (rootRef.current) trapTabKey(event, rootRef.current);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [close, onClose]);

  // Two learners with the same name: their tiles also say when each was added.
  const sameName = learnersWithSameName(learners);

  return (
    <div className="tw-switcher" role="dialog" aria-modal="true" aria-label={t('header.switcherTitle')} ref={rootRef}>
      <div className="tw-switcher-head">
        <h2>{t('header.switcherTitle')}</h2>
        <button type="button" className="tw-menu-btn" aria-label={t('header.switcherClose')} onClick={close}>
          <Icon name="X" size={18} />
        </button>
      </div>
      <div className={`tw-switcher-scroll${hasMoreBelow ? ' tw-switcher-scroll--more' : ''}`} ref={scrollRef}>
        <div className="tw-switcher-tiles">
          {learners.map((learner) => (
            <LearnerTile
              key={learner.id}
              name={learner.name}
              tone={learner.colour}
              meta={sameName.has(learner.id) ? t('pages.home.tileAdded', { date: addedOn(learner, formatDate) }) : undefined}
              selected={learner.id === currentLearnerId}
              onClick={() => {
                onChoose(learner.id);
                close();
              }}
            />
          ))}
          <LearnerTile
            variant="new"
            name={t('pages.home.newLearnerTile')}
            onClick={() => {
              onAddNew();
              close();
            }}
          />
        </div>
      </div>
      {/* Kept out of the scrolling area above: however many learners are on
          this device, looking around and going back to the picker must
          always stay reachable without scrolling (r2-browser-2 / r2-checks-3). */}
      <div className="tw-switcher-footer">
        <button
          type="button"
          className="tw-switcher-guest"
          onClick={() => {
            onLookAround();
            close();
          }}
        >
          <span className="tw-avatar tw-tone-lemon" aria-hidden="true">
            <Icon name="Eye" size={18} />
          </span>
          {t('header.lookAroundTile')}
        </button>
        <Button
          variant="ghost"
          className="tw-switcher-back"
          onClick={() => {
            onBackToPicker();
            close();
          }}
        >
          {t('header.backToPicker')}
        </Button>
      </div>
    </div>
  );
}
