import { useState } from 'react';
import { ContinueCard } from '../../components/ds/ContinueCard';
import { JournalEntry } from '../../components/ds/JournalEntry';
import { LearnerTile } from '../../components/ds/LearnerTile';
import { LessonRow } from '../../components/ds/LessonRow';
import { ScoreSummary } from '../../components/ds/ScoreSummary';
import { SectionBadge } from '../../components/ds/SectionBadge';
import { SectionHeader } from '../../components/ds/SectionHeader';
import { StatusBanner } from '../../components/ds/StatusBanner';

/**
 * /dev/components: SectionBadge, SectionHeader, LessonRow, ContinueCard,
 * LearnerTile, JournalEntry, ScoreSummary, StatusBanner in their main states
 * (owned by the "ds-course" sub-task).
 */
export function CourseSection() {
  const [backBannerShown, setBackBannerShown] = useState(true);
  return (
    <section id="course" className="tw-dev-section" aria-label="Course components">
      <h2 className="h2">
        Course: SectionBadge, SectionHeader, LessonRow, ContinueCard, LearnerTile, JournalEntry, ScoreSummary,
        StatusBanner
      </h2>

      <h3 className="h3">SectionBadge</h3>
      <div className="tw-dev-row">
        <SectionBadge section="history" number={1} />
        <SectionBadge section="geography" number={2} />
        <SectionBadge section="culture" number={3} />
        <SectionBadge section="civics" number={4} />
        <SectionBadge section="history" showName={false} />
        <SectionBadge section="history" number={1} name="A custom section title" />
      </div>

      <h3 className="h3">SectionHeader</h3>
      <div className="tw-dev-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <SectionHeader
          section="geography"
          number={2}
          total={5}
          completed={0}
          question="How do places shape people's lives, and how do people shape places?"
        />
        <SectionHeader section="civics" number={4} rounded question="How do people make choices together?" />
      </div>

      <h3 className="h3">LessonRow</h3>
      <div className="tw-dev-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <LessonRow
          number={11}
          title="How do maps help us understand a place?"
          question="What can a map show that words alone cannot?"
          time="About 30–50 min"
          status="not-started"
          href="#"
        />
        <LessonRow
          number={10}
          title="Why do people build towns near rivers?"
          question="What makes one place better than another for a community to live?"
          time="About 30–50 min"
          status="in-progress"
          done={['read']}
          current="write"
          highlight
          href="#"
        />
        <LessonRow
          number={9}
          title="Why do some places have more resources than others?"
          question="How does location affect what a community can build and trade?"
          time="About 30–50 min"
          status="completed"
          href="#"
        />
        <LessonRow
          kind="quiz"
          title="Section check: Geography & Our Environment"
          question="10 questions about Lessons 10–14. Try it any time, as often as you like."
          time="About 15 min"
          href="#"
        />
      </div>

      <h3 className="h3">ContinueCard</h3>
      <ContinueCard
        title="Why do people build towns near rivers?"
        lessonLabel="Lesson 10 · Geography"
        done={['read']}
        current="write"
        stageLabel="Next step: Write"
        href="#"
      />

      <h3 className="h3">LearnerTile</h3>
      <div className="tw-dev-row">
        <LearnerTile name="Amina" tone="lemon" meta="Up to Lesson 10" />
        <LearnerTile name="Reza" tone="geography" meta="Up to Lesson 3" selected />
        <LearnerTile name="Hawa" tone="civics" meta="Up to Lesson 1" />
        <LearnerTile name="I'm new here" variant="new" />
        <LearnerTile name="Just look around" variant="guest" />
      </div>

      <h3 className="h3">JournalEntry</h3>
      <div className="tw-dev-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <JournalEntry
          lessonNumber={10}
          lessonTitle="Why do people build towns near rivers?"
          kind="Reflection"
          prompt="One thing I learned today is…"
          text="Rivers help a town with water, farms and trade. But rivers can also flood, so people have to plan for both."
          date="today"
        />
        <JournalEntry
          lessonNumber={10}
          lessonTitle="Why do people build towns near rivers?"
          kind="Writing"
          prompt="Choose one place on the map for a new town. Explain two reasons and one possible problem."
          text="I would choose the River site because farmers can use the water to grow crops."
          date="today"
        />
      </div>

      <h3 className="h3">ScoreSummary</h3>
      <ScoreSummary
        skills={[
          { name: 'Evidence', got: 3, of: 4 },
          { name: 'Cause and effect', got: 2, of: 3 },
          { name: 'Maps', got: 3, of: 3 },
        ]}
      />

      <h3 className="h3">StatusBanner</h3>
      <div className="tw-dev-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <StatusBanner tone="offline" title="You're offline.">
          Keep going: your work is saved on this device.
        </StatusBanner>
        {backBannerShown ? (
          <StatusBanner tone="back" title="You're back online." action="Dismiss" onAction={() => setBackBannerShown(false)}>
            Your work is saved.
          </StatusBanner>
        ) : (
          <p className="body small">
            (Dismissed. <button type="button" onClick={() => setBackBannerShown(true)}>Show it again</button>)
          </p>
        )}
        <StatusBanner tone="info" title="Slow internet?">
          Choose Read instead. It has the same ideas and uses almost no data.
        </StatusBanner>
      </div>
    </section>
  );
}
