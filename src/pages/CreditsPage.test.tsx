import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getLessons } from '../content';
import { CreditsPage } from './CreditsPage';

describe('CreditsPage', () => {
  it('has a contents list that jumps to each part', () => {
    render(<CreditsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Credits' })).toBeInTheDocument();
    const contents = screen.getByRole('navigation', { name: 'On this page' });
    for (const [name, id] of [
      ['Lesson sources', 'sources'],
      ['Videos', 'videos'],
      ['Pictures and design', 'pictures'],
      ['Fonts', 'fonts'],
      ['Software', 'software'],
      ['Translation', 'translation'],
    ]) {
      expect(within(contents).getByRole('link', { name })).toHaveAttribute('href', `#credits-${id}`);
      expect(screen.getByRole('heading', { level: 2, name })).toHaveAttribute('id', `credits-${id}`);
    }
  });

  it("lists every lesson's sources, opening in a new tab", () => {
    render(<CreditsPage />);
    const sources = screen.getByRole('region', { name: 'Lesson sources' });
    for (const lesson of getLessons()) {
      if (lesson.sources.length === 0) continue;
      expect(within(sources).getByRole('heading', { level: 3, name: `Lesson ${lesson.number}: ${lesson.title}` })).toBeInTheDocument();
      for (const source of lesson.sources) {
        const link = within(sources).getAllByRole('link', { name: new RegExp(source.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).find((a) => a.getAttribute('href') === source.url);
        expect(link, source.url).toBeDefined();
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noreferrer');
      }
    }
  });

  it("links every lesson's video on YouTube with its channel, without embedding anything", () => {
    const { container } = render(<CreditsPage />);
    const videos = screen.getByRole('region', { name: 'Videos' });
    for (const lesson of getLessons()) {
      const links = within(videos).getAllByRole('link', { name: new RegExp(lesson.watch.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
      expect(links.map((a) => a.getAttribute('href'))).toContain(`https://www.youtube.com/watch?v=${lesson.watch.youtubeId}`);
    }
    for (const channel of new Set(getLessons().map((lesson) => lesson.watch.channel))) {
      expect(within(videos).getAllByText(channel).length).toBeGreaterThan(0);
    }
    expect(container.querySelector('iframe, img')).toBeNull();
  });

  it('credits the fonts, the software and the UN goal icons with the UN statement', () => {
    render(<CreditsPage />);
    for (const font of ['Funnel Display', 'Atkinson Hyperlegible Next', 'Eczar', 'Vazirmatn']) {
      expect(screen.getByText(new RegExp(`^${font},`))).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: /Read the SIL Open Font License/ })).toHaveAttribute('href', 'https://openfontlicense.org');
    const software = screen.getByRole('region', { name: 'Software' });
    for (const name of ['React', 'React Router', 'Lucide icons', 'idb', 'Workbox', 'Fontsource']) {
      expect(within(software).getByRole('link', { name: new RegExp(`^${name}\\s*\\(`) })).toBeInTheDocument();
    }
    expect(screen.getByText(/Thinkerwell is not endorsed by the United Nations/)).toBeInTheDocument();
    expect(screen.getByText(/has not been approved by the United Nations/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sustainable Development Goals website/ })).toHaveAttribute('href', 'https://www.un.org/sustainabledevelopment');
  });

  it('says the Indonesian was drafted with AI and is being checked', () => {
    render(<CreditsPage />);
    expect(screen.getByText(/first drafted with the help of AI/)).toBeInTheDocument();
  });
});
