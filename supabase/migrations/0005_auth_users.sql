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
