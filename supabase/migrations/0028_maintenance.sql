-- Maintenance mode.
-- Run after 0027_data_requests.sql.

/*
 * Turning the site off on purpose.
 *
 * There is currently no way to do it. A migration that has to run against a
 * live table, a payment provider outage, a bad deploy — in every case the
 * choice today is to leave the product half-working in front of customers.
 *
 * Stored in app_config so it can be toggled from the admin console rather than
 * needing a redeploy: needing a deploy to stop serving is exactly wrong when
 * the reason you are stopping is that the last deploy was bad.
 */
insert into app_config (key, value)
values
  ('maintenance_mode', 'false'),
  ('maintenance_message', 'We are carrying out planned maintenance and will be back shortly.')
on conflict (key) do nothing;

/*
 * Readable without the service key.
 *
 * app_config is service-role only and holds the cron secret, so it must stay
 * that way. This exposes exactly two values and nothing else, which is what
 * the proxy needs in order to decide whether to serve a request at all — and
 * the proxy runs with the anon key.
 */
create or replace function public.maintenance_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'enabled', coalesce(
      (select value from app_config where key = 'maintenance_mode'), 'false'
    ) = 'true',
    'message', coalesce(
      (select value from app_config where key = 'maintenance_message'),
      'We are carrying out planned maintenance and will be back shortly.'
    )
  );
$$;

revoke all on function public.maintenance_status() from public;
grant execute on function public.maintenance_status() to anon, authenticated, service_role;
