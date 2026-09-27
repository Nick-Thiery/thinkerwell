import { useEffect, type RefObject } from 'react';

/**
 * Arrow-key navigation for a roving-tabindex widget: a `role="radiogroup"`
 * of `ChoiceOption`s, or a row of `Chip`s used as one (`role="radio"` on
 * each). The buttons stay real DOM siblings; this only moves focus (and,
 * for a radio group, selection follows focus per WAI-ARIA APG) between the
 * elements matching `selector` inside `event.currentTarget`'s nearest
 * ancestor matching `groupSelector`.
 *
 * Every group answers to all four arrow keys, as the WAI-ARIA APG radio
 * group pattern asks (phase 8: a row of chips used to ignore ArrowDown, the
 * key many keyboard users try first): ArrowDown and ArrowRight move to the
 * next item, ArrowUp and ArrowLeft to the previous one; Home/End jump to
 * the first/last. `KeyboardEvent.key` names are never mirrored by the
 * browser for right-to-left text, so the group reads its own computed
 * `direction` and swaps ArrowLeft and ArrowRight when it is `rtl`.
 */
export interface RovingFocusOptions {
  /** How the group is laid out. Kept for callers; every arrow key works either way. */
  orientation?: 'horizontal' | 'vertical';
  groupSelector?: string;
  itemSelector?: string;
  /**
   * 'auto' (the default, per WAI-ARIA APG): moving focus with the arrow
   * keys also selects — fine for a Chip radio group, where choosing is
   * harmless. 'manual': arrows only move focus and the roving tab stop;
   * the item itself (a real `<button>`) still activates on Space/Enter, via
   * the browser's own default button behaviour, not this helper. Use
   * 'manual' wherever moving focus must not have a side effect, such as a
   * quick-check question that shows "Not quite" and saves an answer as
   * soon as an option is chosen.
   */
  activation?: 'auto' | 'manual';
}


function isRtl(el: Element): boolean {
  return getComputedStyle(el).direction === 'rtl';
}

/**
 * Call from a member's `onKeyDown`. Returns true when it handled the key
 * (so callers can call `event.preventDefault()`).
 */
export function handleRovingKeyDown(
  event: { key: string; currentTarget: HTMLElement; preventDefault: () => void },
  {
    groupSelector = '[role="radiogroup"], [role="group"]',
    itemSelector = '[role="radio"]',
    activation = 'auto',
  }: RovingFocusOptions = {},
): boolean {
  const group = event.currentTarget.closest(groupSelector);
  if (!group) return false;
  const items = Array.from(group.querySelectorAll<HTMLElement>(itemSelector)).filter((el) => !el.hasAttribute('disabled'));
  const currentIndex = items.indexOf(event.currentTarget);
  if (currentIndex === -1) return false;

  // In right-to-left, the next item sits visually to the left, so the
  // key that moves "forward" through the group is ArrowLeft, not ArrowRight.
  const rtl = isRtl(group);
  const nextKeys = ['ArrowDown', rtl ? 'ArrowLeft' : 'ArrowRight'];
  const prevKeys = ['ArrowUp', rtl ? 'ArrowRight' : 'ArrowLeft'];

  let nextIndex: number | null = null;
  if (nextKeys.includes(event.key)) nextIndex = (currentIndex + 1) % items.length;
  else if (prevKeys.includes(event.key)) nextIndex = (currentIndex - 1 + items.length) % items.length;
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = items.length - 1;

  if (nextIndex === null) return false;
  event.preventDefault();
  const current = items[currentIndex];
  const next = items[nextIndex];
  if (activation === 'manual') {
    // Move the roving tab stop with focus, independent of which item (if
    // any) is checked: useRovingTabIndex only re-derives tabIndex from
    // checked state, which does not change here.
    if (current) current.tabIndex = -1;
    if (next) next.tabIndex = 0;
    next?.focus();
  } else {
    next?.focus();
    next?.click();
  }
  return true;
}

/**
 * Keeps a single tab stop in a roving-tabindex group: the checked item, or
 * the first item when none is checked. Every other item gets
 * `tabIndex={-1}` so Tab moves past the whole group in one step, per the
 * WAI-ARIA APG radio group pattern.
 *
 * Call from each group member with its own ref. `checked` isn't read
 * directly — every member's own current `aria-checked` is, since a
 * sibling's tab stop can depend on this item too — it exists only so the
 * call site documents the value this hook cares about. The effect has no
 * dependency array and re-runs after every render of every member, rather
 * than only when this one member's own `checked` prop changes: a group
 * member can need its tab stop recomputed because a *different* member
 * mounted, unmounted or changed (for example a radio Chip list, or a
 * QuestionCard reused for the next question, shrinking from four options to
 * three while the checked one was the last), and that does not necessarily
 * change this member's own `checked` value. Re-scanning the group's members
 * on every render is cheap for the option counts this app uses (a handful
 * per group).
 */
export function useRovingTabIndex(
  ref: RefObject<HTMLElement | null>,
  checked: boolean,
  { groupSelector = '[role="radiogroup"], [role="group"]', itemSelector = '[role="radio"]' }: Pick<RovingFocusOptions, 'groupSelector' | 'itemSelector'> = {},
) {
  // No dependency array: intentionally runs after every render (see above),
  // not just when this member's own `checked` changes.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const group = el.closest(groupSelector);
    if (!group) {
      // Not inside a managed group (for example a standalone Chip): behave
      // like an ordinary focusable control.
      el.tabIndex = 0;
      return;
    }
    const items = Array.from(group.querySelectorAll<HTMLElement>(itemSelector));
    const anyChecked = items.some((item) => item.getAttribute('aria-checked') === 'true');
    items.forEach((item, index) => {
      const isChecked = item.getAttribute('aria-checked') === 'true';
      item.tabIndex = anyChecked ? (isChecked ? 0 : -1) : index === 0 ? 0 : -1;
    });
  });
  void checked;
}
