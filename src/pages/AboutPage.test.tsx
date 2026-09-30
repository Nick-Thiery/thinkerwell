import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AboutPage as AboutPageOnly } from './AboutPage';

/** About has a link (to Credits), so it needs a router. */
function AboutPage() {
  const router = createMemoryRouter([{ path: '/about', element: <AboutPageOnly /> }], { initialEntries: ['/about'] });
  return <RouterProvider router={router} />;
}

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

  it('never claims Thinkerwell is a registered charity or nonprofit', () => {
    render(<AboutPage />);
    expect(screen.queryByText(/registered charity|nonprofit/i)).not.toBeInTheDocument();
  });

  it('shows all four UN goals it works towards', () => {
    render(<AboutPage />);
    expect(screen.getByText('Goal 4: Quality Education')).toBeInTheDocument();
    expect(screen.getByText('Goal 10: Reduced Inequalities')).toBeInTheDocument();
    expect(screen.getByText('Goal 16: Peace, Justice and Strong Institutions')).toBeInTheDocument();
    expect(screen.getByText('Goal 17: Partnerships for the Goals')).toBeInTheDocument();
  });

  it('links to the credits instead of listing them', () => {
    render(<AboutPage />);
    expect(screen.getByRole('heading', { level: 2, name: 'Credits and sources' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See the credits' })).toHaveAttribute('href', '/credits');
    expect(screen.queryByText(/Funnel Display/)).not.toBeInTheDocument();
    expect(screen.queryByText('Our promise to learners')).not.toBeInTheDocument();
  });
});
