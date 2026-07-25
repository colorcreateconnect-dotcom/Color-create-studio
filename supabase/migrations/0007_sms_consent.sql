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
