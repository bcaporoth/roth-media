-- Roth Media — the whole database, in one file.
--
-- HOW TO RUN: Supabase → SQL editor → paste this whole file → Run.
-- SAFE TO RUN ANY NUMBER OF TIMES: every statement is "create … if not
-- exists" / "add column if not exists" / "drop policy if exists; create
-- policy", so a second run changes nothing. It never drops a table, a
-- column or a row.
--
-- It is the same thing as running these, in this order, once each:
--   supabase-schema.sql, supabase-schema-phase2.sql, supabase/design.sql,
--   supabase/premiere.sql, supabase/sections.sql, supabase/studio.sql,
--   supabase/clients.sql, supabase/clients-optout.sql, supabase/guest.sql,
--   supabase/guest-link.sql, supabase/gallery-members.sql, supabase/shoots.sql,
--   supabase/bookings.sql, supabase/playbook.sql, supabase/studio-2.sql
-- On a database where some of those already ran, the parts already there
-- are skipped. On a brand-new database it sets up everything.
--
-- Tables that only the server touches (service role) have row-level
-- security on with no policies — that is on purpose. Tables clients read
-- from their portal get a "read your own rows" policy.

-- ───────────────────────────────────────────────────────────────────────
-- 1. Client portal, phase 1 — clients, legacy gallery links, payments
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.gallery_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null,
  url text not null,
  note text,
  created_at timestamptz not null default now()
);
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  paid_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
alter table public.clients enable row level security;
alter table public.gallery_links enable row level security;
alter table public.payments enable row level security;
drop policy if exists "clients read own row" on public.clients;
create policy "clients read own row" on public.clients
  for select using (email = auth.jwt() ->> 'email');
drop policy if exists "clients read own galleries" on public.gallery_links;
create policy "clients read own galleries" on public.gallery_links
  for select using (
    client_id in (select id from public.clients where email = auth.jwt() ->> 'email')
  );
drop policy if exists "clients read own payments" on public.payments;
create policy "clients read own payments" on public.payments
  for select using (
    client_id in (select id from public.clients where email = auth.jwt() ->> 'email')
  );

-- ───────────────────────────────────────────────────────────────────────
-- 2. Hosted galleries — galleries + media (phase 2), design, premiere, sections
create table if not exists public.galleries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null,
  event_date date,
  cover_filename text,
  zip_key text,
  media_count integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries (id) on delete cascade,
  filename text not null,
  kind text not null default 'photo' check (kind in ('photo', 'video')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.galleries enable row level security;
alter table public.media enable row level security;
drop policy if exists "clients read own hosted galleries" on public.galleries;
create policy "clients read own hosted galleries" on public.galleries
  for select using (
    client_id in (select id from public.clients where email = auth.jwt() ->> 'email')
  );
drop policy if exists "clients read own media" on public.media;
create policy "clients read own media" on public.media
  for select using (
    gallery_id in (
      select g.id from public.galleries g
      join public.clients c on c.id = g.client_id
      where c.email = auth.jwt() ->> 'email'
    )
  );
-- share_token: the no-login share link (/g/<token>). Older databases got it
-- from the dashboard; this makes sure it is there everywhere.
alter table public.galleries add column if not exists share_token uuid not null default gen_random_uuid();
create unique index if not exists galleries_share_token_idx on public.galleries(share_token);
-- Per-album design (fonts / mood / accent)
alter table public.galleries add column if not exists design jsonb not null default '{}'::jsonb;
-- Same-Night Premiere
alter table public.galleries add column if not exists premiere_enabled boolean not null default false;
alter table public.galleries add column if not exists reveal_at timestamptz;
create table if not exists public.premiere_leads (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  name text not null default '',
  email text not null,
  reveal_sent_at timestamptz,
  scheduled_email_id text,
  created_at timestamptz not null default now(),
  unique (gallery_id, email)
);
alter table public.premiere_leads enable row level security; -- service role only
-- Album sections ("parts of the day")
alter table public.media add column if not exists section text;

-- ───────────────────────────────────────────────────────────────────────
-- 3. Studio — inbox, site stats, gallery activity, review asks
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
  fields jsonb not null default '[]'::jsonb,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'booked', 'lost', 'archived')),
  notes text not null default '',
  read_at timestamptz,
  source_path text not null default '',
  visitor text not null default '',
  utm jsonb not null default '{}'::jsonb
);
create index if not exists submissions_created_idx on public.submissions(created_at desc);
create index if not exists submissions_status_idx on public.submissions(status);
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
create table if not exists public.gallery_activity (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  action text not null check (action in ('view', 'download', 'download_all', 'save')),
  via text not null default '' check (via in ('', 'portal', 'share')),
  viewer text not null default '',
  filename text not null default '',
  visitor text not null default ''
);
create index if not exists gallery_activity_gallery_idx on public.gallery_activity(gallery_id, created_at desc);
alter table public.galleries add column if not exists review_requested_at timestamptz;
alter table public.submissions enable row level security;
alter table public.site_events enable row level security;
alter table public.gallery_activity enable row level security;

