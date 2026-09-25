-- Guest Reel: guests scan a QR at the wedding and upload their phone photos,
-- videos, and 60-second video messages. Run once in the Supabase SQL editor.

create table if not exists public.guest_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  event_date date,
  upload_open_until timestamptz not null,
  view_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.guest_uploads (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.guest_events(id) on delete cascade,
  guest_name text not null default '',
  kind text not null check (kind in ('photo', 'video', 'message')),
  filename text not null,
  key text not null,
  web_key text,
  content_type text not null default '',
  bytes bigint not null default 0,
  width int,
  height int,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists guest_uploads_event_idx on public.guest_uploads(event_id, created_at);

-- Service-role access only (no policies on purpose).
alter table public.guest_events enable row level security;
alter table public.guest_uploads enable row level security;
