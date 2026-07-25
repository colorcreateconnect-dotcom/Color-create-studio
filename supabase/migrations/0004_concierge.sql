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
