-- Phase 14: seed the three sample plugins shipped in public/plugins/.
-- Run after 0048_soc2_evidence_cron.sql.
--
-- developer_id is null — these are Loopinglive's own reference plugins, not
-- submitted by a third-party developer, so there is no user_accounts row to
-- attribute them to.

insert into plugins (name, slug, description, version, category, manifest, bundle_url, pricing_type, price, is_approved, is_active) values
(
  'Confetti Celebration',
  'confetti-celebration',
  'Fires a confetti animation when the offer button is clicked.',
  '1.0.0',
  'engagement',
  '{
    "name": "Confetti Celebration",
    "slug": "confetti-celebration",
    "version": "1.0.0",
    "description": "Fires a confetti animation when the offer button is clicked.",
    "category": "engagement",
    "permissions": ["webinar:events:read", "ui:overlay:show"],
    "hooks": [{ "event": "offer.clicked", "handler": "onOfferClicked" }],
    "settings_schema": {
      "duration": { "type": "number", "label": "Duration (seconds)", "default": 3 }
    }
  }'::jsonb,
  'https://loopinglive.com/plugins/confetti-celebration/index.html',
  'free', 0, true, true
),
(
  'Virtual Applause',
  'virtual-applause',
  'Attendees see a clapping animation when someone buys.',
  '1.0.0',
  'engagement',
  '{
    "name": "Virtual Applause",
    "slug": "virtual-applause",
    "version": "1.0.0",
    "description": "Attendees see a clapping animation when someone buys.",
    "category": "engagement",
    "permissions": ["webinar:events:read", "ui:overlay:show"],
    "hooks": [{ "event": "offer.purchased", "handler": "onPurchase" }],
    "settings_schema": {}
  }'::jsonb,
  'https://loopinglive.com/plugins/virtual-applause/index.html',
  'free', 0, true, true
),
(
  'Leaderboard',
  'leaderboard',
  'Drops a chat message celebrating attendance milestones as people join.',
  '1.0.0',
  'engagement',
  '{
    "name": "Leaderboard",
    "slug": "leaderboard",
    "version": "1.0.0",
    "description": "Drops a chat message celebrating attendance milestones as people join.",
    "category": "engagement",
    "permissions": ["webinar:events:read", "chat:messages:write"],
    "hooks": [{ "event": "registrant.joined", "handler": "onJoin" }],
    "settings_schema": {
      "announceEvery": { "type": "number", "label": "Announce every N joins", "default": 5 }
    }
  }'::jsonb,
  'https://loopinglive.com/plugins/leaderboard/index.html',
  'free', 0, true, true
)
on conflict (slug) do nothing;
