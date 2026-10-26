-- Sprint 5 — the client machinery. Discovery, approvals, review versions
-- with timecoded notes, change orders, payments, comm log, weekly updates,
-- sensitivity register. The client portal reads a projection of these.
alter table public.projects add column if not exists discovery jsonb not null default '{}'::jsonb;
alter table public.projects add column if not exists discovery_locked_at timestamptz;
alter table public.projects add column if not exists contract_cents integer not null default 0;

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null default 'milestone' check (kind in ('milestone', 'cut', 'change_order', 'deliverable', 'other')),
  ref_id text not null default '',
  label text not null,
  detail text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes')),
  signed_name text not null default '',
  signed_email text not null default '',
  signed_at timestamptz,
  ip text not null default '',
  note text not null default ''
);
create index if not exists approvals_project_idx on public.approvals(project_id, created_at);

create table if not exists public.review_versions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  cut_id uuid,
  label text not null,
  link text not null default '',
  video_key text not null default '',
  message text not null default '',
  status text not null default 'open' check (status in ('open', 'closed')),
  client_visible boolean not null default true
);
create index if not exists review_versions_project_idx on public.review_versions(project_id, created_at);

create table if not exists public.review_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  review_id uuid not null references public.review_versions(id) on delete cascade,
  at_s numeric,
  text text not null,
  who text not null default '',
  side text not null default 'client' check (side in ('client', 'us')),
  resolved boolean not null default false
);
create index if not exists review_notes_review_idx on public.review_notes(review_id, at_s);

create table if not exists public.change_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  number integer not null default 1,
  title text not null,
  description text not null default '',
  amount_cents integer not null default 0,
  expires date,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')),
  accepted_name text not null default '',
  accepted_at timestamptz,
  ip text not null default ''
);
create index if not exists change_orders_project_idx on public.change_orders(project_id, number);

create table if not exists public.project_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  amount_cents integer not null default 0,
  due date,
  status text not null default 'scheduled' check (status in ('scheduled', 'invoiced', 'paid', 'late', 'waived')),
  paid_at date,
  method text not null default '',
  note text not null default '',
  gates text not null default '',
  sort integer not null default 0
);
create index if not exists project_payments_idx on public.project_payments(project_id, sort);

create table if not exists public.comms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  date date not null,
  channel text not null default 'call' check (channel in ('call', 'email', 'text', 'meeting', 'portal', 'other')),
  who text not null default '',
  summary text not null,
  decisions text not null default '',
  client_visible boolean not null default false
);
create index if not exists comms_project_idx on public.comms(project_id, date);

create table if not exists public.updates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  week_of date not null,
  body text not null default '',
  published_at timestamptz,
  emailed_to text not null default ''
);
create index if not exists updates_project_idx on public.updates(project_id, week_of);

create table if not exists public.sensitivities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  topic text not null,
  handling text not null default 'approve_before_use' check (handling in ('public', 'internal_only', 'approve_before_use', 'omit')),
  note text not null default '',
  raised_by text not null default ''
);
create index if not exists sensitivities_project_idx on public.sensitivities(project_id);

alter table public.approvals enable row level security;
alter table public.review_versions enable row level security;
alter table public.review_notes enable row level security;
alter table public.change_orders enable row level security;
alter table public.project_payments enable row level security;
alter table public.comms enable row level security;
alter table public.updates enable row level security;
alter table public.sensitivities enable row level security;
