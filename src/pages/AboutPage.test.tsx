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

  it('has an "Our mission" card with the approved mission and nothing else', () => {
    render(<AboutPage />);
    expect(screen.getByText('Free social studies learning for youth across Southeast Asia, especially those facing barriers to education.')).toBeInTheDocument();
    const mission = screen.getByRole('region', { name: 'Our mission' });
    const paragraphs = mission.querySelectorAll('p');
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toHaveTextContent(
      'Thinkerwell began with a love of social studies and a question: how can more youth have the chance to explore the world they live in? We built a free digital platform to make digital learning tools and social studies education accessible to youth facing barriers to education. Our goal is to help learners ask questions, grow their critical thinking skills, explore diverse perspectives, and share their own ideas.',
    );
    // The course description, the pilot status and the charity line moved off About (For organisations says them).
    expect(screen.queryByRole('heading', { name: 'What Thinkerwell is' })).not.toBeInTheDocument();
    expect(screen.queryByText(/student-led project/)).not.toBeInTheDocument();
    expect(screen.queryByText(/registered charity/)).not.toBeInTheDocument();
    expect(screen.queryByText(/first pilot/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Read with curiosity/)).not.toBeInTheDocument();
  });

  it("links to each team member's LinkedIn under their name, in a new tab", () => {
    render(<AboutPage />);
    for (const [name, href] of [
      ['Justin Park', 'https://www.linkedin.com/in/justin-park-a567b03a5/'],
      ['Nick Thiery', 'https://www.linkedin.com/in/nicholasthiery/'],
    ] as const) {
      const link = screen.getByRole('link', { name: `${name} on LinkedIn (opens in a new tab)` });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noreferrer');
      expect(link).toHaveTextContent('LinkedIn');
      // Right under the name, inside that person's card.
      const heading = screen.getByRole('heading', { level: 3, name });
      expect(heading.nextElementSibling).toBe(link);
    }
  });

  it('says the UN goal icons are not an endorsement', () => {
    render(<AboutPage />);
    expect(screen.getByText(/Thinkerwell is not endorsed by the United Nations/)).toBeInTheDocument();
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
