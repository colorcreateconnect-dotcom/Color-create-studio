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

create table client_invites (
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

create index client_invites_org_idx   on client_invites (org_id);
create index client_invites_owner_idx on client_invites (owner_id);

alter table client_invites enable row level security;

-- Only the studio's staff can create or see invitations, and only for their own
-- organization. The claim path is deliberately NOT here: an unclaimed client is
-- not signed in yet, so claiming runs in a function with the service-role key,
-- which verifies the token itself.
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
