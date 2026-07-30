-- ============================================================================
-- She's Maid In ATL — one-shot database setup for a NEW Supabase project.
-- SQL Editor → New query → paste this whole file → Run.
--
-- ALREADY RAN THIS BEFORE? Do NOT re-run it — run supabase/upgrade.sql instead,
-- which contains only the newer parts and is safe to run repeatedly.
-- ============================================================================


-- ============================================================
-- 0001_schema.sql
-- ============================================================
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


-- ============================================================
-- 0002_rls.sql
-- ============================================================
-- Row-Level Security — isolation at the DATABASE, not just the UI.
-- An owner must be incapable of querying another owner's data, and incapable of
-- reading internal pricing at all. Staff/admin are scoped to their organization.

-- ------------------------------------------------------------- helpers --
create or replace function app_role() returns user_role
  language sql stable security definer set search_path = public as
$$ select role from users where id = auth.uid() $$;

create or replace function app_org() returns uuid
  language sql stable security definer set search_path = public as
$$ select org_id from users where id = auth.uid() $$;

create or replace function is_staff() returns boolean
  language sql stable as
$$ select app_role() in ('cleaner','org_admin') $$;

create or replace function is_admin() returns boolean
  language sql stable as
$$ select app_role() = 'org_admin' $$;

-- ------------------------------------------------------- enable RLS --
alter table organizations            enable row level security;
alter table users                    enable row level security;
alter table payment_methods          enable row level security;
alter table properties               enable row level security;
alter table methods                  enable row level security;
alter table editions                 enable row level security;
alter table phases                   enable row level security;
alter table steps                    enable row level security;
alter table property_step_overrides  enable row level security;
alter table quotes                   enable row level security;
alter table quote_pricing_internal   enable row level security;
alter table jobs                     enable row level security;
alter table job_pricing_internal     enable row level security;
alter table job_steps                enable row level security;
alter table charges                  enable row level security;
alter table payouts                  enable row level security;
alter table approvals                enable row level security;
alter table disputes                 enable row level security;
alter table pricing_rules            enable row level security;
alter table supply_items             enable row level security;
alter table reorders                 enable row level security;
alter table maintenance_issues       enable row level security;
alter table reports                  enable row level security;
alter table messages                 enable row level security;
alter table invites                  enable row level security;
alter table leads                    enable row level security;

-- ---------------------------------------------------------- users/org --
create policy user_self_read on users for select
  using (id = auth.uid() or (is_staff() and org_id = app_org()));
create policy org_staff_read on organizations for select
  using (id = app_org());

-- ------------------------------------------------------ payment methods --
-- Owner sees only their own cards; staff/admin see cards in their org (to
-- charge on file). Nobody but the owner can insert their card.
create policy pm_owner_read on payment_methods for select
  using (owner_id = auth.uid() or (is_staff() and org_id = app_org()));
create policy pm_owner_write on payment_methods for insert
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------- properties --
create policy prop_owner_all on properties for all
  using (owner_id = auth.uid() or (is_staff() and org_id = app_org()))
  with check (owner_id = auth.uid() or (is_staff() and org_id = app_org()));

-- --------------------------------------------- Kee Method (org-scoped read) --
create policy method_read on methods for select using (org_id = app_org());
create policy edition_read on editions for select
  using (exists (select 1 from methods m where m.id = editions.method_id and m.org_id = app_org()));
create policy phase_read on phases for select
  using (exists (select 1 from editions e join methods m on m.id = e.method_id
                 where e.id = phases.edition_id and m.org_id = app_org()));
create policy step_read on steps for select
  using (exists (select 1 from phases p join editions e on e.id = p.edition_id
                 join methods m on m.id = e.method_id
                 where p.id = steps.phase_id and m.org_id = app_org()));
create policy override_owner on property_step_overrides for all
  using (exists (select 1 from properties pr where pr.id = property_id
                 and (pr.owner_id = auth.uid() or (is_staff() and pr.org_id = app_org()))));

