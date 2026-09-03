-- Order bumps.
-- Run after 0030_admin_2fa.sql.

/*
 * The single highest-return addition in any checkout, and there is nowhere to
 * add one. A host with a companion product, a fast-action bonus, or a
 * higher-tier variant has no way to offer it at the one moment someone has
 * already said yes.
 *
 * One bump per offer, not a list. A checkout with three add-ons stops reading
 * as a decision already made and starts reading as a decision to reconsider —
 * which is the opposite of what a bump is for.
 */
create table if not exists webinar_offer_bumps (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references webinar_offers(id) on delete cascade,
  title text not null,
  description text,
  price_cents integer not null check (price_cents > 0),
  currency text not null default 'USD',
  is_active boolean not null default true,
  created_at timestamptz default now(),

  /* One bump per offer. A second row would need its own selection UI in the
     checkout, which is exactly the complexity a bump exists to avoid. */
  unique (offer_id)
);

alter table webinar_offer_bumps enable row level security;
/* Service role only, same as webinar_offers. */

/*
 * What a purchase's bump carries.
 *
 * Not a second row in `purchases`: that table is unique on
 * (registrant_id, offer_id), which is what stops a re-marked purchase from
 * doubling revenue, and a second row for the bump under the same offer_id
 * would collide with it. So the bump rides on the same purchase row instead —
 * one Stripe Checkout, one purchase, with the bump's contribution broken out.
 */
alter table purchases
  add column if not exists bump_id uuid references webinar_offer_bumps(id) on delete set null,
  add column if not exists bump_amount_cents integer;

create index if not exists purchases_bump_idx on purchases (bump_id) where bump_id is not null;
