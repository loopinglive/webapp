-- Two-factor for admin accounts.
-- Run after 0029_trust_safety.sql.

/*
 * The console can refund money and impersonate customers.
 *
 * It has been behind a password alone. Every other control added in this pass
 * — roles, audit entries, a reason required before impersonating — assumes the
 * person signing in is who they say they are, and nothing was checking that
 * beyond one reusable secret.
 *
 * Only admins. Making customers do this would be a product decision with a
 * conversion cost attached, and it is not the risk being addressed here.
 */
alter table user_accounts
  add column if not exists totp_secret text,
  add column if not exists totp_enabled_at timestamptz,
  /*
   * Hashed, not stored.
   *
   * A recovery code is a password that bypasses the second factor. Keeping
   * them readable would mean anyone with database access could walk past 2FA
   * for every admin at once, which is most of what 2FA was protecting against.
   */
  add column if not exists totp_recovery_hashes text[],
  /*
   * The last accepted step.
   *
   * A code is valid for a 90-second window, so without this a code read off a
   * screen or over a shoulder can be replayed for the rest of that window.
   * Storing the step makes each code single-use.
   */
  add column if not exists totp_last_step bigint;

/*
 * Which admins have it on, for a screen that can chase the ones who do not.
 * Deliberately returns no secrets.
 */
create or replace function public.admin_2fa_status()
returns table (
  id uuid,
  email text,
  full_name text,
  admin_role text,
  enabled boolean,
  enabled_at timestamptz,
  recovery_codes_left integer
)
language sql
stable
security definer
set search_path = public
as $$
  select ua.id,
         ua.email,
         ua.full_name,
         ua.admin_role,
         ua.totp_enabled_at is not null,
         ua.totp_enabled_at,
         coalesce(array_length(ua.totp_recovery_hashes, 1), 0)
    from user_accounts ua
   where ua.is_admin
   order by ua.totp_enabled_at nulls first, ua.created_at;
$$;

revoke all on function public.admin_2fa_status() from public, anon, authenticated;
grant execute on function public.admin_2fa_status() to service_role;
