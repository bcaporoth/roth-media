-- Client calendars: the client adds their own moments (sales, launches,
-- events) on /portal/calendar; Brandon sees them on their Studio profile and
-- taps "Follow up on this" (Google Calendar). Run once in the SQL editor.
create table if not exists public.client_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null,
  time text not null default '',              -- 'HH:MM' or ''
  title text not null,
  note text not null default '',
  created_by text not null default 'client' check (created_by in ('client', 'studio')),
  followup_at timestamptz,                    -- Brandon tapped "Follow up on this"
  followup_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists client_events_client_date_idx on public.client_events(client_id, date);
alter table public.client_events enable row level security; -- service role only
