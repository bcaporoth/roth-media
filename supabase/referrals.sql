-- Give $100, get $100 — referrals. Run once in the Supabase SQL editor
-- (or run supabase/00-all.sql, which includes this). Safe to run twice.
alter table public.clients add column if not exists referral_code text;
create unique index if not exists clients_referral_code_idx on public.clients(referral_code) where referral_code is not null;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  code text not null,                       -- the FRIEND code that was used
  referrer_email text not null,
  referrer_name text not null default '',
  referred_email text not null,
  referred_name text not null default '',
  booking_id uuid references public.bookings(id) on delete set null,
  amount_cents integer not null default 10000,
  reward text not null default 'credit' check (reward in ('balance', 'credit')),
  reward_code text,                         -- THANKS-xxxxx when the reward is a credit
  used_at timestamptz,                      -- when that credit was spent
  used_booking_id uuid references public.bookings(id) on delete set null
);
create index if not exists referrals_referrer_idx on public.referrals(referrer_email, created_at desc);
create unique index if not exists referrals_reward_code_idx on public.referrals(reward_code) where reward_code is not null;
alter table public.referrals enable row level security; -- service role only
