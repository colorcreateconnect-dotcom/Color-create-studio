-- One step of the upgrade. Run these files IN ORDER, one at a time.
-- Each is safe to run more than once, and a failure in one leaves the
-- earlier ones in place — which is the whole point of splitting them:
-- the SQL editor runs a script as a single transaction, so one error in a
-- combined file silently reverts everything before it.
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


