-- One step of the upgrade. Run these files IN ORDER, one at a time.
-- Each is safe to run more than once, and a failure in one leaves the
-- earlier ones in place — which is the whole point of splitting them:
-- the SQL editor runs a script as a single transaction, so one error in a
-- combined file silently reverts everything before it.
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
