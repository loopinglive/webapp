-- The series builder schedules unlocks in hours (finer-grained than the
-- day-level unlock_after_days from the original Phase 11 migration), which
-- the application code was already written against. Adding the column it
-- actually needs rather than rewriting the builder down to day granularity.
alter table webinar_series_items
  add column if not exists unlock_delay_hours integer default 0;
