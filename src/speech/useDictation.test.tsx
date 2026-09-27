import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockSpeechRecognition, restoreSpeechMocks } from '../test/speechMocks';
import { STOP_GRACE_MS, useDictation, type Dictation } from './useDictation';

afterEach(() => restoreSpeechMocks());

/** The hook's latest value, for checks the buttons can't show. */
const latest: { dictation: Dictation | null } = { dictation: null };
const onDone = vi.fn();

/** Two boxes with Say it buttons, wired as a stage would. */
function Boxes({
  onDeviceConfirmed = true,
  allowOnline = false,
  initial = ['', ''],
}: {
  onDeviceConfirmed?: boolean;
  allowOnline?: boolean;
  initial?: string[];
}) {
  const dictation = useDictation({ onDeviceConfirmed, allowOnline });
  useEffect(() => {
    latest.dictation = dictation;
  });
  const [values, setValues] = useState(initial);
  const set = (index: number, text: string) => setValues((v) => v.map((old, i) => (i === index ? text : old)));
  return (
    <>
      {values.map((value, index) => {
        const id = `box-${index}`;
        const field = { id, value, onChange: (text: string) => set(index, text), onDone };
        return (
          <div key={id}>
            <label htmlFor={id}>Box {index}</label>
            <textarea
              id={id}
              value={value}
              onChange={(event) => {
                dictation.typed(id);
                set(index, event.target.value);
              }}
            />
            {dictation.available ? (
              <button type="button" onClick={() => dictation.toggle(field)}>
                {dictation.listeningId === id ? `Stop ${index}` : `Say it ${index}`}
              </button>
            ) : null}
            <p data-testid={`notice-${index}`}>{dictation.noticeFor(id) ?? ''}</p>
          </div>
        );
      })}
    </>
  );
}