-- ───────────────────────────────────────────────────────────────────────
-- 4. Clients — phone, notes, one-click unsubscribe
alter table public.clients add column if not exists phone text not null default '';
alter table public.clients add column if not exists notes text not null default '';
alter table public.clients add column if not exists email_opt_out boolean not null default false;
alter table public.clients add column if not exists unsubscribe_token uuid not null default gen_random_uuid();
create unique index if not exists clients_unsubscribe_token_idx on public.clients(unsubscribe_token);

-- ───────────────────────────────────────────────────────────────────────
-- 5. Guest Reel — events, uploads, link to the client album
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
alter table public.guest_events enable row level security;  -- service role only
alter table public.guest_uploads enable row level security; -- service role only
alter table public.guest_events add column if not exists gallery_id uuid references public.galleries(id) on delete set null;
create index if not exists guest_events_gallery_idx on public.guest_events(gallery_id);

-- ───────────────────────────────────────────────────────────────────────
-- 6. Extra people on an album (spouse, parents)
create table if not exists public.gallery_members (
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (gallery_id, client_id)
);
alter table public.gallery_members enable row level security;
drop policy if exists "members read own memberships" on public.gallery_members;
create policy "members read own memberships" on public.gallery_members
  for select using (
    client_id in (select id from public.clients where email = auth.jwt() ->> 'email')
  );
drop policy if exists "members read shared galleries" on public.galleries;
create policy "members read shared galleries" on public.galleries
  for select using (
    id in (
      select m.gallery_id from public.gallery_members m
      join public.clients c on c.id = m.client_id
      where c.email = auth.jwt() ->> 'email'
    )
  );
drop policy if exists "members read shared media" on public.media;
create policy "members read shared media" on public.media
  for select using (
    gallery_id in (
      select m.gallery_id from public.gallery_members m
      join public.clients c on c.id = m.client_id
      where c.email = auth.jwt() ->> 'email'
    )
  );

-- ───────────────────────────────────────────────────────────────────────
-- 7. Shoots — Brandon's itinerary (+ the delivery clock from studio-2)
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
  start_time text not null default '',
  time_note text not null default '',
  address text not null default '',
  place_label text not null default '',
  lat double precision,
  lng double precision,
  miles double precision,
  drive_min integer,
  notes text not null default '',
  checklist jsonb not null default '[]'::jsonb,
  submission_id uuid references public.submissions(id) on delete set null,
  gallery_id uuid references public.galleries(id) on delete set null
);
create index if not exists shoots_date_idx on public.shoots(date);
alter table public.shoots enable row level security; -- service role only
alter table public.shoots add column if not exists sneak_due timestamptz;
alter table public.shoots add column if not exists final_due timestamptz;
alter table public.shoots add column if not exists sneak_delivered_at timestamptz;
alter table public.shoots add column if not exists final_delivered_at timestamptz;

-- ───────────────────────────────────────────────────────────────────────
-- 8. Bookings — paid Stripe Checkout sessions
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

-- ───────────────────────────────────────────────────────────────────────
-- 9. Playbook — reusable gear / shot / flow / pose lists
create table if not exists public.playbook (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  section text not null check (section in ('gear', 'shots', 'flow', 'poses')),
  kind text not null default 'any' check (kind in ('any', 'wedding', 'family', 'business', 'event', 'other')),
  title text not null,
  notes text not null default '',
  items jsonb not null default '[]'::jsonb,
  auto boolean not null default true,
  sort integer not null default 0
);
create index if not exists playbook_section_idx on public.playbook(section, sort);
alter table public.playbook enable row level security; -- service role only

-- ───────────────────────────────────────────────────────────────────────
-- 10. Inbox action bar (studio-2) — first reply, follow-ups, lost reason
alter table public.submissions add column if not exists first_contacted_at timestamptz;
alter table public.submissions add column if not exists next_follow_up date;
alter table public.submissions add column if not exists lost_reason text;
create index if not exists submissions_next_follow_up_idx
  on public.submissions (next_follow_up) where next_follow_up is not null;

-- ───────────────────────────────────────────────────────────────────────
-- 11. One media row per file per gallery (studio-2). Skipped with a notice
-- if an old gallery already holds the same filename twice.
do $$
begin
  create unique index if not exists media_gallery_filename_key
    on public.media (gallery_id, filename);
exception when others then
  raise notice 'media_gallery_filename_key not created: %', sqlerrm;
end $$;
