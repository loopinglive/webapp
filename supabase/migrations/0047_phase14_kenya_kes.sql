-- Phase 14: Kenya's row was seeded in USD in 0045, but M-Pesa only settles in
-- KES — the app/api/payments/local/mpesa/initiate route correctly refuses to
-- charge anything but KES, which made mpesa unreachable via that seed data.
-- Approximate at ~130 KES/USD; update to the live rate once Safaricom
-- credentials actually exist.
-- Run after 0046_phase14_payment_intents.sql.

update localized_pricing
set currency_code = 'KES',
    currency_symbol = 'KSh',
    monthly_price = 2600,
    yearly_price = 19100,
    lifetime_price = 68500
where country_code = 'KE';
