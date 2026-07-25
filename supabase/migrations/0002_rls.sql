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
