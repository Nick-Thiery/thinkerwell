import { useState } from 'react';
import { ChoiceOption } from '../../components/ds/ChoiceOption';
import { DefinitionCard } from '../../components/ds/DefinitionCard';
import { EvidenceCard } from '../../components/ds/EvidenceCard';
import { Feedback } from '../../components/ds/Feedback';
import { GlossaryTerm } from '../../components/ds/GlossaryTerm';
import { QuestionCard } from '../../components/ds/QuestionCard';
import { ReadingCard } from '../../components/ds/ReadingCard';
import { TaskCard } from '../../components/ds/TaskCard';
import { TextField } from '../../components/ds/TextField';
import { VideoCard } from '../../components/ds/VideoCard';

/**
 * /dev/components: TaskCard, ReadingCard, GlossaryTerm, DefinitionCard,
 * EvidenceCard, ChoiceOption, Feedback, QuestionCard, TextField, VideoCard
 * in their main states (owned by the "ds-content" sub-task).
 */
export function ContentSection() {
  const [quizSelected, setQuizSelected] = useState<number | undefined>(1);
  const [quizResult, setQuizResult] = useState<'correct' | 'retry' | undefined>('retry');
  const [listeningWord, setListeningWord] = useState<string>();

  function handleSelect(index: number) {
    setQuizSelected(index);
    setQuizResult(index === 2 ? 'correct' : 'retry');
  }

  // Demo only: real playback (speechSynthesis) is phase 4's Listen work.
  // Wiring DefinitionCard's onListen here shows "Hear it" as a real toggle
  // rather than a button with no effect.
  function toggleListening(word: string) {
    setListeningWord((current) => (current === word ? undefined : word));
  }

  return (
    <section id="content" className="tw-dev-section" aria-label="Lesson content components">
      <h2 className="h2">
        Content: TaskCard, ReadingCard, GlossaryTerm, DefinitionCard, EvidenceCard, ChoiceOption, Feedback,
        QuestionCard, TextField, VideoCard
      </h2>

      <h3 className="h3">TaskCard</h3>
      <div className="tw-dev-row" style={{ flexDirection: 'column', width: '100%' }}>
        <TaskCard eyebrow="Before you read" icon="Lightbulb">
          Think about a time you crossed a river or a bridge. What was it like?
        </TaskCard>
        <TaskCard tone="lavender">Look at the map. Where would you build a new town, and why?</TaskCard>
      </div>

      <h3 className="h3">ReadingCard, GlossaryTerm and DefinitionCard</h3>
      <div className="tw-dev-row" style={{ width: '100%' }}>
        <ReadingCard part="Read · 1 of 3" heading="Rivers give water and food">
          Every community needs water to drink, cook and wash. When a river{' '}
          <GlossaryTerm
            definition="When water covers land that is usually dry."
            onListen={() => toggleListening('floods')}
            listening={listeningWord === 'floods'}
          >
            floods
          </GlossaryTerm>
          , it leaves a layer of mud on the land, and this mud makes the soil{' '}
          <GlossaryTerm
            word="fertile"
            definition="Good for growing lots of plants and food."
            example="Mud from the river makes the land at the River site fertile."
            onListen={() => toggleListening('fertile')}
            listening={listeningWord === 'fertile'}
            open
          >
            fertile
          </GlossaryTerm>
          , so crops grow well.
        </ReadingCard>
      </div>
      <p className="body small">GlossaryTerm above: one closed, one opened by default (its DefinitionCard popover).</p>
      <div className="tw-dev-row">
        <DefinitionCard
          word="settlement"
          definition="A place where people live together, like a village or town."
          example="Some of the first settlements grew beside rivers."
          onListen={() => toggleListening('settlement')}
          listening={listeningWord === 'settlement'}
        />
      </div>

      <h3 className="h3">EvidenceCard</h3>
      <div className="tw-dev-row">
        <EvidenceCard
          kind="object"
          title="A clay pot from the River site"
          items={['Made from river clay', 'Found near the old riverbank', 'About 400 years old']}
        />
        <EvidenceCard
          kind="note"
          title="A trader's note"
          text="We carried grain down the river to the market and traded it for cloth."
          quote
          fictional
        />
      </div>

      <h3 className="h3">ChoiceOption (idle, selected, correct, retry, muted)</h3>
      <div className="tw-dev-row" role="radiogroup" aria-label="Example states" style={{ flexDirection: 'column', width: '100%', maxWidth: 480 }}>
        <ChoiceOption letter="A" state="idle">
          It has fresh water all year
        </ChoiceOption>
        <ChoiceOption letter="B" state="selected">
          It is close to the mountains
        </ChoiceOption>
        <ChoiceOption letter="C" state="correct">
          It lets people move goods by boat
        </ChoiceOption>
        <ChoiceOption letter="D" state="retry" muted>
          It has more space for houses
        </ChoiceOption>
      </div>

      <h3 className="h3">Feedback</h3>
      <div className="tw-dev-row" style={{ flexDirection: 'column', width: '100%' }}>
        <Feedback tone="correct">You used evidence from the map.</Feedback>
        <Feedback tone="retry">Look for a detail on the object itself.</Feedback>
      </div>

      <h3 className="h3">QuestionCard, mid-flow with feedback shown</h3>
      <div style={{ maxWidth: 560 }}>
        <QuestionCard
          id="dev-question"
          eyebrow="Question 2 of 3"
          prompt="Which detail shows how a river can help people trade?"
          options={[
            'It has fresh water all year',
            'It is close to the mountains',
            'It lets people move goods by boat',
          ]}
          selected={quizSelected}
          result={quizResult}
          feedback={
            quizResult === 'correct'
              ? 'Moving goods by boat is a form of trade.'
              : 'This is a good thing about water, but this question is about trade. Look for the answer about moving goods.'
          }
          onSelect={handleSelect}
        />
      </div>

      <h3 className="h3">TextField</h3>
      <div className="tw-dev-row" style={{ width: '100%', maxWidth: 480 }}>
        <TextField id="dev-name" label="First name or nickname" value="Amina" helper="No surname needed." />
        <TextField id="dev-class" label="Class code" optional placeholder="For example HLP-07" />
      </div>

      <h3 className="h3">VideoCard</h3>
      <div className="tw-dev-row" style={{ width: '100%', maxWidth: 420 }}>
        <VideoCard title="Ancient Mesopotamia 101" channel="National Geographic" duration="4:10" language="English">
          <p className="body">
            A real example of some of the world&apos;s first cities, which grew on fertile land between two rivers.
          </p>
        </VideoCard>
      </div>
    </section>
  );
}
