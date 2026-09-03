-- Fixes host_fraud_signals(): "open" never matched a real dispute.
-- Run after 0033_fraud_signals.sql.

/*
 * disputes.status holds Stripe's own status strings — needs_response,
 * under_review, won, lost, and so on. It is never literally the word "open".
 * The previous version of this function filtered `status = 'open'`, which
 * therefore matched nothing a real webhook would ever write, and the
 * multiple-open-disputes rule could never fire in production.
 *
 * Caught by testing the function against a real account before trusting it:
 * two disputes inserted with Stripe's actual status came back as
 * open_disputes: 0.
 *
 * The fix uses resolved_at instead, which the webhook already computes
 * correctly from the real status on every write — one definition of "open"
 * rather than two that can disagree.
 */
create or replace function public.host_fraud_signals(p_owner_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with sales as (
    select count(*)::int as n, coalesce(sum(amount_cents), 0)::int as total_cents
      from purchases pu
      join webinars w on w.id = pu.webinar_id
     where w.owner_id = p_owner_id
  ),
  disputed as (
    select count(*)::int as n,
           count(*) filter (where resolved_at is null)::int as open_n,
           coalesce(sum(amount_cents), 0)::int as total_cents
      from disputes
     where owner_id = p_owner_id
  )
  select jsonb_build_object(
    'sales', (select n from sales),
    'sales_amount_cents', (select total_cents from sales),
    'disputes', (select n from disputed),
    'open_disputes', (select open_n from disputed),
    'disputed_amount_cents', (select total_cents from disputed),
    'dispute_rate', case
      when (select n from sales) = 0 then 0
      else round(
        (select n from disputed)::numeric / (select n from sales)::numeric,
        4
      )
    end,
    'flagged', (
      (select open_n from disputed) >= 2
      or (
        (select n from sales) >= 5
        and (select n from disputed)::numeric / (select n from sales)::numeric > 0.01
      )
    )
  );
$$;

revoke all on function public.host_fraud_signals(uuid) from public, anon;
grant execute on function public.host_fraud_signals(uuid) to authenticated, service_role;
