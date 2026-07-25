-- Seed: the organization, The Kee Method™ (as data), and pricing rules.
-- The Vacation Rental Edition is the 26 steps in 5 phases, VERBATIM. The 4
-- photo steps ARE the proof system.

insert into organizations (id, name, contact_phone, contact_email, domain)
values ('00000000-0000-0000-0000-0000000000a1', 'She''s Maid In ATL',
        '404.259.3242', 'ahleyia@atlluxurycleaning.com', 'atlluxurycleaning.com')
on conflict (id) do nothing;

insert into methods (id, org_id, name, trademarked)
values ('00000000-0000-0000-0000-0000000000b1',
        '00000000-0000-0000-0000-0000000000a1', 'The Kee Method™', true)
on conflict (id) do nothing;

insert into editions (id, method_id, type, name, step_count) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'vacation_rental', 'Vacation Rental Edition', 26),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', 'luxury_home',     'Luxury Home Edition',     31)
on conflict (id) do nothing;

-- Phases (Vacation Rental Edition)
insert into phases (id, edition_id, ord, title) values
  ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000c1',1,'PRE-CLEAN WALKTHROUGH'),
  ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000c1',2,'LAUNDRY PROCESS'),
  ('00000000-0000-0000-0000-0000000000d3','00000000-0000-0000-0000-0000000000c1',3,'CLEANING ORDER'),
  ('00000000-0000-0000-0000-0000000000d4','00000000-0000-0000-0000-0000000000c1',4,'RESTOCKING & INVENTORY'),
  ('00000000-0000-0000-0000-0000000000d5','00000000-0000-0000-0000-0000000000c1',5,'FINAL WALKTHROUGH & HOST')
on conflict (id) do nothing;

-- Steps — verbatim; photo_required marks the 4 proof moments.
insert into steps (phase_id, ord, text, photo_required) values
  -- 1 PRE-CLEAN WALKTHROUGH (6)
  ('00000000-0000-0000-0000-0000000000d1',1,'Notify host upon arrival',false),
  ('00000000-0000-0000-0000-0000000000d1',2,'Check under beds, in drawers, couches & closets for left-behind items',false),
  ('00000000-0000-0000-0000-0000000000d1',3,'Check inside fridge, oven & microwave for food items',false),
  ('00000000-0000-0000-0000-0000000000d1',4,'Inspect overall property condition & cleanliness level',false),
  ('00000000-0000-0000-0000-0000000000d1',5,'Report missing or damaged items to host immediately',false),
  ('00000000-0000-0000-0000-0000000000d1',6,'Take ''before'' photos for documentation',true),
  -- 2 LAUNDRY PROCESS (5)
  ('00000000-0000-0000-0000-0000000000d2',1,'Strip all beds & begin first laundry load',false),
  ('00000000-0000-0000-0000-0000000000d2',2,'Sort into three loads: sheets / pillowcases+duvets / towels',false),
  ('00000000-0000-0000-0000-0000000000d2',3,'Start the wash BEFORE beginning cleaning tasks',false),
  ('00000000-0000-0000-0000-0000000000d2',4,'Steam sheets & pillowcases for a crisp finish',false),
  ('00000000-0000-0000-0000-0000000000d2',5,'Fold & stage towels to Airbnb presentation standard',false),
  -- 3 CLEANING ORDER (7)
  ('00000000-0000-0000-0000-0000000000d3',1,'Bathrooms FIRST — toilets, tubs, sinks, mirrors, fixtures',false),
  ('00000000-0000-0000-0000-0000000000d3',2,'Sanitize high-touch surfaces',false),
  ('00000000-0000-0000-0000-0000000000d3',3,'Dust high & low; clean bedrooms incl. nightstands & under beds',false),
  ('00000000-0000-0000-0000-0000000000d3',4,'Make beds with fresh linens, wrinkle-free',true),
  ('00000000-0000-0000-0000-0000000000d3',5,'Clean & disinfect kitchen surfaces, sink & appliances',false),
  ('00000000-0000-0000-0000-0000000000d3',6,'Wipe dining table, chairs & living-room surfaces',false),
  ('00000000-0000-0000-0000-0000000000d3',7,'Vacuum & mop floors LAST',false),
  -- 4 RESTOCKING & INVENTORY (4)
  ('00000000-0000-0000-0000-0000000000d4',1,'Refill toiletries',false),
  ('00000000-0000-0000-0000-0000000000d4',2,'Ensure clean towels, bedding & kitchen essentials stocked',false),
  ('00000000-0000-0000-0000-0000000000d4',3,'Restage unit to match listing photos',true),
  ('00000000-0000-0000-0000-0000000000d4',4,'Note missing/broken items to replace (adds to Supplies)',false),
  -- 5 FINAL WALKTHROUGH & HOST (4)
  ('00000000-0000-0000-0000-0000000000d5',1,'Final check of all rooms',false),
  ('00000000-0000-0000-0000-0000000000d5',2,'Take ''after'' photos for quality assurance',true),
  ('00000000-0000-0000-0000-0000000000d5',3,'Lock doors, turn off lights, confirm unit security',false),
  ('00000000-0000-0000-0000-0000000000d5',4,'Set thermostat to suggested degrees',false);

-- Pricing rules (admin-editable; the residential floor is HARD).
insert into pricing_rules (org_id, key, value) values
  ('00000000-0000-0000-0000-0000000000a1','rate_standard', 50),
  ('00000000-0000-0000-0000-0000000000a1','rate_deep',     65),
  ('00000000-0000-0000-0000-0000000000a1','comfort_multiplier', 1.12),
  ('00000000-0000-0000-0000-0000000000a1','assistant_pct', 40),
  ('00000000-0000-0000-0000-0000000000a1','assistant_floor', 50),
  ('00000000-0000-0000-0000-0000000000a1','eco_finish', 8),
  -- Airbnb tiers stored as floors; range ceilings in the pricing lib
  ('00000000-0000-0000-0000-0000000000a1','airbnb_studio1_min', 95),
  ('00000000-0000-0000-0000-0000000000a1','airbnb_studio1_max', 125),
  ('00000000-0000-0000-0000-0000000000a1','airbnb_br2_min', 125),
  ('00000000-0000-0000-0000-0000000000a1','airbnb_br2_max', 160),
  ('00000000-0000-0000-0000-0000000000a1','airbnb_br3_min', 160),
  ('00000000-0000-0000-0000-0000000000a1','airbnb_br3_max', 185),
  ('00000000-0000-0000-0000-0000000000a1','airbnb_br4_min', 185)
on conflict (org_id, key) do nothing;
