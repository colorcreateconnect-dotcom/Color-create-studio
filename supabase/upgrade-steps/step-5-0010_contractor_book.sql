-- One step of the upgrade. Run these files IN ORDER, one at a time.
-- Each is safe to run more than once, and a failure in one leaves the
-- earlier ones in place — which is the whole point of splitting them:
-- the SQL editor runs a script as a single transaction, so one error in a
-- combined file silently reverts everything before it.
-- ============================================================
-- ---------- 0010_contractor_book.sql ----------
--
-- Until now every row in an organization belonged to the organization, and any
-- staff member could read all of it. That is right for a studio with employees
-- and wrong for contractors: a cleaner's client list is their livelihood, and
-- it is not Ahleyia's to read, nor another contractor's.
--
-- So ownership becomes explicit. `managed_by` says whose book a client or a
-- home is in:
--
--   managed_by IS NULL          the studio's own — Ahleyia's book
--   managed_by = <a cleaner>    that contractor's own book
--
-- and the policies below let a contractor see their own book plus the work the
-- studio has actually given them, and nothing else. The org admin still sees
-- the whole organization, because she runs it.
--
-- Existing rows keep managed_by = NULL, so everything already in the database
-- stays the studio's and nothing moves.

-- ------------------------------------------------------------ ownership --
alter table users      add column if not exists managed_by uuid references users(id) on delete set null;
alter table properties add column if not exists managed_by uuid references users(id) on delete set null;
-- Who put this clean on the calendar. Distinct from cleaner_id: a contractor
-- can book their own client's home and also be assigned one of the studio's.
alter table jobs       add column if not exists created_by uuid references users(id) on delete set null;

create index if not exists users_managed_by_idx      on users (managed_by)      where managed_by is not null;
create index if not exists properties_managed_by_idx on properties (managed_by) where managed_by is not null;
create index if not exists jobs_created_by_idx       on jobs (created_by)       where created_by is not null;

comment on column users.managed_by is
  'For a client: which contractor''s book they are in. NULL = the studio''s own client.';
comment on column properties.managed_by is
  'Which contractor''s book this home is in. NULL = the studio''s own.';
comment on column jobs.created_by is
  'Who booked it. A contractor booking their own client, or the studio scheduling one of theirs.';

