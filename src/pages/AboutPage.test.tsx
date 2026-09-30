import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getLessons } from '../content';
import { AboutPage } from './AboutPage';

describe('AboutPage', () => {
  it('names Justin Park as founder and director, with his photo', () => {
    render(<AboutPage />);
    expect(screen.getByRole('heading', { level: 3, name: 'Justin Park' })).toBeInTheDocument();
    expect(screen.getByText('Founder and director')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Justin Park' })).toHaveAttribute('src', '/images/founder-justin-park.jpg');
  });

  it('names Nick Thiery as CTO, with his photo', () => {
    render(<AboutPage />);
    expect(screen.getByRole('heading', { level: 3, name: 'Nick Thiery' })).toBeInTheDocument();
    expect(screen.getByText('Chief technology officer (CTO)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Nick Thiery' })).toHaveAttribute('src', '/images/nick-thiery.jpg');
  });

  it('is honest that Thinkerwell is not a registered charity', () => {
    render(<AboutPage />);
    expect(screen.getByText(/not a registered charity/)).toBeInTheDocument();
    expect(screen.getByText(/student-led project/)).toBeInTheDocument();
  });

  it('shows all four UN goals it works towards', () => {
    render(<AboutPage />);
    expect(screen.getByText('Goal 4: Quality Education')).toBeInTheDocument();
    expect(screen.getByText('Goal 10: Reduced Inequalities')).toBeInTheDocument();
    expect(screen.getByText('Goal 16: Peace, Justice and Strong Institutions')).toBeInTheDocument();
    expect(screen.getByText('Goal 17: Partnerships for the Goals')).toBeInTheDocument();
  });

  it('credits the fonts, the icons, every video channel and the UN goal icons', () => {
    render(<AboutPage />);
    expect(screen.getByRole('heading', { level: 2, name: 'Credits' })).toBeInTheDocument();
    for (const font of ['Funnel Display', 'Atkinson Hyperlegible Next', 'Eczar']) expect(screen.getByText(new RegExp(`^${font},`))).toBeInTheDocument();
    expect(screen.getByText(/Lucide/)).toBeInTheDocument();
    for (const channel of new Set(getLessons().map((lesson) => lesson.watch.channel))) {
      expect(screen.getByText(channel, { selector: 'li' })).toHaveAttribute('lang', 'en');
    }
    expect(screen.getByText(/Thinkerwell is not endorsed by the United Nations/)).toBeInTheDocument();
    expect(screen.getByText(/has not been approved by the United Nations/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sustainable Development Goals website/ })).toHaveAttribute('href', 'https://www.un.org/sustainabledevelopment');
  });
});
