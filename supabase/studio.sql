-- Studio: form inbox + lead pipeline, first-party site stats, client
-- gallery activity, review requests. Run once in the Supabase SQL editor.
-- Everything here is written and read by the server (service role) only.

-- Every form on the site lands here (quote, promo, card, contact).
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kind text not null default 'contact',
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  subject text not null default '',
  summary text not null default '',
  fields jsonb not null default '[]'::jsonb,       -- [[label, value], ...] in form order
  status text not null default 'new'
    check (status in ('new', 'contacted', 'booked', 'lost', 'archived')),
  notes text not null default '',
  read_at timestamptz,
  source_path text not null default '',
  visitor text not null default '',                -- joins to site_events.visitor
  utm jsonb not null default '{}'::jsonb
);
create index if not exists submissions_created_idx on public.submissions(created_at desc);
create index if not exists submissions_status_idx on public.submissions(status);

-- Page views + custom events. No cookies: visitor is a daily-rotating hash.
create table if not exists public.site_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  type text not null default 'pageview' check (type in ('pageview', 'event')),
  name text not null default '',
  path text not null default '',
  referrer text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  visitor text not null default '',
  device text not null default '',
  browser text not null default '',
  os text not null default '',
  country text not null default '',
  region text not null default '',
  city text not null default '',
  data jsonb not null default '{}'::jsonb
);
create index if not exists site_events_created_idx on public.site_events(created_at desc);
create index if not exists site_events_visitor_idx on public.site_events(visitor, created_at);

-- Client gallery opens, downloads, saves.
create table if not exists public.gallery_activity (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  action text not null check (action in ('view', 'download', 'download_all', 'save')),
  via text not null default '' check (via in ('', 'portal', 'share')),
  viewer text not null default '',                 -- client email when signed in
  filename text not null default '',
  visitor text not null default ''
);
create index if not exists gallery_activity_gallery_idx on public.gallery_activity(gallery_id, created_at desc);

-- One-tap review ask, remembered per gallery.
alter table public.galleries add column if not exists review_requested_at timestamptz;

alter table public.submissions enable row level security;
alter table public.site_events enable row level security;
alter table public.gallery_activity enable row level security;
