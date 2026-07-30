-- One step of the upgrade. Run these files IN ORDER, one at a time.
-- Each is safe to run more than once, and a failure in one leaves the
-- earlier ones in place — which is the whole point of splitting them:
-- the SQL editor runs a script as a single transaction, so one error in a
-- combined file silently reverts everything before it.
-- ============================================================
-- ---------- 0008_job_steps_phase.sql ----------
-- The checklist a cleaner actually works from.
--
-- job_steps carried the text and the photo flag but not which PHASE a step
-- belongs to, so the app could only group steps by joining back through
-- steps -> phases on every read. The Kee Method's five phases are the shape of
-- the working day, so the phase travels with the step: one read, no joins, and
-- the checklist keeps working even if a template is later edited.
--
-- Steps created before this exist with a null phase and fall back to a single
-- group in the UI, so nothing breaks for jobs already in flight.

alter table job_steps add column if not exists phase_title text;
alter table job_steps add column if not exists phase_ord   int;

create index if not exists job_steps_job_idx on job_steps (job_id, phase_ord, ord);

comment on column job_steps.phase_title is
  'The Kee Method phase this step belongs to, copied in at instantiation.';
