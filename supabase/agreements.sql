-- Agreements you send one client at a time (website upkeep, custom invoices):
-- Studio → Payments → "Send an agreement". Client opens /sign/<token>, signs,
-- pays by Stripe. Run once in the Supabase SQL editor.
create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  token text not null unique,
  kind text not null default 'upkeep',
  client_name text not null default '',
  client_email text not null default '',
  client_phone text not null default '',
  business text not null default '',
  site_url text not null default '',
  amount_cents integer not null default 0,
  period text not null default '',
  note text not null default '',
  sign_required boolean not null default true,
  status text not null default 'sent' check (status in ('sent', 'signed', 'paid', 'void')),
  text_version text not null default '',
  agreement_text text not null default '',
  signed_name text not null default '',
  signed_at timestamptz,
  signed_ip text not null default '',
  signed_ua text not null default '',
  stripe_session_id text not null default '',
  payment_intent text not null default '',
  paid_cents integer not null default 0,
  paid_at timestamptz
);
create index if not exists agreements_created_idx on public.agreements(created_at desc);
create index if not exists agreements_email_idx on public.agreements(client_email);
alter table public.agreements enable row level security; -- service role only
