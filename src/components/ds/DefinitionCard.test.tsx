import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import { DefinitionCard, FLOATING_GUTTER, floatingShift } from './DefinitionCard';

describe('floatingShift', () => {
  const viewport = 390;

  it('leaves a card that already fits where it is', () => {
    expect(floatingShift({ start: 40, width: 280, viewport, rtl: false })).toBe(0);
    expect(floatingShift({ start: 350, width: 280, viewport, rtl: true })).toBe(0);
  });

  it('pulls a card that runs off the end edge back inside the gutter (ltr)', () => {
    // Starts under a word at x=300: 300 + 280 = 580, so it must move 206px left.
    expect(floatingShift({ start: 300, width: 280, viewport, rtl: false })).toBe(390 - FLOATING_GUTTER - 580);
  });

  it('pushes a card that starts before the start gutter back inside (ltr)', () => {
    expect(floatingShift({ start: 4, width: 280, viewport, rtl: false })).toBe(FLOATING_GUTTER - 4);
  });

  it('works from the right edge in right-to-left text', () => {
    // Anchored at the word's right edge x=100: spans -180..100, so it moves 196px right.
    expect(floatingShift({ start: 100, width: 280, viewport, rtl: true })).toBe(FLOATING_GUTTER + 180);
    // Anchored at x=388: spans 108..388, past the end gutter at 374.
    expect(floatingShift({ start: 388, width: 280, viewport, rtl: true })).toBe(374 - 388);
  });

  it('lines a card wider than the space up with the start gutter', () => {
    expect(floatingShift({ start: 200, width: 400, viewport, rtl: false })).toBe(FLOATING_GUTTER - 200);
    // In rtl the start gutter is on the right.
    expect(floatingShift({ start: 200, width: 400, viewport, rtl: true })).toBe(390 - FLOATING_GUTTER - 200);
  });

  it('always leaves the card inside [gutter, viewport - gutter] when it fits', () => {
    for (const rtl of [false, true]) {
      for (let start = -50; start <= 450; start += 7) {
        const width = 280;
        const shift = floatingShift({ start, width, viewport, rtl });
        const left = (rtl ? start - width : start) + shift;
        expect(left).toBeGreaterThanOrEqual(FLOATING_GUTTER - 0.5);
        expect(left + width).toBeLessThanOrEqual(viewport - FLOATING_GUTTER + 0.5);
      }
    }
  });

  it('never returns -0', () => {
    expect(Object.is(floatingShift({ start: 16, width: 100, viewport, rtl: false }), -0)).toBe(false);
  });
});

/**
 * jsdom has no layout, so fake just enough of it: a 390px layout viewport,
 * a word whose line box starts at `wordLeft`, and a 280px card whose
 * natural left edge is the word's left edge plus any translateX applied.
 */
function fakeLayout({ wordLeft, innerWidth = 480 }: { wordLeft: number; innerWidth?: number }) {
  const seenWhilePlacing: boolean[] = [];
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(390);
  // A mobile browser that has already widened the layout viewport: the old
  // bug measured this.
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(innerWidth);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this instanceof HTMLElement && this.classList.contains('tw-def-float')) {
      seenWhilePlacing.push(this.hasAttribute('data-placing'));
      const match = /translate(?:X)?\((-?[\d.]+)px/.exec(this.style.transform);
      const shift = match ? Number(match[1]) : 0;
      const left = this.hasAttribute('data-placing') ? 0 : wordLeft + shift;
      return DOMRect.fromRect({ x: left, y: 100, width: 280, height: 200 });
    }
    return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
  });
  vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(function (this: Element) {
    const rects = this.getAttribute('data-testid') === 'anchor'
      ? [DOMRect.fromRect({ x: wordLeft, y: 60, width: 40, height: 32 })]
      : [];
    return Object.assign(rects, { item: (i: number) => rects[i] ?? null });
  });
  return seenWhilePlacing;
}

function renderFloating() {
  return render(
    <I18nProvider>
      <p>
        <span data-testid="anchor" style={{ position: 'relative' }}>
          <button type="button">fertile</button>
          <DefinitionCard floating word="fertile" definition="Good for growing lots of plants and food." />
        </span>
      </p>
    </I18nProvider>,
  );
}

describe('DefinitionCard floating placement', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('measures while parked (data-placing), then shifts into the layout viewport, not innerWidth', () => {
    const seenWhilePlacing = fakeLayout({ wordLeft: 300 });
    renderFloating();

    const card = screen.getByRole('dialog');
    expect(card).not.toHaveAttribute('data-placing');
    // Width measured while parked; the safety-net check after placing is not.
    expect(seenWhilePlacing[0]).toBe(true);
    expect(seenWhilePlacing.at(-1)).toBe(false);
    // 300 + 280 = 580; the end gutter in a 390px viewport is 374: -206px.
    // (Measured against innerWidth 480, the old clamp gave only -108px.)
    expect(card.style.transform).toMatch(/^translate\(-206px, /);
  });

  it('leaves a card that fits unshifted sideways', () => {
    fakeLayout({ wordLeft: 40 });
    renderFloating();
    expect(screen.getByRole('dialog').style.transform).not.toMatch(/translate\(-?[1-9]/);
  });

  it('places the card again when the visual viewport resizes', () => {
    let wordLeft = 40;
    fakeLayout({ wordLeft });
    const listeners: Array<() => void> = [];
    const fakeViewport = {
      addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
      removeEventListener: vi.fn(),
    };
    const previous = Object.getOwnPropertyDescriptor(window, 'visualViewport');
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: fakeViewport });
    try {
      renderFloating();
      expect(listeners).toHaveLength(1);

      wordLeft = 300;
      fakeLayout({ wordLeft });
      act(() => listeners[0]?.());
      expect(screen.getByRole('dialog').style.transform).toMatch(/^translate\(-206px, /);
    } finally {
      if (previous) Object.defineProperty(window, 'visualViewport', previous);
      else delete (window as { visualViewport?: unknown }).visualViewport;
    }
  });

  it('does not position a standalone (Key words panel) card', () => {
    render(
      <I18nProvider>
        <DefinitionCard word="settlement" definition="A place where people live together." onClose={false} />
      </I18nProvider>,
    );
    const card = screen.getByText('settlement').closest('.tw-def');
    expect(card).not.toHaveClass('tw-def-float');
    expect((card as HTMLElement).style.transform).toBe('');
  });
});
