import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getLessons, getVisualUrl, type Visual } from '../../../content';
import { LessonVisual } from './LessonVisual';

const lesson10 = () => getLessons().find((l) => l.number === 10)!;

describe('LessonVisual', () => {
  it.each(getLessons().map((lesson) => [lesson.number, lesson] as const))(
    'shows the picture for Lesson %i with its alt text',
    (_number, lesson) => {
      expect(lesson.visual).not.toBeNull();
      render(<LessonVisual visual={lesson.visual} />);
      const img = screen.getByRole('img', { name: lesson.visual!.alt });
      expect(img).toHaveAttribute('src', getVisualUrl(lesson.visual!.src));
    },
  );

  it('renders nothing when there is no visual at all', () => {
    const { container } = render(<LessonVisual visual={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the picture file does not exist', () => {
    const visual: Visual = { type: 'map', description: 'A map.', alt: 'A map.', src: 'visuals/missing.svg' };
    const { container } = render(<LessonVisual visual={visual} />);
    expect(container).toBeEmptyDOMElement();
  });

  describe('See it bigger', () => {
    it('opens the same picture in a dialog named for its kind, and Close gives focus back', async () => {
      const user = userEvent.setup();
      const { visual } = lesson10();
      render(<LessonVisual visual={visual} />);
      const dialog = document.querySelector('dialog')!;
      expect(dialog).not.toHaveAttribute('open');

      const opener = screen.getByRole('button', { name: 'See it bigger' });
      expect(opener).toHaveAttribute('aria-haspopup', 'dialog');
      await user.click(opener);
      expect(dialog).toHaveAttribute('open');
      const open = screen.getByRole('dialog', { name: 'The map' });
      expect(within(open).getByRole('img', { name: visual!.alt })).toHaveAttribute('src', getVisualUrl(visual!.src));
      // The picture can be wider than the screen, so its scrolling area takes keyboard focus.
      expect(within(open).getByRole('region', { name: 'The map, bigger' })).toHaveAttribute('tabindex', '0');

      await user.click(within(open).getByRole('button', { name: 'Close' }));
      expect(dialog).not.toHaveAttribute('open');
      expect(opener).toHaveFocus();
    });

    it('uses the browser dialog where there is one, so Escape and the focus trap come with it', async () => {
      const user = userEvent.setup();
      const showModal = vi.fn(function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      });
      const close = vi.fn(function (this: HTMLDialogElement) {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      });
      Object.assign(HTMLDialogElement.prototype, { showModal, close });
      try {
        render(<LessonVisual visual={lesson10().visual} />);
        const opener = screen.getByRole('button', { name: 'See it bigger' });
        await user.click(opener);
        expect(showModal).toHaveBeenCalledTimes(1);
        await user.click(screen.getByRole('button', { name: 'Close' }));
        expect(close).toHaveBeenCalledTimes(1);
        expect(opener).toHaveFocus();
      } finally {
        Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
        Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
      }
    });

    it('names the dialog for each kind of picture', () => {
      const kinds = new Map(getLessons().map((l) => [l.visual!.type, l.visual!]));
      const titles = { map: 'The map', timeline: 'The timeline', diagram: 'The diagram', illustration: 'The picture' };
      for (const [kind, visual] of kinds) {
        const { unmount } = render(<LessonVisual visual={visual} />);
        expect(document.querySelector('dialog h2')).toHaveTextContent(titles[kind]);
        unmount();
      }
    });

    it('is left out where the picture is printed', () => {
      render(<LessonVisual visual={lesson10().visual} enlargeable={false} />);
      expect(screen.queryByRole('button', { name: 'See it bigger' })).toBeNull();
      expect(document.querySelector('dialog')).toBeNull();
    });
  });

  it('never shows the team-only description to learners', () => {
    const lesson = getLessons().find((l) => l.number === 10)!;
    render(<LessonVisual visual={lesson.visual} />);
    const figure = screen.getByRole('figure');
    expect(figure).toHaveClass('tw-lesson-visual');
    expect(figure.textContent).not.toContain(lesson.visual!.description);
  });
});