describe('useDictation', () => {
  it('hides Say it until an educator confirmed the device, where online is not allowed', async () => {
    const mock = mockSpeechRecognition({ availability: 'available' });
    render(<Boxes onDeviceConfirmed={false} />);
    await act(async () => {});
    expect(screen.queryByRole('button', { name: /say it/i })).not.toBeInTheDocument();
    expect(latest.dictation?.available).toBe(false);
    expect(mock.available).not.toHaveBeenCalled();
    expect(mock.instances).toHaveLength(0);
  });

  it('shows Say it on the device from the saved check alone, and makes a recognition object only on a tap', async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition({ availability: 'available' });
    render(<Boxes />);
    const sayIt = await screen.findByRole('button', { name: 'Say it 0' });
    expect(latest.dictation?.mode).toBe('on-device');
    expect(mock.available).not.toHaveBeenCalled();
    expect(mock.instances).toHaveLength(0);
    await user.click(sayIt);
    expect(mock.instances).toHaveLength(1);
    expect(mock.latest().processLocally).toBe(true);
    expect(mock.available).not.toHaveBeenCalled();
  });

  it('shows Say it for the online path only when an educator allowed it', async () => {
    mockSpeechRecognition({ onDevice: false });
    const { unmount } = render(<Boxes />);
    await act(async () => {});
    expect(screen.queryByRole('button', { name: /say it/i })).not.toBeInTheDocument();
    unmount();

    render(<Boxes allowOnline />);
    expect(await screen.findByRole('button', { name: 'Say it 0' })).toBeInTheDocument();
    expect(latest.dictation?.mode).toBe('online');
  });

  it('puts heard words into the box as they come, then stops on Stop', async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition();
    render(<Boxes />);
    await user.click(await screen.findByRole('button', { name: 'Say it 0' }));
    const rec = mock.latest();
    expect(rec.processLocally).toBe(true);
    expect(rec.start).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Stop 0' })).toBeInTheDocument();

    act(() => rec.hear([['near the', false]]));
    expect(screen.getByLabelText('Box 0')).toHaveValue('Near the');
    act(() => rec.hear([['near the river', true], [' because', false]]));
    expect(screen.getByLabelText('Box 0')).toHaveValue('Near the river because');

    await user.click(screen.getByRole('button', { name: 'Stop 0' }));
    expect(rec.stop).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Say it 0' })).toBeInTheDocument());
    expect(onDone).toHaveBeenCalledWith('Near the river because');
  });

  it('inserts at the caret the learner left, keeping their words', async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition();
    render(<Boxes initial={['I like the hill. It is safe.', '']} />);
    const box = screen.getByLabelText('Box 0');
    await user.click(box);
    (box as HTMLTextAreaElement).setSelectionRange(16, 16);
    await user.click(await screen.findByRole('button', { name: 'Say it 0' }));
    act(() => mock.latest().hear([['floods are rare', true]]));
    expect(box).toHaveValue('I like the hill. Floods are rare It is safe.');
  });

  it('stops listening when the learner types in the box, and keeps the words', async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition();
    render(<Boxes />);
    await user.click(await screen.findByRole('button', { name: 'Say it 0' }));
    const rec = mock.latest();
    act(() => rec.hear([['on the hill', false]]));
    await user.type(screen.getByLabelText('Box 0'), '!');
    expect(rec.abort).toHaveBeenCalled();
    expect(screen.getByLabelText('Box 0')).toHaveValue('On the hill!');
    expect(screen.getByRole('button', { name: 'Say it 0' })).toBeInTheDocument();
    // Late results from the aborted listening are ignored.
    act(() => rec.hear([['on the hill today', true]]));
    expect(screen.getByLabelText('Box 0')).toHaveValue('On the hill!');
  });

  it('listens in one box at a time', async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition();
    render(<Boxes />);
    await user.click(await screen.findByRole('button', { name: 'Say it 0' }));
    const first = mock.latest();
    await user.click(screen.getByRole('button', { name: 'Say it 1' }));
    expect(first.abort).toHaveBeenCalled();
    expect(mock.instances).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Say it 0' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop 1' })).toBeInTheDocument();
    act(() => mock.latest().hear([['yes', true]]));
    expect(screen.getByLabelText('Box 1')).toHaveValue('Yes');
    expect(screen.getByLabelText('Box 0')).toHaveValue('');
  });

  it('turns errors into plain notices', async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition({ onDevice: false });
    render(<Boxes allowOnline />);
    const cases: Array<[string, string]> = [
      ['not-allowed', 'mic-blocked'],
      ['audio-capture', 'no-mic'],
      ['network', 'offline'],
      ['no-speech', 'no-speech'],
      ['language-not-supported', 'unavailable'],
    ];
    for (const [error, notice] of cases) {
      await user.click(await screen.findByRole('button', { name: 'Say it 0' }));
      act(() => mock.latest().fail(error));
      expect(screen.getByTestId('notice-0')).toHaveTextContent(notice);
    }
    // Typing clears the notice.
    await user.type(screen.getByLabelText('Box 0'), 'a');
    expect(screen.getByTestId('notice-0')).toHaveTextContent('');
  });

  it('stops offering on-device recognition on the page once it stops working, without asking the browser', async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition();
    render(<Boxes />);
    await user.click(await screen.findByRole('button', { name: 'Say it 0' }));
    act(() => mock.latest().fail('service-not-allowed'));
    await waitFor(() => expect(screen.queryByRole('button', { name: /say it/i })).not.toBeInTheDocument());
    expect(screen.getByTestId('notice-0')).toHaveTextContent('unavailable');
    expect(mock.available).not.toHaveBeenCalled();
  });

  it('goes online after on-device recognition stops working, where an educator allowed that', async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition();
    render(<Boxes allowOnline />);
    await user.click(await screen.findByRole('button', { name: 'Say it 0' }));
    expect(mock.latest().processLocally).toBe(true);
    act(() => mock.latest().fail('language-not-supported'));
    await waitFor(() => expect(latest.dictation?.mode).toBe('online'));
    await user.click(screen.getByRole('button', { name: 'Say it 0' }));
    expect(mock.latest().processLocally).toBe(false);
    expect(mock.available).not.toHaveBeenCalled();
  });

  it("lets go after Stop if the browser never says it has ended", async () => {
    const mock = mockSpeechRecognition();
    render(<Boxes />);
    const button = await screen.findByRole('button', { name: 'Say it 0' });
    vi.useFakeTimers();
    try {
      act(() => button.click());
      const rec = mock.latest();
      rec.stop.mockImplementation(() => undefined);
      act(() => screen.getByRole('button', { name: 'Stop 0' }).click());
      expect(screen.getByRole('button', { name: 'Stop 0' })).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(STOP_GRACE_MS);
      });
      expect(screen.getByRole('button', { name: 'Say it 0' })).toBeInTheDocument();
      expect(rec.abort).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops listening when the stage goes away', async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition();
    const { unmount } = render(<Boxes />);
    await user.click(await screen.findByRole('button', { name: 'Say it 0' }));
    unmount();
    expect(mock.latest().abort).toHaveBeenCalled();
  });
});
