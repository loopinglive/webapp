-- Phase 14: seed localized pricing and local payment method availability.
-- Run after 0044_phase14_docs_seed.sql.

insert into localized_pricing
  (country_code, country_name, currency_code, currency_symbol, monthly_price, yearly_price, lifetime_price, purchasing_power_parity_factor, payment_methods) values
('NG', 'Nigeria',       'USD', '$',  19,  137,  497, 0.40, '["paystack","flutterwave","stripe"]'),
('GH', 'Ghana',         'USD', '$',  22,  157,  547, 0.47, '["paystack","flutterwave","stripe"]'),
('KE', 'Kenya',         'USD', '$',  20,  147,  527, 0.43, '["mpesa","flutterwave","stripe"]'),
('ZA', 'South Africa',  'ZAR', 'R',  897, 6497, 25997, 0.55, '["stripe","payfast"]'),
('IN', 'India',         'INR', '₹', 1997, 14997, 59997, 0.30, '["razorpay","stripe"]'),
('BR', 'Brazil',        'BRL', 'R$', 137, 997, 3997, 0.45, '["stripe","pix"]'),
('GB', 'United Kingdom','GBP', '£', 37, 267, 1097, 1.0, '["stripe"]'),
('US', 'United States', 'USD', '$',  47, 347, 1397, 1.0, '["stripe"]')
on conflict (country_code) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'local_payment_methods_provider_key'
  ) then
    alter table local_payment_methods add constraint local_payment_methods_provider_key unique (provider);
  end if;
end $$;

insert into local_payment_methods (method_name, method_type, supported_countries, provider) values
('Paystack',    'card_bank_ussd', '["NG","GH","ZA","KE"]', 'paystack'),
('Flutterwave', 'card_mobile_money_ussd', '["NG","GH","KE","UG","TZ","ZA"]', 'flutterwave'),
('M-Pesa',      'mobile_money', '["KE","TZ","UG"]', 'mpesa'),
('Razorpay',    'upi_card_netbanking', '["IN"]', 'razorpay'),
('Stripe',      'card_apple_pay_google_pay', '["*"]', 'stripe')
on conflict (provider) do nothing;
