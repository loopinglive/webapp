-- Offer experiments.
-- Run after 0018_engine_hardening.sql.

/*
 * Split testing on the offer.
 *
 * This product is bought by people who optimise for a living, and there was no
 * way to learn what works — one offer, one reveal time, no comparison.
 *
 * A variant is a partial override of the active offer rather than a second
 * offer row: almost every test changes one thing (the price, the headline,
 * when it appears), and copying the whole offer to change a word invites the
 * two to drift apart.
 */
create table if not exists offer_variants (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  offer_id uuid references webinar_offers(id) on delete cascade,
  name text not null,
  -- Only the fields under test are set; null means "inherit".
  offer_title text,
  button_text text,
  price_cents integer,
  trigger_video_offset_seconds integer,
  /** Relative share. Two variants at 50 each is an even split. */
  weight integer not null default 50,
  is_control boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists offer_variants_webinar_idx
  on offer_variants(webinar_id) where is_active;

/*
 * Which variant a registrant saw.
 *
 * Assigned once and never re-rolled: someone who returns to a replay must see
 * the same price they were shown the first time, or the experiment is
 * measuring confusion rather than preference.
 */
create table if not exists offer_assignments (
  registrant_id uuid references registrants(id) on delete cascade,
  webinar_id uuid references webinars(id) on delete cascade,
  variant_id uuid references offer_variants(id) on delete cascade,
  assigned_at timestamptz default now(),
  primary key (registrant_id, webinar_id)
);

create index if not exists offer_assignments_variant_idx
  on offer_assignments(variant_id);

alter table offer_variants enable row level security;
alter table offer_assignments enable row level security;

-- The variant a viewer is shown has to be readable by that viewer.
drop policy if exists "active variants are readable" on offer_variants;
create policy "active variants are readable" on offer_variants
  for select to anon, authenticated using (is_active);

/*
 * Results per variant.
 *
 * Computed rather than stored, so it cannot drift from the ledger it is
 * derived from. Conversion is against people who were *assigned* the variant,
 * not against everyone who registered — otherwise a variant that appears late
 * in the video looks worse simply for having been seen by fewer people.
 */
create or replace function public.offer_experiment_results(p_webinar_id uuid)
returns table (
  variant_id uuid,
  name text,
  is_control boolean,
  assigned integer,
  clicked integer,
  bought integer,
  revenue_cents bigint,
  conversion numeric
)
language sql
security definer
set search_path = public
as $$
  select
    v.id,
    v.name,
    v.is_control,
    count(distinct a.registrant_id)::int as assigned,
    count(distinct r.id) filter (where r.clicked_offer)::int as clicked,
    count(distinct p.registrant_id)::int as bought,
    coalesce(sum(p.amount_cents), 0)::bigint as revenue_cents,
    case
      when count(distinct a.registrant_id) = 0 then 0
      else round(
        (count(distinct p.registrant_id)::numeric
          / count(distinct a.registrant_id)) * 100,
        2
      )
    end as conversion
  from offer_variants v
  left join offer_assignments a on a.variant_id = v.id
  left join registrants r on r.id = a.registrant_id
  left join purchases p on p.registrant_id = a.registrant_id
                       and p.webinar_id = v.webinar_id
  where v.webinar_id = p_webinar_id
  group by v.id, v.name, v.is_control
  order by v.is_control desc, v.created_at;
$$;

revoke all on function public.offer_experiment_results(uuid) from public, anon;
grant execute on function public.offer_experiment_results(uuid)
  to authenticated, service_role;