-- --------------------------------------------------------------- quotes --
create policy quote_read on quotes for select
  using (owner_id = auth.uid() or (is_staff() and org_id = app_org()));
create policy quote_staff_write on quotes for all
  using (is_staff() and org_id = app_org())
  with check (is_staff() and org_id = app_org());

-- INTERNAL pricing: STAFF/ADMIN ONLY. No owner policy exists → owners get zero
-- rows. This is the database-level price-privacy guarantee.
create policy quote_internal_staff on quote_pricing_internal for all
  using (exists (select 1 from quotes q where q.id = quote_id and is_staff() and q.org_id = app_org()))
  with check (exists (select 1 from quotes q where q.id = quote_id and is_staff() and q.org_id = app_org()));

-- ----------------------------------------------------------------- jobs --
create policy job_read on jobs for select
  using (owner_id = auth.uid() or (is_staff() and org_id = app_org()));
create policy job_staff_write on jobs for update
  using (is_staff() and org_id = app_org())
  with check (is_staff() and org_id = app_org());

-- INTERNAL job pricing: staff/admin only (price-privacy guarantee).
create policy job_internal_staff on job_pricing_internal for all
  using (exists (select 1 from jobs j where j.id = job_id and is_staff() and j.org_id = app_org()))
  with check (exists (select 1 from jobs j where j.id = job_id and is_staff() and j.org_id = app_org()));

create policy jobstep_read on job_steps for select
  using (exists (select 1 from jobs j where j.id = job_id
                 and (j.owner_id = auth.uid() or (is_staff() and j.org_id = app_org()))));
create policy jobstep_staff_write on job_steps for all
  using (exists (select 1 from jobs j where j.id = job_id and is_staff() and j.org_id = app_org()))
  with check (exists (select 1 from jobs j where j.id = job_id and is_staff() and j.org_id = app_org()));

-- ------------------------------------------------- money (read-scoped) --
-- Owners see their own job's charges/payouts/approvals (for receipts + proof);
-- staff/admin see the org's.
create policy charge_read on charges for select
  using (exists (select 1 from jobs j where j.id = job_id
                 and (j.owner_id = auth.uid() or (is_staff() and j.org_id = app_org()))));
create policy payout_read on payouts for select
  using (exists (select 1 from jobs j where j.id = job_id and is_staff() and j.org_id = app_org()));
create policy approval_read on approvals for select
  using (exists (select 1 from jobs j where j.id = job_id
                 and (j.owner_id = auth.uid() or (is_staff() and j.org_id = app_org()))));
create policy dispute_owner on disputes for all
  using (owner_id = auth.uid() or (is_staff() and exists (select 1 from jobs j where j.id = job_id and j.org_id = app_org())))
  with check (owner_id = auth.uid());

-- --------------------------------------------- pricing rules (admin only) --
create policy pricing_rule_admin on pricing_rules for all
  using (is_admin() and org_id = app_org())
  with check (is_admin() and org_id = app_org());

-- --------------------------------------------------- supplies/maintenance --
create policy supply_scoped on supply_items for all
  using (exists (select 1 from properties pr where pr.id = property_id
                 and (pr.owner_id = auth.uid() or (is_staff() and pr.org_id = app_org()))))
  with check (exists (select 1 from properties pr where pr.id = property_id
                 and (pr.owner_id = auth.uid() or (is_staff() and pr.org_id = app_org()))));
create policy reorder_scoped on reorders for all
  using (exists (select 1 from properties pr where pr.id = property_id
                 and (pr.owner_id = auth.uid() or (is_staff() and pr.org_id = app_org()))))
  with check (exists (select 1 from properties pr where pr.id = property_id
                 and (pr.owner_id = auth.uid() or (is_staff() and pr.org_id = app_org()))));
