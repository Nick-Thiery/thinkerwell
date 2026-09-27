import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { getCourse, getLessons, getVisualUrl, type Evidence, type EvidenceCard, type Visual } from '../../../content';
import { I18nProvider } from '../../../i18n';
import { LessonEvidence } from './LessonEvidence';

/** Every piece of text a card must show, whatever its type. */
function cardTexts(card: EvidenceCard): string[] {
  switch (card.type) {
    case 'items':
      return card.items;
    case 'timeline':
      return card.events.flatMap((event) => [event.year, event.text]);
    case 'map':
      return [
        ...card.locations.flatMap((location) => [location.label, location.description]),
        ...card.legend.map((entry) => entry.label),
      ];
    case 'cases':
      return card.cases.flatMap((item) => [item.name, item.body]);
    case 'sources':
      return card.sources.flatMap((source) => [source.caption, ...source.details]);
    case 'table':
      return [...card.columns, ...card.rows.flat()];
  }
}

function renderEvidence(evidence: Evidence, visual: Visual | null = null) {
  return render(
    <I18nProvider>
      <LessonEvidence evidence={evidence} visual={visual} />
    </I18nProvider>,
  );
}

const fictionLabel = getCourse().fictionLabel;

describe('LessonEvidence', () => {
  let errorSpy: MockInstance;
  let warnSpy: MockInstance;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error');
    warnSpy = vi.spyOn(console, 'warn');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('covers every card type the content uses', () => {
    const used = new Set(getLessons().flatMap((lesson) => lesson.evidence.cards.map((card) => card.type)));
    expect([...used].sort()).toEqual(['cases', 'items', 'map', 'sources', 'table', 'timeline']);
  });

  describe.each(getLessons().map((lesson) => [`Lesson ${lesson.number} (${lesson.id})`, lesson] as const))(
    '%s',
    (_name, lesson) => {
      it('shows the question, every card title and every piece of evidence, with no console errors', () => {
        const { container } = renderEvidence(lesson.evidence);
        const section = screen.getByRole('region', { name: 'Evidence' });

        expect(within(section).getByText(lesson.evidence.question)).toBeInTheDocument();

        const titles = within(section)
          .getAllByRole('heading', { level: 3 })
          .map((heading) => heading.textContent);
        expect(titles).toEqual(lesson.evidence.cards.map((card) => card.title));

        // Each card is a figure named by its title.
        for (const card of lesson.evidence.cards) {
          const figure = within(section).getByRole('figure', { name: card.title });
          for (const text of cardTexts(card)) {
            expect(figure.textContent).toContain(text);
          }
        }

        // Tables are real tables with column and row headers.
        for (const card of lesson.evidence.cards) {
          if (card.type !== 'table') continue;
          const table = within(section).getByRole('table', { name: card.title });
          expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual(card.columns);
          expect(within(table).getAllByRole('rowheader').map((th) => th.textContent)).toEqual(
            card.rows.map((row) => row[0]),
          );
          expect(within(table).getAllByRole('cell').map((td) => td.textContent)).toEqual(
            card.rows.flatMap((row) => row.slice(1)),
          );
        }

        // The fiction label (from course.json) and badge show exactly when fictional.
        const labelShown = (container.textContent ?? '').includes(fictionLabel);
        expect(labelShown).toBe(lesson.evidence.fictional);
        expect(container.querySelectorAll('.tw-badge-lavender')).toHaveLength(lesson.evidence.fictional ? 1 : 0);

        expect(errorSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
      });
    },
  );

  it('shows no fiction label or badge for real evidence', () => {
    const real: Evidence = {
      fictional: false,
      label: null,
      question: 'What does this record tell you?',
      cards: [{ type: 'items', title: 'A real record', items: ['First thing', 'Second thing'] }],
    };
    const { container } = renderEvidence(real);

    expect(container.textContent).not.toContain(fictionLabel);
    expect(screen.queryByText(/^Fictional/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'A real record' })).toBeInTheDocument();
  });

  it('takes the fiction label from course.json, not from the lesson', () => {
    const fictional: Evidence = {
      fictional: true,
      label: 'A label written in the lesson file',
      question: 'What do you notice?',
      cards: [{ type: 'items', title: 'Made up', items: ['One'] }],
    };
    const { container } = renderEvidence(fictional);

    expect(container.textContent).toContain(fictionLabel);
    expect(container.textContent).not.toContain('A label written in the lesson file');
    expect(screen.getByText('Fictional examples')).toBeInTheDocument();
  });

  it('puts the fictional badge on the first card only', () => {
    const lesson = getLessons().find((l) => l.evidence.fictional && l.evidence.cards.length > 1);
    expect(lesson).toBeDefined();
    renderEvidence(lesson!.evidence);

    const [first, ...rest] = screen.getAllByRole('figure').filter((figure) => figure.classList.contains('tw-lx-card'));
    expect(first).toBeDefined();
    expect(within(first!).getByText(/^Fictional /)).toBeInTheDocument();
    for (const figure of rest) expect(within(figure).queryByText(/^Fictional /)).not.toBeInTheDocument();
  });

  it('names the kind of card in the fictional badge ("Fictional map")', () => {
    const lesson = getLessons().find((l) => l.id === 'towns-near-rivers');
    renderEvidence(lesson!.evidence);
    expect(screen.getByText('Fictional map')).toBeInTheDocument();
  });

  it('gives each figure a type class that no inner element uses', () => {
    for (const lesson of getLessons()) {
      const { container, unmount } = renderEvidence(lesson.evidence);
      for (const [index, figure] of [...container.querySelectorAll('figure.tw-lx-card')].entries()) {
        const type = lesson.evidence.cards[index]!.type;
        expect(figure).toHaveClass('tw-lx-card', `tw-lx-card-${type}`);
        for (const name of figure.classList) {
          expect(figure.querySelector(`.${name}`), `${lesson.id}: .${name} inside its own figure`).toBeNull();
        }
      }
      unmount();
    }
  });

  it('shows the map key and the places as text, with no colour swatches', () => {
    const lesson = getLessons().find((l) => l.id === 'towns-near-rivers');
    expect(lesson).toBeDefined();
    renderEvidence(lesson!.evidence, lesson!.visual);

    const key = screen.getByRole('list', { name: 'Map key' });
    const map = lesson!.evidence.cards.find((card) => card.type === 'map');
    if (map?.type !== 'map') throw new Error('Lesson 10 has a map card');
    expect(within(key).getAllByRole('listitem').map((li) => li.textContent)).toEqual(map.legend.map((entry) => entry.label));
    // The picture draws its own key in its own colours; swatches here could only disagree with it.
    expect(document.querySelector('.tw-lx-swatch, [data-color]')).toBeNull();
    expect(within(screen.getByRole('list', { name: 'Places' })).getAllByRole('listitem')).toHaveLength(
      map.locations.length,
    );
  });

  it('shows the picture first, above the question and the fiction label, with its alt text', () => {
    const lesson = getLessons().find((l) => l.id === 'towns-near-rivers')!;
    renderEvidence(lesson.evidence, lesson.visual);

    const section = screen.getByRole('region', { name: 'Evidence' });
    const img = within(section).getByRole('img', { name: lesson.visual!.alt });
    expect(img).toHaveAttribute('src', getVisualUrl(lesson.visual!.src));
    // Before the question and the label (Lesson 8 pairs invented evidence with real places).
    const question = within(section).getByText(lesson.evidence.question);
    const label = within(section).getByText(fictionLabel);
    expect(img.compareDocumentPosition(question) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(img.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Not inside any evidence card.
    expect(img.closest('.tw-lx-card')).toBeNull();
  });

  it('shows no picture when none is given', () => {
    const lesson = getLessons().find((l) => l.id === 'towns-near-rivers')!;
    renderEvidence(lesson.evidence);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('keeps a table that fits out of the tab order', () => {
    const lesson = getLessons().find((l) => l.evidence.cards.some((card) => card.type === 'table'));
    renderEvidence(lesson!.evidence);

    // jsdom has no layout, so the table never measures as wider than its box.
    const scroller = document.querySelector('.tw-lx-table-scroll');
    expect(scroller).not.toHaveAttribute('tabindex');
    expect(scroller).not.toHaveAttribute('role');
  });

  it('makes a table that has to scroll a named, focusable region', () => {
    const scrollWidth = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(600);
    const clientWidth = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
    const lesson = getLessons().find((l) => l.id === 'farming-changes-societies');
    renderEvidence(lesson!.evidence);

    const region = screen.getByRole('region', { name: 'Table: Two ways of life in Harapan Valley' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(scrollWidth).toHaveBeenCalled();
    expect(clientWidth).toHaveBeenCalled();
  });
});
