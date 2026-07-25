-- She's Maid In ATL — core schema (Supabase / Postgres)
-- Top-level object is ORGANIZATION so the later network phase is a config
-- change, not a migration. Price-privacy is enforced structurally: internal
-- pricing (rate/hours/split) lives in *_pricing_internal tables that owners
-- have NO row-level access to (see 0002_rls.sql), so a client with dev tools
-- finds nothing even before the API serializer strips fields.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums --
create type user_role         as enum ('cleaner', 'owner', 'org_admin');
create type property_type      as enum ('airbnb', 'residential', 'loved_one');
create type edition_type       as enum ('vacation_rental', 'luxury_home');
create type product_preference as enum ('eco_non_toxic', 'standard_disinfectant');
create type signature_scent    as enum ('eucalyptus_mint', 'fresh_linen', 'citrus', 'lavender', 'unscented');
create type card_type          as enum ('CREDIT', 'DEBIT', 'UNKNOWN');
create type job_type           as enum ('turnover', 'residential', 'deep');
create type job_status         as enum ('scheduled', 'en_route', 'checked_in', 'in_progress', 'submitted', 'complete', 'cancelled', 'held');
create type payment_state      as enum (
  'scheduled', 'capture_failed', 'captured', 'deposit_released',
  'awaiting_approval', 'approved', 'auto_approved_48h', 'final_released',
  'settled', 'disputed', 'refunded');
create type charge_kind        as enum ('service_full', 'tip');
create type payout_kind        as enum ('arrival_50', 'approval_50', 'tip');
create type approval_kind      as enum ('owner_approved', 'auto_48h', 'declined');
create type quote_status       as enum ('draft', 'sent', 'accepted', 'declined');
create type maintenance_status as enum ('open', 'owner_handling', 'handyman_requested', 'resolved');
create type reorder_status     as enum ('flagged', 'approved', 'ordered', 'delivered');
create type staging_level      as enum ('light', 'standard', 'heavy');

-- --------------------------------------------------------------- tenancy --
create table organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_phone text,
  contact_email text,
  domain        text,                 -- business email domain for master sign-in
  created_at    timestamptz not null default now()
);

-- App users map 1:1 to Supabase auth users (auth.users.id).
create table users (
  id           uuid primary key,      -- = auth.users.id
  org_id       uuid references organizations(id) on delete set null,
  role         user_role not null,
  full_name    text,
  phone        text,
  phone_verified boolean not null default false,
  email        text,
  created_at   timestamptz not null default now()
);
create index on users(org_id);
create index on users(role);

-- ------------------------------------------------------------- payments --
-- Only tokens + metadata are stored; raw card numbers never touch the DB
-- (tokenized client-side via the Square Web Payments SDK). Consent is recorded
-- so a card-on-file capture (owner not present) is authorized + defensible.
create table payment_methods (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references users(id) on delete cascade,
  org_id          uuid not null references organizations(id) on delete cascade,
  processor       text not null default 'square',
  processor_token text not null,       -- card-on-file id (e.g. Square card id)
  brand           text not null,
  last4           text not null,
  exp_month       int,
  exp_year        int,
  card_type       card_type not null,  -- CREDIT enforced at the API before insert
  is_default      boolean not null default true,
  consent_version text not null,
  consent_text    text not null,
  consent_agreed_at timestamptz not null,
  created_at      timestamptz not null default now(),
  constraint credit_only check (card_type = 'CREDIT')
);
create index on payment_methods(owner_id);

-- ----------------------------------------------------------- properties --
create table properties (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references organizations(id) on delete cascade,
  owner_id           uuid not null references users(id) on delete cascade,
  name               text not null,
  type               property_type not null,
  address            text,
  neighborhood       text,
  lat                double precision,
  lng                double precision,
  beds               numeric,
  baths              numeric,
  source_url         text,             -- pasted listing link
  reference_photos   jsonb not null default '[]',  -- signed-URL keys; the standard
  product_preference product_preference not null default 'eco_non_toxic',
  signature_scent    signature_scent not null default 'eucalyptus_mint',
  standing_notes     text,             -- e.g. "keep regular coffee stocked"
  base_edition       edition_type not null default 'vacation_rental',
  geofence_radius_m  int not null default 150,
  created_at         timestamptz not null default now()
);
create index on properties(owner_id);
create index on properties(org_id);

-- ------------------------------------------------- Kee Method™ engine --
-- The method is DATA, not hardcoded screens: Method → Edition → Phase → Step.
create table methods (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  name       text not null default 'The Kee Method™',
  trademarked boolean not null default true
);
create table editions (
  id         uuid primary key default gen_random_uuid(),
  method_id  uuid not null references methods(id) on delete cascade,
  type       edition_type not null,
  name       text not null,
  step_count int not null default 0
);
create table phases (
  id         uuid primary key default gen_random_uuid(),
  edition_id uuid not null references editions(id) on delete cascade,
  ord        int not null,
  title      text not null
);
create table steps (
  id             uuid primary key default gen_random_uuid(),
  phase_id       uuid not null references phases(id) on delete cascade,
  ord            int not null,
  text           text not null,
  photo_required boolean not null default false,
  product_ref    text
);
-- Per-property override layers a home's standard on top of the base edition.
create table property_step_overrides (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties(id) on delete cascade,
  edition_id   uuid not null references editions(id) on delete cascade,
  note         text not null,          -- e.g. "Egyptian cotton, hospital corners"
  created_at   timestamptz not null default now()
);

