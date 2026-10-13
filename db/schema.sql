-- Pilot measurement: the one table (docs/notes/pilot-measurement.md).
--
-- Only api/events.ts writes to it, and only after it has checked every field
-- (src/measurement/events.ts). The browser never holds a database key.
-- Works on Neon, Supabase and Vercel Postgres (Postgres 13 or later).
--
--   psql "$DATABASE_URL" -f db/schema.sql
--
-- Safe to run again: everything is "if not exists".

create table if not exists events (
  -- A random id made on the device, so a retry never counts twice.
  id          uuid primary key,
  -- The organisation's code (help-jakarta). Every report filters on it.
  org         text not null check (org ~ '^[a-z0-9][a-z0-9-]{1,31}$'),
  -- The learner's pilot code (HLP-01), never a name.
  pilot_code  text not null check (pilot_code ~ '^[A-Z0-9]{2,5}-[0-9]{2,3}$'),
  -- Random per device, made when sharing is turned on (not derived from the hardware).
  device_id   uuid not null,
  -- Random per stretch of use.
  session_id  uuid not null,
  type        text not null check (type in (
    'session_start', 'session_end', 'heartbeat',
    'lesson_open', 'stage_enter', 'stage_complete', 'lesson_complete',
    'quick_check_answer', 'quiz_start', 'quiz_answer', 'quiz_submit',
    'writing_saved', 'simpler_toggle', 'listen_play',
    'video_choice', 'video_play', 'video_progress', 'video_fail'
  )),
  lesson_id   text check (lesson_id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  stage       text check (stage in ('read', 'write', 'speak', 'watch', 'reflect')),
  -- The small, checked details of the event: numbers, true/false and a few
  -- fixed words. Never text a learner wrote.
  value       jsonb not null default '{}'::jsonb
              check (jsonb_typeof(value) = 'object' and length(value::text) < 512),
  -- When it happened by the device's clock (may be wrong), and when the server got it (right).
  ts          timestamptz not null,
  received_at timestamptz not null default now(),
  app_version text not null check (length(app_version) <= 24)
);

-- A report for one organisation, in order.
create index if not exists events_org_received_idx on events (org, received_at, id);
-- One learner's story, and the rate limit's "how many in the last minute".
create index if not exists events_pilot_received_idx on events (pilot_code, received_at);
-- Counting one kind of event for an organisation (completions, quiz submissions).
create index if not exists events_org_type_idx on events (org, type);
