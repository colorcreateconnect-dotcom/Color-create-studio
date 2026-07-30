-- ============================================================================
-- She's Maid In ATL — UPGRADE an existing database
--
-- Use this when you have ALREADY run setup.sql before and just need the newer
-- parts. Safe to run more than once.
--
-- (On a brand-new project, run setup.sql instead — it contains everything.)
-- ============================================================================


-- ---------- 0006_client_invites.sql ----------
-- Bringing her existing book of business into the app.
--
-- Ahleyia has clients from before the app: she knows their home, their agreed
-- price and their schedule. Those clients must be REAL in the system straight
-- away (properties.owner_id is NOT NULL and users.id = auth.users.id, so a
-- property cannot exist without an account), and each client then finishes
-- their own side — email, password, card — from a link she sends them.
--
-- So the account is provisioned server-side first, and this table holds the
-- one-time invitation that lets the right person claim it.
--
-- The token is never stored: only its SHA-256 hash. A leaked database backup
-- therefore cannot be used to claim anyone's account. Tokens are single-use
-- (claimed_at) and expiring (expires_at).

create table if not exists client_invites (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  owner_id     uuid not null references users(id) on delete cascade, -- the client
  token_hash   text not null unique,          -- sha256(token); the token is shown once
  created_by   uuid references users(id) on delete set null,
  expires_at   timestamptz not null,
  claimed_at   timestamptz,                   -- single use: set on claim
  revoked_at   timestamptz,                   -- she can cancel a link she sent
  created_at   timestamptz not null default now()
);

create index if not exists client_invites_org_idx   on client_invites (org_id);
create index if not exists client_invites_owner_idx on client_invites (owner_id);

alter table client_invites enable row level security;

-- Only the studio's staff can create or see invitations, and only for their own
-- organization. The claim path is deliberately NOT here: an unclaimed client is
-- not signed in yet, so claiming runs in a function with the service-role key,
-- which verifies the token itself.
drop policy if exists invite_staff_all on client_invites;
create policy invite_staff_all on client_invites for all
  using (is_staff() and org_id = app_org())
  with check (is_staff() and org_id = app_org());

-- Has this client finished setting up their own login yet? Lets her client list
-- show "Invite sent" vs "Joined" without exposing anything about the token.
alter table users add column if not exists onboarding_state text
  not null default 'active'
  check (onboarding_state in ('invited', 'active'));

comment on column users.onboarding_state is
  'invited = provisioned by the studio, has not claimed their login yet; active = normal account';


-- ---------- 0007_sms_consent.sql ----------
-- Recorded consent to be texted.
--
-- Business SMS to US numbers is regulated: the recipient must have agreed, and
-- must be able to stop. Ahleyia's existing clients agreeing verbally is not
-- enough on paper — so consent is recorded per person, with a timestamp, and
-- every outbound message checks it. An opt-out (STOP) is honoured forever and
-- is deliberately separate from consent, so re-adding consent cannot silently
-- override someone who asked to stop.

alter table users add column if not exists sms_consent      boolean not null default false;
alter table users add column if not exists sms_consent_at   timestamptz;
alter table users add column if not exists sms_opted_out    boolean not null default false;
alter table users add column if not exists sms_opted_out_at timestamptz;

comment on column users.sms_consent   is 'They agreed to be texted about their service. Recorded with sms_consent_at.';
comment on column users.sms_opted_out is 'They replied STOP. Overrides consent, permanently, until they opt back in.';


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
