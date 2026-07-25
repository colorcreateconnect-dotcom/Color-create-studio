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
