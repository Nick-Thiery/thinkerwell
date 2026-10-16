import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AboutPage as AboutPageOnly, STUDIES } from './AboutPage';

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
    expect(within(mission).queryByText(/pilot/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Read with curiosity/)).not.toBeInTheDocument();
  });

  it('shows the mission, how a lesson works, then the video "Explore your world" under its heading and the UN goals', () => {
    const { container } = render(<AboutPage />);
    const mission = screen.getByRole('region', { name: 'Our mission' });
    const lessons = screen.getByRole('region', { name: 'How our lessons work' });
    const video = screen.getByRole('region', { name: 'See Thinkerwell in action' });
    const goals = screen.getByRole('region', { name: 'How Thinkerwell connects to the UN goals' });
    const play = screen.getByRole('button', { name: 'Play the video: Explore your world' });
    expect(mission.parentElement).toHaveClass('tw-about-cards');
    expect(mission.nextElementSibling).toBe(lessons);
    expect(lessons.nextElementSibling).toBe(video);
    expect(video.nextElementSibling).toBe(goals);
    expect(video).toContainElement(play);
    // Under its heading, the picture is the card: no "Optional" tag, title, blurb or "Watch the video" button.
    expect(screen.queryByText('Optional')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Explore your world' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Two minutes on why we built Thinkerwell/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Watch the video' })).not.toBeInTheDocument();
    // The written version and the data it uses stay one quiet line away.
    expect(screen.getByRole('button', { name: 'Read instead' })).toBeVisible();
    expect(screen.getByText('Uses about 9 MB of data.')).toBeInTheDocument();
    expect(container.querySelector('video')).toBeNull();
  });

  it('explains the five steps in order, each with its name and one sentence', () => {
    render(<AboutPage />);
    const lessons = screen.getByRole('region', { name: 'How our lessons work' });
    expect(
      within(lessons).getByText(
        'Every lesson begins with a question and gives learners five ways to explore it. Each step asks them to work with an idea in a different way.',
      ),
    ).toBeInTheDocument();
    const steps = within(lessons).getAllByRole('listitem').filter((item) => item.closest('ol'));
    expect(steps.map((step) => within(step).getByRole('heading', { level: 3 }).textContent)).toEqual(['Read', 'Write', 'Speak', 'Watch', 'Reflect']);
    expect(steps.map((step) => step.querySelector('p')?.textContent)).toEqual([
      'Explore a short source, story, or explanation.',
      'Put an idea into your own words and use evidence.',
      'Explain your thinking with a partner or aloud.',
      'See a relevant example, or choose Read instead.',
      'Revisit what you learned and what you still wonder.',
    ]);
    expect(within(lessons).getByText(/informs this design\. Our first pilot will help us learn how the full sequence works/)).toBeInTheDocument();
  });

  it('keeps the research folded away until opened, and says the studies did not test Thinkerwell', async () => {
    const user = userEvent.setup();
    const { container } = render(<AboutPage />);
    const details = container.querySelector('details.tw-about-research') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    await user.click(screen.getByText('Research behind our approach'));
    expect(details.open).toBe(true);
    expect(within(details).getByText(/they have not evaluated Thinkerwell or established that our exact five-step sequence improves outcomes/)).toBeInTheDocument();
    for (const study of Object.values(STUDIES)) {
      const link = within(details).getByRole('link', { name: (name) => name.startsWith(study.title) && name.endsWith('(opens in a new tab)') });
      expect(link).toHaveAttribute('href', study.url);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noreferrer');
    }
    // No claim the research can't support.
    expect(container.textContent).not.toMatch(/\b(proven|proves|proof)\b|times more effective/i);
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
