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


-- ---------- 0009_notifications.sql ----------
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


-- ============================================================
-- 0011_signup_cannot_pick_a_role.sql
-- ============================================================
-- Signing up does not get to say what you are.
--
-- 0005 read `role` and `org_id` out of raw_user_meta_data and honored them. That
-- metadata is written by whoever calls the signup endpoint, and the signup
-- endpoint is public — the publishable key ships in the browser. Any client of
-- the studio can read their own org_id, so a second signup passing
--
--   { "role": "org_admin", "org_id": "<that uuid>" }
--
-- would land them inside the business: every client's home, access notes and
-- internal pricing. The trigger had no way to tell that call apart from a
-- legitimate one, because there is nothing in metadata a stranger cannot also
-- write (`provisioned_by_studio: true` included).
--
-- So the trigger stops reading it. Everyone who signs up is an `owner` with no
-- org — a client, connected to nothing. Role and org are set afterwards by the
-- functions that hold the service-role key and have already authorized the
-- caller: create-staff (Ahleyia hires a cleaner), create-client (staff file an
-- existing client) and become-contractor (someone starts their own studio).
-- Those write the users row directly, so nothing that legitimately provisions
-- an account depended on the metadata path.
--
-- `full_name` is still read from metadata. A person naming themselves is not a
-- privilege, and without it a self-signup has no name to greet.

create or replace function handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  meta_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
begin
  -- role and org_id are deliberately NOT taken from raw_user_meta_data.
  insert into public.users (id, role, org_id, full_name, phone, email, phone_verified)
  values (
    new.id,
    'owner',
    null,
    meta_name,
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
-- 0012_proof_storage.sql
-- ============================================================
-- Where proof photos actually live.
--
-- The `photos` table (0003) records that a photo exists and who it belongs to.
-- The file itself goes in Supabase Storage, and the same promise has to hold
-- there: these are pictures of the inside of people's homes, so the bucket is
-- private, nothing in it is reachable by URL alone, and reads happen through
-- short-lived signed links issued by a function that has checked who is asking.
--
-- Object keys are `<org_id>/<job_id>/<step_id>-<nonce>.<ext>`. The organization
-- comes first on purpose: the policies below read that first segment, so the
-- key is what scopes one studio's photos away from another's. src/lib/photo.ts
-- is the only thing that builds a key, and it refuses anything but a uuid in
-- those positions.
--
-- EVERY STEP HERE IS NON-FATAL, and that is the important part of this file.
-- In a Supabase project `storage.objects` is owned by `supabase_storage_admin`,
-- so `create policy` on it can fail with "must be owner of table objects"
-- depending on the role running the script. The SQL editor runs a whole script
-- as ONE transaction, so an error here would roll back every migration before
-- it — which is exactly what happened the first time this shipped. Each step
-- now sits in its own exception block; a plpgsql handler is a subtransaction,
-- so a failure is contained, reported as a notice, and the rest of the upgrade
-- still lands. Anything skipped can be done from the dashboard in a minute:
--   Storage → New bucket → name `proof`, Public OFF.
-- The app does not depend on the policies below for its guarantees. Uploads are
-- scoped by them, but reads are signed server-side by netlify/functions/
-- photo-url.ts, which checks the caller itself and uses the service key.

do $$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise notice 'storage schema absent — skipping proof bucket (fine outside Supabase)';
    return;
  end if;

  -- Private bucket. `public = false` is the difference between a signed link
  -- and a permanent one anybody can pass around.
  begin
    insert into storage.buckets (id, name, public)
    values ('proof', 'proof', false)
    on conflict (id) do update set public = false;
  exception when others then
    raise notice 'could not create the `proof` bucket (%). Create it in the dashboard: Storage → New bucket → name proof, Public OFF.', sqlerrm;
  end;

  -- Staff of the organization named in the key's first segment. Not "any
  -- staff": a contractor uploading into another studio's folder would be
  -- putting a photo of someone else's home somewhere they can read it.
  begin
    execute $pol$
      drop policy if exists proof_staff_insert on storage.objects;
      create policy proof_staff_insert on storage.objects for insert
        to authenticated
        with check (
          bucket_id = 'proof'
          and is_staff()
          and (storage.foldername(name))[1] = app_org()::text
        );
    $pol$;
  exception when others then
    raise notice 'could not create policy proof_staff_insert (%). Add it under Storage → Policies, or run this file as the storage owner.', sqlerrm;
  end;

  begin
    execute $pol$
      drop policy if exists proof_staff_read on storage.objects;
      create policy proof_staff_read on storage.objects for select
        to authenticated
        using (
          bucket_id = 'proof'
          and is_staff()
          and (storage.foldername(name))[1] = app_org()::text
        );
    $pol$;
  exception when others then
    raise notice 'could not create policy proof_staff_read (%). Reads still work — photo-url.ts signs them server-side.', sqlerrm;
  end;

  -- Retaking a photo writes a new key rather than replacing one, so there is no
  -- update policy at all. The first shot is the evidence; the second must not
  -- be able to quietly stand in for it.
  --
  -- Nobody deletes proof from the browser either. If a photo has to go, that is
  -- an explicit act by someone with the service key, recorded, not a tap.
  begin
    execute $pol$ drop policy if exists proof_no_delete on storage.objects; $pol$;
  exception when others then
    null;  -- nothing to drop, or not ours to drop; either way there is no delete policy
  end;
end
$$;
