-- An IP allowlist for the super admin console.
-- Run after 0031_order_bumps.sql.

/*
 * Optional, and off until an owner turns it on.
 *
 * On by default would be how an owner locks themselves out from a coffee
 * shop and has no way back in except a database console. This is a control
 * for a platform with a stable office or VPN egress, not a default posture.
 */
create table if not exists admin_ip_allowlist (
  id uuid primary key default gen_random_uuid(),
  /*
   * A CIDR block, not just a host address — inet accepts both, and a team
   * behind one office connection wants to allow the block once rather than
   * adding every teammate's address by hand.
   */
  cidr inet not null,
  label text not null,
  created_by uuid references user_accounts(id) on delete set null,
  created_at timestamptz default now(),
  unique (cidr)
);

alter table admin_ip_allowlist enable row level security;
/* Service role only, read through the function below. */

insert into app_config (key, value)
values ('admin_ip_allowlist_enabled', 'false')
on conflict (key) do nothing;

/*
 * Whether an address may reach the console, readable with the anon key.
 *
 * The proxy runs with the anon key and needs an answer before it can decide
 * whether to let a request through, the same shape as maintenance_status().
 * When the allowlist is off, or empty, everyone is allowed — an empty list
 * is not a lockout, because that would be indistinguishable from a
 * misconfiguration that takes the console down for its own owners.
 */
create or replace function public.admin_ip_allowed(p_ip text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
  v_addr inet;
begin
  select coalesce(
    (select value from app_config where key = 'admin_ip_allowlist_enabled'),
    'false'
  ) = 'true'
  into v_enabled;

  if not v_enabled then
    return true;
  end if;

  begin
    v_addr := p_ip::inet;
  exception
    when others then
      -- An unparseable address (a proxy header gone strange) fails closed —
      -- the one case here where "cannot tell" should mean "no".
      return false;
  end;

  if not exists (select 1 from admin_ip_allowlist) then
    return true;
  end if;

  return exists (
    select 1 from admin_ip_allowlist where v_addr <<= cidr
  );
end;
$$;

revoke all on function public.admin_ip_allowed(text) from public;
grant execute on function public.admin_ip_allowed(text) to anon, authenticated, service_role;
