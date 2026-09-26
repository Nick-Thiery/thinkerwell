import { useState } from 'react';
import { ActionBar } from '../../components/ds/ActionBar';
import { Button } from '../../components/ds/Button';
import { Chip } from '../../components/ds/Chip';
import { ListenBar } from '../../components/ds/ListenBar';
import { SegmentedControl } from '../../components/ds/SegmentedControl';
import { ToolToggle } from '../../components/ds/ToolToggle';
import { VoiceButton } from '../../components/ds/VoiceButton';
import { VoiceRecorder } from '../../components/ds/VoiceRecorder';
import { WritingBox } from '../../components/ds/WritingBox';

const MAP_SITES = ['Near the river', 'On the hill', 'In the forest'];

/**
 * /dev/components: Button, ToolToggle, SegmentedControl, Chip, WritingBox,
 * VoiceButton, ListenBar, VoiceRecorder, ActionBar in their main states
 * (owned by the "ds-actions-voice" sub-task).
 *
 * Every controlled component here keeps its own bit of state so a reviewer
 * can actually operate it (click, tab, arrow-key) rather than look at a
 * frozen picture.
 */
export function ActionsSection() {
  const [toolPressed, setToolPressed] = useState(true);
  const [level, setLevel] = useState('Standard');
  const [mapSite, setMapSite] = useState(MAP_SITES[0]!);
  const [starterChip, setStarterChip] = useState(false);
  const [writingHelp, setWritingHelp] = useState('starters');
  const [dictating, setDictating] = useState(false);
  const [sayingIt, setSayingIt] = useState(false);
  const [listenState, setListenState] = useState<'playing' | 'paused'>('playing');
  const [speed, setSpeed] = useState<'slow' | 'normal'>('normal');
  const [recorderState, setRecorderState] = useState<'idle' | 'recording' | 'recorded'>('idle');
  const [actionDisabled, setActionDisabled] = useState(true);

  return (
    <section id="actions" className="tw-dev-section" aria-label="Action and voice components">
      <h2 className="h2">
        Actions and voice: Button, ToolToggle, SegmentedControl, Chip, WritingBox, VoiceButton, ListenBar,
        VoiceRecorder, ActionBar
      </h2>

      <h3 className="h3">Button</h3>
      <div className="tw-dev-row">
        <Button variant="primary">Continue to Write</Button>
        <Button variant="secondary">Read instead</Button>
        <Button variant="support" icon="Lightbulb">
          Word help
        </Button>
        <Button variant="lemon">Try again</Button>
        <Button variant="ghost" icon="ArrowLeft">
          Back
        </Button>
        <Button variant="primary" size="lg" iconRight="ArrowRight">
          Finish lesson
        </Button>
        <Button variant="primary" disabled>
          Continue
        </Button>
      </div>

      <h3 className="h3">ToolToggle</h3>
      <div className="tw-dev-row">
        <ToolToggle icon="Volume2" pressed={toolPressed} onClick={() => setToolPressed((v) => !v)}>
          Listen
        </ToolToggle>
        <ToolToggle icon="Search" tone="support">
          Key words
        </ToolToggle>
      </div>

      <h3 className="h3">SegmentedControl</h3>
      <div className="tw-dev-row">
        <SegmentedControl label="Reading level" options={['Standard', 'Simpler']} value={level} onChange={setLevel} />
        <SegmentedControl
          label="Writing help"
          options={[
            { label: 'Write', value: 'write' },
            { label: 'Starters', value: 'starters' },
            { label: 'Plan', value: 'plan' },
          ]}
          value={writingHelp}
          onChange={setWritingHelp}
        />
      </div>

      <h3 className="h3">Chip</h3>
      <div className="tw-dev-row" role="radiogroup" aria-label="Where would you build the new town?">
        {MAP_SITES.map((site) => (
          <Chip key={site} role="radio" selected={mapSite === site} onClick={() => setMapSite(site)}>
            {site}
          </Chip>
        ))}
      </div>
      <div className="tw-dev-row">
        <Chip variant="starter" icon="Plus" selected={starterChip} onClick={() => setStarterChip((v) => !v)}>
          One reason is ___.
        </Chip>
      </div>

      <h3 className="h3">WritingBox</h3>
      <div className="tw-dev-row">
        <WritingBox
          id="dev-writing-plain"
          label="Your answer"
          helper="4 to 6 sentences is plenty. Saved on this device as you type."
        />
        <WritingBox
          id="dev-writing-dictate"
          label="Your answer"
          optional
          dictate={dictating ? 'listening' : true}
          onDictateClick={() => setDictating((v) => !v)}
          helper="Tap Say it to talk instead of typing."
        />
      </div>

      <h3 className="h3">VoiceButton</h3>
      <div className="tw-dev-row">
        <VoiceButton state={sayingIt ? 'listening' : 'idle'} onClick={() => setSayingIt((v) => !v)} />
      </div>

      <h3 className="h3">ListenBar</h3>
      <div className="tw-dev-row">
        <ListenBar
          state={listenState}
          speed={speed}
          label="Reading aloud · part 1 of 3"
          onPlayPause={() => setListenState((s) => (s === 'playing' ? 'paused' : 'playing'))}
          onSpeedChange={setSpeed}
          onStop={() => setListenState('paused')}
        />
      </div>

      <h3 className="h3">VoiceRecorder</h3>
      <div className="tw-dev-row">
        <VoiceRecorder
          state={recorderState}
          time={recorderState === 'recording' ? '0:12' : recorderState === 'recorded' ? '0:42' : undefined}
          onStart={() => setRecorderState('recording')}
          onStop={() => setRecorderState('recorded')}
          onPlayback={() => setRecorderState('recorded')}
          onReRecord={() => setRecorderState('recording')}
          onDelete={() => setRecorderState('idle')}
        >
          <p className="body">Tell a partner one thing you learned today.</p>
        </VoiceRecorder>
      </div>

      <h3 className="h3">ActionBar</h3>
      <div className="tw-dev-row" style={{ flexDirection: 'column', gap: 'var(--space-4)', width: '100%' }}>
        {/* A disabled Next button can't be clicked, so its own onNext can
            never be the thing that re-enables it: a separate toggle drives
            `disabled` here, the way a real page's own answered-state would. */}
        <Chip selected={!actionDisabled} icon={actionDisabled ? undefined : 'Check'} onClick={() => setActionDisabled((v) => !v)}>
          Answer the question
        </Chip>
        <ActionBar
          back="Read"
          next="Save and continue to Speak"
          helper={actionDisabled ? 'Answer the question above to continue.' : undefined}
          disabled={actionDisabled}
          onBack={() => undefined}
          onNext={() => undefined}
        />
        <ActionBar next="Continue to Watch" onNext={() => undefined} />
      </div>
    </section>
  );
}
