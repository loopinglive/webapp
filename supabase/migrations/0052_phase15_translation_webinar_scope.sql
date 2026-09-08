-- 0051 scoped translation rows only to a session (webinar_sessions.id). That
-- fits a genuinely live broadcast, but almost every webinar on this platform
-- is a pre-recorded evergreen video replayed across many scheduled sessions —
-- translating once per webinar and reusing it across every showing is the
-- useful behaviour, and there was no column to attach that to. Adding
-- webinar_id (nullable, alongside the existing nullable session_id) lets a
-- pre-computed translation live at the webinar level while still allowing a
-- true live session's captions to be scoped to that one session.

alter table real_time_translations add column if not exists webinar_id uuid references webinars(id) on delete cascade;
alter table translation_segments add column if not exists webinar_id uuid references webinars(id) on delete cascade;

create index if not exists real_time_translations_webinar_idx on real_time_translations (webinar_id);
create index if not exists translation_segments_webinar_idx on translation_segments (webinar_id, start_time_seconds);
