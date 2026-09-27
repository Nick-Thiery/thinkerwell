import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AboutPage } from './AboutPage';

describe('AboutPage', () => {
  it('names Justin Park as founder and CEO, with his photo', () => {
    render(<AboutPage />);
    expect(screen.getByRole('heading', { level: 3, name: 'Justin Park' })).toBeInTheDocument();
    expect(screen.getByText('Founder and CEO')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Justin Park' })).toHaveAttribute('src', '/images/founder-justin-park.jpg');
  });

  it('names Nick Thiery as CTO, with a placeholder in place of his photo', () => {
    render(<AboutPage />);
    expect(screen.getByRole('heading', { level: 3, name: 'Nick Thiery' })).toBeInTheDocument();
    expect(screen.getByText('Chief technology officer (CTO)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Photo of Nick, coming soon' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Nick Thiery' })).not.toBeInTheDocument();
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
});
