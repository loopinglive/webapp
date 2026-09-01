-- Loopinglive — the room's offer button.
--
-- Phase 1 scope only: one live offer per webinar, dropped at a video offset,
-- with click tracking into registrants.clicked_offer (a column 0001 already
-- reserved). The sales-page builder, order bumps, payment plans and multiple
-- offers per webinar are Phase 3/7.

create table if not exists webinar_offers (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  button_text text not null,
  button_color text default '#6C47FF',
  url text not null,
  open_in text default 'new_tab', -- 'new_tab' | 'modal'
  video_offset_seconds integer not null,
  countdown_seconds integer,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists webinar_offers_webinar_idx
  on webinar_offers (webinar_id, video_offset_seconds);

alter table webinar_offers enable row level security;

-- Viewers need to read it — it is the thing they are meant to click.
drop policy if exists "offers are public" on webinar_offers;
create policy "offers are public" on webinar_offers
  for select using (is_active);