-- --------------------------------------------------------------- quotes --
-- Client-facing quote carries ONLY the single tailored number (client_amount).
create table quotes (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  owner_id      uuid references users(id) on delete set null,
  lead_id       uuid,                  -- for pre-account leads
  property_id   uuid references properties(id) on delete set null,
  status        quote_status not null default 'draft',
  client_amount numeric not null,      -- the one number a client may see
  cadence       text,                  -- weekly | biweekly | monthly | one-time
  created_at    timestamptz not null default now()
);
-- INTERNAL pricing — owners have no RLS access to this table.
create table quote_pricing_internal (
  quote_id      uuid primary key references quotes(id) on delete cascade,
  engine        text not null,         -- 'airbnb' | 'residential'
  rate          numeric,
  hours         numeric,
  base          numeric,
  comfort_final numeric,
  staging       staging_level,
  assistant_pay numeric,
  business_keeps numeric,
  notes         text
);

-- ----------------------------------------------------------------- jobs --
create table jobs (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  property_id    uuid not null references properties(id) on delete cascade,
  owner_id       uuid not null references users(id) on delete cascade,
  cleaner_id     uuid references users(id) on delete set null,
  type           job_type not null,
  edition_id     uuid references editions(id) on delete set null,
  window_start   timestamptz,
  window_end     timestamptz,
  status         job_status not null default 'scheduled',
  payment_state  payment_state not null default 'scheduled',
  client_amount  numeric not null,     -- full service amount (client-visible)
  eco_finish     boolean not null default true,
  -- GPS check-in evidence (immutable once set)
  gps_checkin_lat double precision,
  gps_checkin_lng double precision,
  gps_checkin_at  timestamptz,
  started_at     timestamptz,
  finished_at    timestamptz,
  submitted_at   timestamptz,          -- starts the 24h/48h clock
  created_at     timestamptz not null default now()
);
create index on jobs(owner_id);
create index on jobs(cleaner_id);
create index on jobs(org_id);
create index on jobs(payment_state);

-- INTERNAL job pricing — owners have no RLS access.
create table job_pricing_internal (
  job_id        uuid primary key references jobs(id) on delete cascade,
  rate          numeric,
  hours         numeric,
  base          numeric,
  assistant_id  uuid references users(id) on delete set null,
  assistant_pay numeric,
  business_keeps numeric,
  duration_minutes int
);

-- Completed steps + photo proof (immutable evidence for chargeback defense).
create table job_steps (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references jobs(id) on delete cascade,
  step_id      uuid references steps(id) on delete set null,
  ord          int not null,
  text         text not null,
  photo_required boolean not null default false,
  completed    boolean not null default false,
  photo_key    text,                   -- storage object key (signed URL on read)
  photo_taken_at timestamptz,
  photo_lat    double precision,
  photo_lng    double precision
);
create index on job_steps(job_id);

-- ------------------------------------------------- money: charges/payouts --
create table charges (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references jobs(id) on delete cascade,
  kind        charge_kind not null,           -- service_full | tip
  amount      numeric not null,
  processor   text not null default 'square',
  processor_ref text,                          -- payment id
  card_type_at_charge card_type,               -- re-checked CREDIT at capture
  created_at  timestamptz not null default now()
);
create table payouts (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references jobs(id) on delete cascade,
  cleaner_id  uuid references users(id) on delete set null,
  kind        payout_kind not null,           -- arrival_50 | approval_50 | tip
  amount      numeric not null,
  released_at timestamptz not null default now()
);
create table approvals (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references jobs(id) on delete cascade,
  kind         approval_kind not null,        -- owner_approved | auto_48h | declined
  decided_at   timestamptz not null default now(),
  tip_amount   numeric
);
create table disputes (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references jobs(id) on delete cascade,
  owner_id    uuid not null references users(id) on delete cascade,
  category    text,
  note        text,
  photo_key   text,
  open        boolean not null default true,   -- pauses the 48h auto-release
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

-- ---------------------------------------------------------- pricing rules --
-- Editable by Ahleyia (admin only). Owners never read this.
create table pricing_rules (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  key         text not null,                  -- e.g. 'rate_standard'
  value       numeric not null,
  unique (org_id, key)
);

-- --------------------------------------------------- supplies/maintenance --
create table supply_items (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name        text not null,
  icon        text,
  par_level   int not null default 1,
  on_hand     int not null default 0,
  supplier_only boolean not null default false -- linens route to a supplier
);
create table reorders (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  status      reorder_status not null default 'flagged',
  items       jsonb not null default '[]',
  total_cents int,
  created_at  timestamptz not null default now()
);
create table maintenance_issues (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  reported_by uuid references users(id) on delete set null,
  title       text not null,
  photo_key   text,
  status      maintenance_status not null default 'open',
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------ reports / messages --
create table reports (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references jobs(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  owner_id    uuid not null references users(id) on delete cascade,
  steps_done  int not null,
  steps_total int not null,
  photo_count int not null default 0,
  reference_match boolean,
  created_at  timestamptz not null default now()
);
create table messages (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  thread_key  text not null,                  -- owner<->cleaner / business
  sender_id   uuid references users(id) on delete set null,
  owner_id    uuid references users(id) on delete set null, -- the client on the thread
  body        text not null,
  photo_key   text,
  created_at  timestamptz not null default now()
);
create index on messages(thread_key);

-- --------------------------------------------------- invites / leads --
create table invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  kind        text not null,                  -- 'owner' | 'cleaner'
  token       text not null unique,           -- magic-link token
  phone       text,
  email       text,
  accepted    boolean not null default false,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create table leads (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text,
  phone       text,
  source      text,                           -- 'card' | 'qr' | 'instagram' | ...
  note        text,
  created_at  timestamptz not null default now()
);
