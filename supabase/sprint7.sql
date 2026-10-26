-- Sprint 7 — the finish. Deliverables + QC + handoff, archive + retention,
-- post-delivery follow-ups, premiere, crew timesheets → invoices → 1099,
-- vendors + POs, travel, daily production reports.
alter table public.projects add column if not exists delivered_at date;
alter table public.projects add column if not exists retention_until date;
alter table public.projects add column if not exists usage_rights text not null default '';
alter table public.projects add column if not exists premiere jsonb not null default '{}'::jsonb;
alter table public.projects add column if not exists archive jsonb not null default '{}'::jsonb;

create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  kind text not null default 'other',
  spec text not null default '',
  status text not null default 'todo' check (status in ('todo', 'rendering', 'qc', 'delivered', 'acknowledged')),
  link text not null default '',
  file_key text not null default '',
  size_bytes bigint not null default 0,
  checksum text not null default '',
  qc jsonb not null default '{}'::jsonb,
  delivered_at timestamptz,
  ack_name text not null default '',
  ack_at timestamptz,
  ip text not null default '',
  client_visible boolean not null default true,
  sort integer not null default 0
);
create index if not exists deliverables_project_idx on public.deliverables(project_id, sort);

create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('testimonial', 'referral', 'anniversary', 'purge_notice', 'premiere_reminder', 'custom')),
  label text not null,
  due date not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'done', 'skipped')),
  done_at timestamptz,
  note text not null default ''
);
create index if not exists followups_due_idx on public.followups(status, due);

create table if not exists public.timesheets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  staff_id uuid not null,
  shoot_id uuid,
  date date not null,
  call_time text not null default '',
  wrap_time text not null default '',
  hours numeric not null default 0,
  ot_hours numeric not null default 0,
  kit boolean not null default false,
  miles numeric not null default 0,
  per_diem_cents integer not null default 0,
  notes text not null default '',
  approved boolean not null default false,
  invoice_id uuid
);
create index if not exists timesheets_project_idx on public.timesheets(project_id, staff_id, date);

create table if not exists public.crew_invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  staff_id uuid not null,
  number text not null default '',
  period_from date, period_to date,
  lines jsonb not null default '[]'::jsonb,
  amount_cents integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'approved', 'paid')),
  paid_at date,
  method text not null default '',
  notes text not null default ''
);
create index if not exists crew_invoices_project_idx on public.crew_invoices(project_id, staff_id);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  service text not null default '',
  contact text not null default '', email text not null default '', phone text not null default '',
  w9 boolean not null default false,
  coi boolean not null default false,
  notes text not null default ''
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  number integer not null default 1,
  description text not null,
  amount_cents integer not null default 0,
  date date,
  status text not null default 'draft' check (status in ('draft', 'sent', 'received', 'paid')),
  link text not null default '',
  budget_line_id uuid,
  notes text not null default ''
);
create index if not exists purchase_orders_project_idx on public.purchase_orders(project_id, number);

create table if not exists public.travel (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null default 'mileage' check (kind in ('mileage', 'lodging', 'meal', 'trip', 'other')),
  date date,
  who text not null default '',
  shoot_id uuid,
  from_to text not null default '',
  miles numeric not null default 0,
  amount_cents integer not null default 0,
  notes text not null default ''
);
create index if not exists travel_project_idx on public.travel(project_id, date);

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  shoot_id uuid not null unique,
  date date,
  crew_present text not null default '',
  call_actual text not null default '', first_shot text not null default '', wrap_actual text not null default '',
  scenes_shot text not null default '',
  setups integer not null default 0,
  rolls text not null default '',
  camera_notes text not null default '', sound_notes text not null default '',
  issues text not null default '', weather text not null default '', meals text not null default '',
  next_day text not null default '',
  signed_by text not null default '',
  data jsonb not null default '{}'::jsonb
);

alter table public.deliverables enable row level security;
alter table public.followups enable row level security;
alter table public.timesheets enable row level security;
alter table public.crew_invoices enable row level security;
alter table public.vendors enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.travel enable row level security;
alter table public.daily_reports enable row level security;
