-- One step of the upgrade. Run these files IN ORDER, one at a time.
-- Each is safe to run more than once, and a failure in one leaves the
-- earlier ones in place — which is the whole point of splitting them:
-- the SQL editor runs a script as a single transaction, so one error in a
-- combined file silently reverts everything before it.
-- ============================================================
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
