-- Studio → Shoots: Brandon's own itinerary hub. Run once in the Supabase SQL editor.
create table if not exists public.shoots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  kind text not null default 'other' check (kind in ('wedding', 'family', 'business', 'event', 'other')),
  status text not null default 'planned' check (status in ('planned', 'confirmed', 'done', 'cancelled')),
  client_name text not null default '',
  client_email text not null default '',
  client_phone text not null default '',
  date date,
  start_time text not null default '',       -- "16:30" (24h) once known
  time_note text not null default '',        -- "two hours before sunset" — resolved against the location's sunset
  address text not null default '',
  place_label text not null default '',      -- what the geocoder matched
  lat double precision,
  lng double precision,
  miles double precision,                    -- driving distance from home
  drive_min integer,                         -- driving time from home
  notes text not null default '',
  checklist jsonb not null default '[]'::jsonb,   -- [{ "text": "...", "done": false }]
  submission_id uuid references public.submissions(id) on delete set null,
  gallery_id uuid references public.galleries(id) on delete set null
);
create index if not exists shoots_date_idx on public.shoots(date);
alter table public.shoots enable row level security; -- service role only
