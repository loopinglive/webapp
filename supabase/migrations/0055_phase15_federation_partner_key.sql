-- Federation is bidirectional, but 0051 only gave each partnership one
-- credential: api_key_hash, which is the key WE issue for a partner to call
-- US with (hash only — the plaintext is shown once and never stored).
--
-- Calling the partner needs the credential THEY issued us, which has nowhere
-- to live in that shape. It is stored here encrypted at rest with the same
-- AES-256-GCM helper used for SMTP passwords and Cele.bio tokens, never in
-- plaintext.
--
-- Run after 0054_phase15_nurture_cron.sql.

alter table platform_federation add column if not exists partner_api_key_encrypted text;
alter table platform_federation add column if not exists last_verified_at timestamptz;

create index if not exists platform_federation_owner_idx on platform_federation (owner_user_id);
create index if not exists platform_federation_key_idx on platform_federation (api_key_hash);
