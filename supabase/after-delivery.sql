-- After delivery: when the friend code went out and when the "book next year"
-- nudge was sent — stamped from Studio, read by the morning brief.
-- Run once in the Supabase SQL editor (safe to re-run).
alter table public.galleries add column if not exists referral_sent_at timestamptz;
alter table public.galleries add column if not exists rebook_nudged_at timestamptz;
