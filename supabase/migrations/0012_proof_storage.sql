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
-- Guarded on the storage schema existing, so this file also applies cleanly to
-- a plain Postgres database used for testing the rest of the schema.

do $$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise notice 'storage schema absent — skipping proof bucket (fine outside Supabase)';
    return;
  end if;

  -- Private bucket. `public = false` is the difference between a signed link
  -- and a permanent one anybody can pass around.
  insert into storage.buckets (id, name, public)
  values ('proof', 'proof', false)
  on conflict (id) do update set public = false;

  -- Staff of the organization named in the key's first segment. Not "any
  -- staff": a contractor uploading into another studio's folder would be
  -- putting a photo of someone else's home somewhere they can read it.
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

  -- Retaking a photo writes a new key rather than replacing one, so there is no
  -- update policy at all. The first shot is the evidence; the second must not
  -- be able to quietly stand in for it.

  -- Nobody deletes proof from the browser. If a photo has to go, that is an
  -- explicit act by someone with the service key, recorded, not a tap.
  execute $pol$
    drop policy if exists proof_no_delete on storage.objects;
  $pol$;
end
$$;
