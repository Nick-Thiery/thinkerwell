import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import en from '../../i18n/messages/en.json';
import { deleteAllData, getStore } from '../../storage';
import { SiteVideo, SITE_VIDEO_TIMEOUT_MS } from './SiteVideo';
import { SITE_VIDEOS } from './siteVideos';

let play: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  await deleteAllData();
  // jsdom can't play media.
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'connection');
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

/** Lets the component's one read of the device settings finish, so fake timers can't hold IndexedDB up. */
async function settingsRead(): Promise<void> {
  await act(async () => {
    await (await getStore()).getSettings();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Fakes only the clock the 20-second fallback uses. */
function fakeClock(): void {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
}

/** The <video> element, if there is one. */
function videoElement(container: HTMLElement): HTMLVideoElement | null {
  return container.querySelector('video');
}

describe('SiteVideo', () => {
  it('shows a poster drawn here, and downloads nothing of the video before the tap', () => {
    const { container } = render(<SiteVideo video="explore" />);
    expect(screen.getByRole('heading', { level: 3, name: 'Explore your world' })).toBeInTheDocument();
    expect(screen.getByText('1:53')).toBeInTheDocument();
    expect(screen.getByText('English captions')).toBeInTheDocument();
    expect(screen.getByText('Uses about 8 MB of data.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Watch the video' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Read instead' })).toBeInTheDocument();
    expect(videoElement(container)).toBeNull();
    // Only the mascot, which the site already has; nothing from /video/.
    expect(container.innerHTML).not.toContain('/video/');
    expect(container.querySelector('.tw-video-poster img')).toHaveAttribute('src', '/images/thinkerwell-mascot-transparent.png');
  });

  it('plays the site’s own file on the tap, with English captions on, and closes again', async () => {
    const user = userEvent.setup();
    const { container } = render(<SiteVideo video="session" />);
    await user.click(screen.getByRole('button', { name: 'Watch the video' }));

    const video = videoElement(container)!;
    expect(video).toHaveAttribute('src', SITE_VIDEOS.session.src);
    expect(video).toHaveAttribute('controls');
    expect(video).not.toHaveAttribute('autoplay');
    expect(video).toHaveAccessibleName('Run a session');
    const [captions, indonesian] = [...video.querySelectorAll('track')];
    expect(captions).toHaveAttribute('kind', 'captions');
    expect(captions).toHaveAttribute('src', SITE_VIDEOS.session.captions);
    expect(captions).toHaveAttribute('srclang', 'en');
    expect(captions).toHaveAttribute('label', 'English');
    expect(captions).toHaveAttribute('default');
    expect(indonesian).toHaveAttribute('kind', 'subtitles');
    expect(indonesian).toHaveAttribute('src', SITE_VIDEOS.session.subtitles.id);
    expect(indonesian).toHaveAttribute('srclang', 'id');
    expect(indonesian).toHaveAttribute('label', 'Bahasa Indonesia');
    expect(indonesian).not.toHaveAttribute('default');
    expect(play).toHaveBeenCalledTimes(1);
    expect(video).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Watch the video' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close the video' }));
    expect(videoElement(container)).toBeNull();
    expect(screen.getByRole('button', { name: 'Watch the video' })).toHaveFocus();
  });

  it('shows every word of the video, and its sources, on "Read instead"', async () => {
    const user = userEvent.setup();
    const { container } = render(<SiteVideo video="explore" />);
    await user.click(screen.getByRole('button', { name: 'Read instead' }));

    const heading = screen.getByRole('heading', { level: 3, name: 'Explore your world' });
    expect(heading).toHaveFocus();
    expect(screen.getByText('Written version')).toBeInTheDocument();
    for (const paragraph of Object.entries(en.siteVideo.explore).filter(([key]) => /^p\d$/.test(key))) {
      expect(screen.getByText(paragraph[1])).toBeInTheDocument();
    }
    expect(screen.getByText(en.siteVideo.explore.sources)).toBeInTheDocument();
    expect(videoElement(container)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Watch the video instead' }));
    expect(videoElement(container)).not.toBeNull();
  });

  it('gives every video a paragraph for each of its messages, English captions and Indonesian subtitles', () => {
    for (const video of Object.values(SITE_VIDEOS)) {
      expect(video.words.length).toBeGreaterThan(0);
      expect(video.src).toMatch(/^\/video\/[a-z0-9-]+-v\d+\.mp4$/);
      expect(video.captions).toBe(video.src.replace(/\.mp4$/, '.en.vtt'));
      expect(video.subtitles).toEqual({ id: video.src.replace(/\.mp4$/, '.id.vtt') });
    }
  });

  it('turns the Indonesian subtitles on, instead of the English captions, when the page is Indonesian', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <I18nProvider locale="id">
        <SiteVideo video="session" />
      </I18nProvider>,
    );
    await user.click(await screen.findByRole('button', { name: 'Tonton video' }));
    const [captions, indonesian] = [...videoElement(container)!.querySelectorAll('track')];
    expect(captions).toHaveAttribute('srclang', 'en');
    expect(captions).not.toHaveAttribute('default');
    expect(indonesian).toHaveAttribute('srclang', 'id');
    expect(indonesian).toHaveAttribute('default');
    expect(screen.getByRole('heading', { level: 3, name: 'Menjalankan satu sesi' })).toBeInTheDocument();
  });

  it('shows only the written version when Save data is on', async () => {
    const store = await getStore();
    await store.updateSettings({ saveData: true });
    const { container } = render(<SiteVideo video="explore" />);
    expect(await screen.findByText('Videos are off to save data.')).toBeInTheDocument();
    expect(screen.getByText(en.siteVideo.explore.p1)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Watch the video|Try the video again/ })).not.toBeInTheDocument();
    expect(videoElement(container)).toBeNull();
  });

  it("follows the browser's data saver until someone chooses", () => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
    render(<SiteVideo video="session" />);
    expect(screen.getByText('Videos are off to save data.')).toBeInTheDocument();
  });

  it('switches to the written version if the file can’t play, with a way to try again', async () => {
    const user = userEvent.setup();
    const { container } = render(<SiteVideo video="session" />);
    await user.click(screen.getByRole('button', { name: 'Watch the video' }));
    fireEvent.error(videoElement(container)!);
    expect(screen.getByText("This video can't play here right now.")).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Run a session' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Try the video again' }));
    expect(videoElement(container)).not.toBeNull();
  });

  it('switches to the written version if the first frame takes more than 20 seconds', async () => {
    const { container } = render(<SiteVideo video="session" />);
    await settingsRead();
    fakeClock();
    fireEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
    act(() => {
      vi.advanceTimersByTime(SITE_VIDEO_TIMEOUT_MS - 1);
    });
    expect(videoElement(container)).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText('The video is taking a long time to load.')).toBeInTheDocument();
    expect(videoElement(container)).toBeNull();
  });

  it('keeps playing once the first frame is there, however long it takes', async () => {
    const { container } = render(<SiteVideo video="session" />);
    await settingsRead();
    fakeClock();
    fireEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
    fireEvent.loadedData(videoElement(container)!);
    act(() => {
      vi.advanceTimersByTime(SITE_VIDEO_TIMEOUT_MS * 3);
    });
    expect(videoElement(container)).not.toBeNull();
  });

  it('says the video can’t load when the device is offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(<SiteVideo video="explore" />);
    expect(screen.getByText("You're offline, so the video can't load now.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try the video again' })).toBeInTheDocument();
  });

  it('falls back when the connection goes while the video is loading', async () => {
    const { container } = render(<SiteVideo video="explore" />);
    fireEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    await waitFor(() => expect(videoElement(container)).toBeNull());
    expect(screen.getByText("You're offline, so the video can't load now.")).toBeInTheDocument();
  });
});
