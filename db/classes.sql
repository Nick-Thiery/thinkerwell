-- Online classes (docs/notes/online-classes.md): the tables behind
-- /api/classes. Only api/_lib/classes.ts reads and writes them, after
-- checking every field (src/classes/protocol.ts). The browser never holds
-- a database key.
--
-- Nothing here is filled until Thinkerwell makes an organisation for a
-- partner that has agreed to use online classes, the organisation makes a
-- class, and a learner taps "Join class" with its code. What is kept about
-- a learner: the name on their device (it may be a nickname), language,
-- reading level, the lessons and steps they finished and when, how often
-- they tried each section check, and the days they worked. Never writing,
-- answers, scores or recordings.
--
--   psql "$DATABASE_URL" -f db/classes.sql
--
-- Works on Neon, Supabase and Vercel Postgres (Postgres 13 or later).
-- Safe to run again: everything is "if not exists".

create table if not exists cv_orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 80),
  -- sha256 of the organisation's secret link key (hex); the key itself is never stored.
  key_hash    text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  enabled     boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists cv_classes (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references cv_orgs (id) on delete cascade,
  name        text not null check (length(name) between 1 and 80),
  -- What learners type to join ("K7M-Q4P").
  code        text not null unique check (code ~ '^[A-Z0-9]{3}-[A-Z0-9]{3}$'),
  -- sha256 of the teacher's secret link key (hex).
  key_hash    text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists cv_classes_org_idx on cv_classes (org_id);

create table if not exists cv_learners (
  -- Random, made on the device when the learner joined (not the device's own learner id).
  id              uuid primary key,
  class_id        uuid not null references cv_classes (id) on delete cascade,
  -- sha256 of the device's secret for this learner (hex).
  secret_hash     text not null check (secret_hash ~ '^[0-9a-f]{64}$'),
  -- The name on the device: shown to the class's teacher and organisation, never to the admin dashboard.
  nickname        text not null check (length(nickname) between 1 and 60),
  language        text check (language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$'),
  reading_level   text check (reading_level in ('standard', 'simpler')),
  joined_at       timestamptz not null default now(),
  last_sync_at    timestamptz not null default now(),
  -- The latest lesson work the device reported (never later than when it was received).
  last_active_at  timestamptz
);
create index if not exists cv_learners_class_idx on cv_learners (class_id);

create table if not exists cv_progress (
  learner_id     uuid not null references cv_learners (id) on delete cascade,
  lesson_id      text not null check (lesson_id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  course_id      text not null check (course_id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  stages_done    text[] not null default '{}',
  current_stage  text check (current_stage in ('read', 'write', 'speak', 'watch', 'reflect')),
  started_at     timestamptz,
  updated_at     timestamptz,
  completed_at   timestamptz,
  primary key (learner_id, lesson_id)
);
create index if not exists cv_progress_lesson_idx on cv_progress (lesson_id);

create table if not exists cv_checks (
  learner_id  uuid not null references cv_learners (id) on delete cascade,
  section_id  text not null check (section_id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  attempts    integer not null check (attempts >= 0),
  last_at     timestamptz,
  primary key (learner_id, section_id)
);

-- The days a learner worked (their device's calendar), for "active this week" and the trends.
create table if not exists cv_active_days (
  learner_id  uuid not null references cv_learners (id) on delete cascade,
  day         date not null,
  primary key (learner_id, day)
);
create index if not exists cv_active_days_day_idx on cv_active_days (day);

-- Learners a teacher took out of a class: their device is told to stop
-- sharing, and the id can't join again. Only the id is kept.
create table if not exists cv_removed (
  id          uuid primary key,
  removed_at  timestamptz not null default now()
);
