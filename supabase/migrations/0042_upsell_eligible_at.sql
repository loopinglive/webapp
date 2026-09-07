-- upsell_bought_at was being used two different ways in already-written code:
-- the analytics query reads it as "when the upsell offer was actually
-- purchased" (correct, per its name), while the upsell cron was reading it
-- as the anchor timestamp to count delay_days from -- i.e. "when did this
-- registrant become eligible", which is a different moment entirely. Giving
-- eligibility its own column lets upsell_bought_at mean what its name says
-- everywhere, once something actually sets it (a future billing-webhook
-- hook for the target webinar's purchase -- not built yet).
alter table registrants
  add column if not exists upsell_eligible_at timestamptz;
