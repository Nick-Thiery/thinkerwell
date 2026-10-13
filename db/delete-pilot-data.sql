-- Deleting a pilot's data (docs/notes/pilot-measurement.md). Run with psql:
--
--   psql "$DATABASE_URL" -v org="'help-jakarta'" -f db/delete-pilot-data.sql
--
-- The consent form promises everything the study keeps is deleted within 6
-- months after the pilot ends. Export first if the team needs the data for
-- the report (GET /api/export). Deleting is permanent.

begin;
select count(*) as events_to_delete from events where org = :org;
delete from events where org = :org;
commit;

-- One family withdrew (their code is on the organisation's paper list, never here):
--   delete from events where org = 'help-jakarta' and pilot_code = 'HLP-07';