create policy maint_scoped on maintenance_issues for all
  using (exists (select 1 from properties pr where pr.id = property_id
                 and (pr.owner_id = auth.uid() or (is_staff() and pr.org_id = app_org()))))
  with check (exists (select 1 from properties pr where pr.id = property_id
                 and (pr.owner_id = auth.uid() or (is_staff() and pr.org_id = app_org()))));

-- ----------------------------------------------------- reports/messages --
create policy report_read on reports for select
  using (owner_id = auth.uid() or (is_staff() and exists (select 1 from jobs j where j.id = job_id and j.org_id = app_org())));
create policy message_scoped on messages for all
  using (org_id = app_org() and (is_staff() or owner_id = auth.uid()))
  with check (org_id = app_org() and (sender_id = auth.uid()));

-- ----------------------------------------------------- invites/leads --
create policy invite_admin on invites for all
  using (is_staff() and org_id = app_org())
  with check (is_staff() and org_id = app_org());
create policy lead_staff on leads for all
  using (is_staff() and org_id = app_org())
  with check (is_staff() and org_id = app_org());


-- ============================================================
-- 0003_photos.sql
-- ============================================================
-- Photo privacy — a brand requirement, not just technical (CODE-UPDATE §8, spec §11).
-- Proof photos (including the Kee Method 'before' documentation shots) are PRIVATE
-- to the servicing Org and that property's owner: never publicly linkable, never
-- shown in marketing, never reused as portfolio content. A future portfolio
-- feature requires an explicit per-photo marketing_consent grant by the owner,
-- defaulting to FALSE. Serve only via signed, expiring URLs (these show the
-- inside of people's homes). Ahleyia's standing policy: no 'before' photo is ever
-- published.

create type photo_kind as enum ('before', 'staging', 'after', 'maintenance', 'receipt', 'portfolio');

create table photos (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations(id) on delete cascade,
  property_id      uuid references properties(id) on delete cascade,
  owner_id         uuid references users(id) on delete set null,
  job_id           uuid references jobs(id) on delete cascade,
  step_id          uuid references steps(id) on delete set null,
  storage_key      text not null,        -- object key; served as a signed, expiring URL
  kind             photo_kind not null,
  captured_at      timestamptz,
  captured_lat     double precision,
  captured_lng     double precision,
  -- No photo may surface in any marketing context without an explicit per-photo
  -- grant by the owner. Defaults FALSE and stays FALSE for every proof photo.
  marketing_consent boolean not null default false,
  created_at       timestamptz not null default now()
);
create index on photos(job_id);
create index on photos(property_id);

alter table photos enable row level security;

-- Private to the property's owner and the org's staff/admin. There is NO public
-- or cross-owner policy, so a photo is never reachable by anyone else.
create policy photo_scoped on photos for all
  using (owner_id = auth.uid() or (is_staff() and org_id = app_org()))
  with check (owner_id = auth.uid() or (is_staff() and org_id = app_org()));

-- Belt-and-braces: a 'before' photo can never carry marketing consent.
alter table photos add constraint before_never_marketing
  check (not (kind = 'before' and marketing_consent = true));


-- ============================================================
-- 0004_concierge.sql
-- ============================================================
-- Concierge tier + full service catalogue (CODE-UPDATE §5–6, spec §4C).
-- Concierge is time-based, openly $70/hr, purchases reimbursed at cost (no
-- markup), receipt photo REQUIRED (enforced here, not just in the UI), captured
-- when the visit CLOSES. The sum of a job's non-tip line items IS the capture
-- amount — we never store a separate total that can drift from its lines.

-- Extend job types beyond cleaning (idempotent).
alter type job_type add value if not exists 'concierge';
alter type job_type add value if not exists 'co_hosting';
alter type job_type add value if not exists 'store_run';
alter type job_type add value if not exists 'delivery_receipt';
alter type job_type add value if not exists 'coaching';
alter type job_type add value if not exists 'reset_organization';
alter type job_type add value if not exists 'move_out';
alter type job_type add value if not exists 'window_cleaning';
alter type job_type add value if not exists 'laundry_service';
alter type job_type add value if not exists 'commercial';

create type line_item_kind   as enum ('service', 'add_on', 'concierge_time', 'reimbursable', 'tip');
create type concierge_status as enum ('pending_confirm', 'time_suggested', 'confirmed', 'declined');
create type added_by         as enum ('cleaner', 'owner');

-- Job line items — the composition of a job's single charge.
create table job_line_items (
  id                 uuid primary key default gen_random_uuid(),
  job_id             uuid not null references jobs(id) on delete cascade,
  kind               line_item_kind not null,
  label              text not null,
  amount             numeric not null,
  quantity_or_minutes numeric,
  receipt_photo_id   uuid references photos(id) on delete set null,
  taxable            boolean not null default true,
  -- concierge_time may be added by the cleaner or (as a live extension) the
  -- owner, so the final number's composition is auditable.
  added_by           added_by,
  created_at         timestamptz not null default now(),
  -- A reimbursable with no receipt photo cannot exist. The photo is the owner's
  -- proof and the cleaner's protection. Enforced at the database.
  constraint reimbursable_needs_receipt
    check (kind <> 'reimbursable' or receipt_photo_id is not null)
);
create index on job_line_items(job_id);

-- Concierge request → she confirms. estimated_minutes is a PLAN, never a quote;
-- do not derive a total from it (that would make concierge fixed-price).
create table concierge_requests (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations(id) on delete cascade,
  property_id      uuid references properties(id) on delete set null,
  owner_id         uuid not null references users(id) on delete cascade,
  services         jsonb not null default '[]',
  preferred_window text,
  note             text,                    -- "the Vietnamese coffee from Buford Highway"
  status           concierge_status not null default 'pending_confirm',
  suggested_window text,
  suggested_note   text,
  decline_reason   text,
  estimated_minutes int,                    -- a plan, NOT a quote
  answered_by      uuid references users(id) on delete set null,
  answered_at      timestamptz,
  confirmed_job_id uuid references jobs(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index on concierge_requests(owner_id);

-- Goods-in-storage — distinct from per-unit par-level supplies. Product
-- Receiving & Delivery: received on the client's behalf, stored, delivered later.
create table stored_goods (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  property_id  uuid references properties(id) on delete set null,
  owner_id     uuid not null references users(id) on delete cascade,
  label        text not null,
  kind         text,                        -- linens | toiletries | décor | other
  received_at  timestamptz,
  delivered_at timestamptz,
  status       text not null default 'stored', -- stored | delivered
  created_at   timestamptz not null default now()
);
create index on stored_goods(owner_id);

-- ---------------------------------------------------------------- RLS --
alter table job_line_items    enable row level security;
alter table concierge_requests enable row level security;
alter table stored_goods      enable row level security;

-- Owner sees their own job's lines (for the itemized receipt); staff/admin org.
create policy line_item_read on job_line_items for select
  using (exists (select 1 from jobs j where j.id = job_id
                 and (j.owner_id = auth.uid() or (is_staff() and j.org_id = app_org()))));
create policy line_item_staff_write on job_line_items for all
  using (exists (select 1 from jobs j where j.id = job_id and is_staff() and j.org_id = app_org()))
  with check (exists (select 1 from jobs j where j.id = job_id and is_staff() and j.org_id = app_org()));

create policy concierge_scoped on concierge_requests for all
  using (owner_id = auth.uid() or (is_staff() and org_id = app_org()))
  with check (owner_id = auth.uid() or (is_staff() and org_id = app_org()));

create policy stored_goods_scoped on stored_goods for all
  using (owner_id = auth.uid() or (is_staff() and org_id = app_org()))
  with check (owner_id = auth.uid() or (is_staff() and org_id = app_org()));


-- ============================================================
-- 0005_auth_users.sql
-- ============================================================
-- Auth ↔ app linkage. Every RLS helper (app_role, app_org, is_staff) reads the
-- public.users row for auth.uid(); without one, a freshly signed-in user has no
-- role/org and can see nothing. This trigger creates that row automatically when
-- Supabase Auth inserts into auth.users.
--
-- Self-signups (phone OTP clients) default to role 'owner' with no org — they're
-- connected to the business when Ahleyia sends an invite. Privileged accounts
-- (staff/admin) are provisioned by passing role + org_id in the signup's
-- user metadata (raw_user_meta_data), so this trigger honors those when present
-- and valid, and never lets an invalid value break signup.

create or replace function handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  meta_role text := new.raw_user_meta_data ->> 'role';
  meta_org  text := new.raw_user_meta_data ->> 'org_id';
begin
  insert into public.users (id, role, org_id, phone, email, phone_verified)
  values (
    new.id,
    case when meta_role in ('cleaner', 'owner', 'org_admin')
         then meta_role::user_role else 'owner' end,
    case when meta_org ~ '^[0-9a-fA-F-]{36}$' then meta_org::uuid else null end,
    new.phone,
    new.email,
    new.phone_confirmed_at is not null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ============================================================
-- 0006_client_invites.sql
-- ============================================================
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


-- ============================================================
-- 0007_sms_consent.sql
-- ============================================================
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


-- ============================================================
-- 0008_job_steps_phase.sql
-- ============================================================
-- The checklist a cleaner actually works from.
--
-- job_steps carried the text and the photo flag but not which PHASE a step
-- belongs to, so the app could only group steps by joining back through
-- steps -> phases on every read. The Kee Method's five phases are the shape of
-- the working day, so the phase travels with the step: one read, no joins, and
-- the checklist keeps working even if a template is later edited.

alter table job_steps add column if not exists phase_title text;
alter table job_steps add column if not exists phase_ord   int;

create index if not exists job_steps_job_idx on job_steps (job_id, phase_ord, ord);

comment on column job_steps.phase_title is
  'The Kee Method phase this step belongs to, copied in at instantiation.';


-- ============================================================
-- 0009_notifications.sql
-- ============================================================
--
-- Texting is off (it needs a provider and costs per message), so the app has to
-- carry its own notices. Two pieces:
--
--   notifications       — the durable record. Every notice is a row the person
--                         owns, so it survives a missed push, a new phone, or
--                         permission never being granted at all. The in-app
--                         list reads straight from here.
--   push_subscriptions  — the browser endpoints to push to, one per device.
--                         Web Push (VAPID) needs no provider and costs nothing;
--                         if a device never subscribes, the row above is still
--                         there when they open the app.
--
-- Notices are written by the studio side (staff, or a function acting for
-- them) and read by their recipient. Nobody can write a notification to
-- themselves to fake a message from Ahleyia, and nobody can read anyone
-- else's.

-- ---------------------------------------------------------- notifications --
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,  -- recipient
  kind       text not null,          -- on_the_way | report_ready | approval_due | booked | …
  title      text not null,
  body       text,
  -- Where tapping it should land: a route key the app understands
  -- ('report', 'schedule', 'job:<id>'). Deliberately not a URL.
  link       text,
  job_id     uuid references jobs(id) on delete set null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on notifications (user_id) where read_at is null;

alter table notifications enable row level security;

-- You read your own notices, and you can mark them read. That is all.
drop policy if exists notif_own_read on notifications;
create policy notif_own_read on notifications for select
  using (user_id = auth.uid());

drop policy if exists notif_own_update on notifications;
create policy notif_own_update on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- The studio notifies its own clients and staff. No self-insert: a client
-- cannot manufacture a notice that looks like it came from Ahleyia.
drop policy if exists notif_staff_write on notifications;
create policy notif_staff_write on notifications for insert
  with check (
    is_staff() and org_id = app_org()
    and exists (select 1 from users u where u.id = user_id and u.org_id = app_org())
  );

-- Staff can see what the studio has sent, for their own org.
drop policy if exists notif_staff_read on notifications;
create policy notif_staff_read on notifications for select
  using (is_staff() and org_id = app_org());

comment on table notifications is
  'Durable in-app notices. The record of record — push delivery is best-effort on top of this.';

-- ----------------------------------------------------- push subscriptions --
create table if not exists push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  endpoint     text not null unique,   -- the browser's push service URL
  p256dh       text not null,          -- client public key (RFC 8291)
  auth_secret  text not null,          -- client auth secret (RFC 8291)
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subs_user_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

-- A device registers itself and can remove itself. Nobody reads anyone else's
-- endpoints from the browser at all — the sender is a function with the
-- service-role key, which bypasses RLS by design.
drop policy if exists push_own_all on push_subscriptions;
create policy push_own_all on push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on column push_subscriptions.auth_secret is
  'RFC 8291 auth secret. Useless without the server VAPID private key, which never leaves the functions.';

-- ------------------------------------------------------------- what to send --
-- Which notices this person wants. Absent keys mean "yes" — a new kind of
-- notice reaches people instead of being silently withheld until they find a
-- toggle. Turning something off writes false.
alter table users add column if not exists notify_prefs jsonb not null default '{}'::jsonb;

comment on column users.notify_prefs is
  'Per-kind notification opt-outs, e.g. {"supplies": false}. Missing key = send it.';


-- ---------- seed.sql (organization + The Kee Method™) ----------
-- Seed: the organization, The Kee Method™ (as data), and pricing rules.
-- The Vacation Rental Edition is the 26 steps in 5 phases, VERBATIM. The 4
-- photo steps ARE the proof system.

insert into organizations (id, name, contact_phone, contact_email, domain)
values ('00000000-0000-0000-0000-0000000000a1', 'She''s Maid In ATL',
        '404.259.3242', 'ahleyia@atlluxurycleaning.com', 'atlluxurycleaning.com')
on conflict (id) do nothing;

insert into methods (id, org_id, name, trademarked)
values ('00000000-0000-0000-0000-0000000000b1',
        '00000000-0000-0000-0000-0000000000a1', 'The Kee Method™', true)
on conflict (id) do nothing;

insert into editions (id, method_id, type, name, step_count) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'vacation_rental', 'Vacation Rental Edition', 26),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', 'luxury_home',     'Luxury Home Edition',     31)
on conflict (id) do nothing;

-- Phases (Vacation Rental Edition)
insert into phases (id, edition_id, ord, title) values
  ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000c1',1,'PRE-CLEAN WALKTHROUGH'),
  ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000c1',2,'LAUNDRY PROCESS'),
  ('00000000-0000-0000-0000-0000000000d3','00000000-0000-0000-0000-0000000000c1',3,'CLEANING ORDER'),
  ('00000000-0000-0000-0000-0000000000d4','00000000-0000-0000-0000-0000000000c1',4,'RESTOCKING & INVENTORY'),
  ('00000000-0000-0000-0000-0000000000d5','00000000-0000-0000-0000-0000000000c1',5,'FINAL WALKTHROUGH & HOST')
on conflict (id) do nothing;

-- Steps — verbatim; photo_required marks the 4 proof moments.
insert into steps (phase_id, ord, text, photo_required) values
  -- 1 PRE-CLEAN WALKTHROUGH (6)
  ('00000000-0000-0000-0000-0000000000d1',1,'Notify host upon arrival',false),
  ('00000000-0000-0000-0000-0000000000d1',2,'Check under beds, in drawers, couches & closets for left-behind items',false),
  ('00000000-0000-0000-0000-0000000000d1',3,'Check inside fridge, oven & microwave for food items',false),
  ('00000000-0000-0000-0000-0000000000d1',4,'Inspect overall property condition & cleanliness level',false),
  ('00000000-0000-0000-0000-0000000000d1',5,'Report missing or damaged items to host immediately',false),
  ('00000000-0000-0000-0000-0000000000d1',6,'Take ''before'' photos for documentation',true),
  -- 2 LAUNDRY PROCESS (5)
  ('00000000-0000-0000-0000-0000000000d2',1,'Strip all beds & begin first laundry load',false),
  ('00000000-0000-0000-0000-0000000000d2',2,'Sort into three loads: sheets / pillowcases+duvets / towels',false),
  ('00000000-0000-0000-0000-0000000000d2',3,'Start the wash BEFORE beginning cleaning tasks',false),
  ('00000000-0000-0000-0000-0000000000d2',4,'Steam sheets & pillowcases for a crisp finish',false),
  ('00000000-0000-0000-0000-0000000000d2',5,'Fold & stage towels to Airbnb presentation standard',false),
  -- 3 CLEANING ORDER (7)
  ('00000000-0000-0000-0000-0000000000d3',1,'Bathrooms FIRST — toilets, tubs, sinks, mirrors, fixtures',false),
  ('00000000-0000-0000-0000-0000000000d3',2,'Sanitize high-touch surfaces',false),
  ('00000000-0000-0000-0000-0000000000d3',3,'Dust high & low; clean bedrooms incl. nightstands & under beds',false),
  ('00000000-0000-0000-0000-0000000000d3',4,'Make beds with fresh linens, wrinkle-free',true),
  ('00000000-0000-0000-0000-0000000000d3',5,'Clean & disinfect kitchen surfaces, sink & appliances',false),
  ('00000000-0000-0000-0000-0000000000d3',6,'Wipe dining table, chairs & living-room surfaces',false),
  ('00000000-0000-0000-0000-0000000000d3',7,'Vacuum & mop floors LAST',false),
  -- 4 RESTOCKING & INVENTORY (4)
  ('00000000-0000-0000-0000-0000000000d4',1,'Refill toiletries',false),
  ('00000000-0000-0000-0000-0000000000d4',2,'Ensure clean towels, bedding & kitchen essentials stocked',false),
  ('00000000-0000-0000-0000-0000000000d4',3,'Restage unit to match listing photos',true),
  ('00000000-0000-0000-0000-0000000000d4',4,'Note missing/broken items to replace (adds to Supplies)',false),
  -- 5 FINAL WALKTHROUGH & HOST (4)
  ('00000000-0000-0000-0000-0000000000d5',1,'Final check of all rooms',false),
  ('00000000-0000-0000-0000-0000000000d5',2,'Take ''after'' photos for quality assurance',true),
  ('00000000-0000-0000-0000-0000000000d5',3,'Lock doors, turn off lights, confirm unit security',false),
  ('00000000-0000-0000-0000-0000000000d5',4,'Set thermostat to suggested degrees',false);

-- Pricing rules (admin-editable; the residential floor is HARD).
insert into pricing_rules (org_id, key, value) values
  ('00000000-0000-0000-0000-0000000000a1','rate_standard', 50),
  ('00000000-0000-0000-0000-0000000000a1','rate_deep',     65),
  ('00000000-0000-0000-0000-0000000000a1','comfort_multiplier', 1.12),
  ('00000000-0000-0000-0000-0000000000a1','assistant_pct', 40),
  ('00000000-0000-0000-0000-0000000000a1','assistant_floor', 50),
  ('00000000-0000-0000-0000-0000000000a1','eco_finish', 8),
  -- Airbnb tiers stored as floors; range ceilings in the pricing lib
  ('00000000-0000-0000-0000-0000000000a1','airbnb_studio1_min', 95),
  ('00000000-0000-0000-0000-0000000000a1','airbnb_studio1_max', 125),
  ('00000000-0000-0000-0000-0000000000a1','airbnb_br2_min', 125),
  ('00000000-0000-0000-0000-0000000000a1','airbnb_br2_max', 160),
  ('00000000-0000-0000-0000-0000000000a1','airbnb_br3_min', 160),
  ('00000000-0000-0000-0000-0000000000a1','airbnb_br3_max', 185),
  ('00000000-0000-0000-0000-0000000000a1','airbnb_br4_min', 185)
on conflict (org_id, key) do nothing;