-- ------------------------------------------------------- time off --
-- Availability is mostly derived: a clean you are booked on makes that window
-- unavailable, and nobody needs to type that in twice. This table is for the
-- other half — the hours you are simply not working, with no job behind them.
create table if not exists availability_blocks (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  cleaner_id uuid not null references users(id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text,                      -- 'Time off', 'Another job', free text
  created_at timestamptz not null default now(),
  constraint availability_block_ends_after_start check (ends_at > starts_at)
);

create index if not exists availability_cleaner_idx on availability_blocks (cleaner_id, starts_at);

alter table availability_blocks enable row level security;

-- Your own calendar is yours to write. The studio's admin can see when her
-- contractors are unavailable — she has to, to schedule — but cannot invent
-- time off on someone else's behalf.
drop policy if exists avail_own_all on availability_blocks;
create policy avail_own_all on availability_blocks for all
  using (cleaner_id = auth.uid())
  with check (cleaner_id = auth.uid() and org_id = app_org());

drop policy if exists avail_admin_read on availability_blocks;
create policy avail_admin_read on availability_blocks for select
  using (is_admin() and org_id = app_org());

comment on table availability_blocks is
  'Hours a contractor is not working, with no job behind them. Jobs already imply their own busy windows.';

-- ------------------------------------------------------ tightened RLS --
-- Everything below REPLACES a policy that said "any staff, same org". The org
-- admin keeps that reach. A contractor gets their own book plus the work they
-- have actually been given.

-- ---- who a contractor may see ----
-- Their own row, the people in their own book, and the client whose home they
-- have been assigned to clean. Not the rest of the studio's clients, and never
-- another contractor's.
drop policy if exists user_self_read on users;
create policy user_self_read on users for select
  using (
    id = auth.uid()
    or (is_admin() and org_id = app_org())
    or (is_staff() and managed_by = auth.uid())
    or (is_staff() and exists (
          select 1 from jobs j
          where j.owner_id = users.id and j.cleaner_id = auth.uid()))
  );

-- A contractor keeps their own book up to date. They may not touch anyone
-- else's row — including promoting themselves.
drop policy if exists user_manage_own_book on users;
create policy user_manage_own_book on users for update
  using (is_staff() and managed_by = auth.uid() and org_id = app_org())
  with check (is_staff() and managed_by = auth.uid() and org_id = app_org() and role = 'owner');

-- ---- which homes a contractor may see ----
drop policy if exists prop_owner_all on properties;
drop policy if exists prop_read on properties;
create policy prop_read on properties for select
  using (
    owner_id = auth.uid()
    or (is_admin() and org_id = app_org())
    or (is_staff() and managed_by = auth.uid())
    or (is_staff() and exists (
          select 1 from jobs j
          where j.property_id = properties.id and j.cleaner_id = auth.uid()))
  );

-- The client owns their own home. A contractor may add and edit homes in their
-- own book — and the with-check pins managed_by to themselves, so adding a home
-- can never quietly file it under the studio or under someone else.
drop policy if exists prop_write on properties;
create policy prop_write on properties for insert
  with check (
    owner_id = auth.uid()
    or (is_admin() and org_id = app_org())
    or (is_staff() and managed_by = auth.uid() and org_id = app_org())
  );

drop policy if exists prop_update on properties;
create policy prop_update on properties for update
  using (
    owner_id = auth.uid()
    or (is_admin() and org_id = app_org())
    or (is_staff() and managed_by = auth.uid())
  )
  with check (
    owner_id = auth.uid()
    or (is_admin() and org_id = app_org())
    or (is_staff() and managed_by = auth.uid())
  );

-- ---- which cleans a contractor may see ----
-- Theirs to do, or theirs to have booked. The studio's other work is not their
-- business, and neither is another contractor's.
drop policy if exists job_read on jobs;
create policy job_read on jobs for select
  using (
    owner_id = auth.uid()
    or (is_admin() and org_id = app_org())
    or (is_staff() and (cleaner_id = auth.uid() or created_by = auth.uid()))
  );

drop policy if exists job_staff_write on jobs;
create policy job_staff_write on jobs for update
  using (
    (is_admin() and org_id = app_org())
    or (is_staff() and (cleaner_id = auth.uid() or created_by = auth.uid()))
  )
  with check (
    (is_admin() and org_id = app_org())
    or (is_staff() and (cleaner_id = auth.uid() or created_by = auth.uid()))
  );

-- ---- the checklist follows the job ----
drop policy if exists jobstep_read on job_steps;
create policy jobstep_read on job_steps for select
  using (exists (
    select 1 from jobs j where j.id = job_id and (
      j.owner_id = auth.uid()
      or (is_admin() and j.org_id = app_org())
      or (is_staff() and (j.cleaner_id = auth.uid() or j.created_by = auth.uid()))
    )));

drop policy if exists jobstep_staff_write on job_steps;
create policy jobstep_staff_write on job_steps for all
  using (exists (
    select 1 from jobs j where j.id = job_id and (
      (is_admin() and j.org_id = app_org())
      or (is_staff() and (j.cleaner_id = auth.uid() or j.created_by = auth.uid()))
    )))
  with check (exists (
    select 1 from jobs j where j.id = job_id and (
      (is_admin() and j.org_id = app_org())
      or (is_staff() and (j.cleaner_id = auth.uid() or j.created_by = auth.uid()))
    )));

-- ---- internal pricing stays where it was: the admin's ----
-- A contractor sets their own prices for their own clients, so the internal
-- row for a job THEY booked is theirs. The studio's numbers are not.
drop policy if exists job_internal_staff on job_pricing_internal;
create policy job_internal_staff on job_pricing_internal for all
  using (exists (
    select 1 from jobs j where j.id = job_id and (
      (is_admin() and j.org_id = app_org())
      or (is_staff() and j.created_by = auth.uid())
    )))
  with check (exists (
    select 1 from jobs j where j.id = job_id and (
      (is_admin() and j.org_id = app_org())
      or (is_staff() and j.created_by = auth.uid())
    )));

-- ---- notifications: a contractor notifies their own clients ----
-- The previous policy let any staff member write a notice to anyone in the
-- org. Narrow it to the people they actually have a relationship with.
drop policy if exists notif_staff_write on notifications;
create policy notif_staff_write on notifications for insert
  with check (
    is_staff() and org_id = app_org()
    and (
      (is_admin() and exists (select 1 from users u where u.id = user_id and u.org_id = app_org()))
      or exists (select 1 from users u where u.id = user_id and u.managed_by = auth.uid())
      or exists (select 1 from jobs j where j.owner_id = user_id and j.cleaner_id = auth.uid())
    )
  );

drop policy if exists notif_staff_read on notifications;
create policy notif_staff_read on notifications for select
  using (is_admin() and org_id = app_org());


