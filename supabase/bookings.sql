-- Book-it-now: paid Stripe Checkout sessions. Run once in the Supabase SQL editor.
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  stripe_session_id text not null unique,
  payment_intent text not null default '',
  category text not null default '',
  package_id text not null default '',
  package_name text not null default '',
  addons jsonb not null default '[]'::jsonb,
  total_cents integer not null default 0,
  paid_cents integer not null default 0,
  discount_cents integer not null default 0,
  mode text not null default 'full' check (mode in ('full', 'retainer')),
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  event_date text not null default '',
  where_text text not null default '',
  notes text not null default '',
  promo_code text not null default '',
  status text not null default 'paid' check (status in ('paid', 'balance_due', 'complete', 'refunded', 'cancelled'))
);
create index if not exists bookings_created_idx on public.bookings(created_at desc);
create index if not exists bookings_email_idx on public.bookings(email);
alter table public.bookings enable row level security; -- service role only
