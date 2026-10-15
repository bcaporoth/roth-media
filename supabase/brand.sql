-- Brand Palette, phase 1 (docs/BRAND-PALETTE-SPEC.md §5, §8).
-- One palette per business client + the files they upload for it.
-- Safe to run any number of times. Also part of supabase/00-all.sql.
--
-- Access: the portal reads and writes these through the server only
-- (app/api/portal/brand checks the signed-in email against clients.email,
-- app/api/admin/brand checks the admin). So row-level security is on with
-- no policies — the browser's anon key can't touch either table, and
-- brandon_notes never leaves the server for a client.
--
-- Goals, check-ins and the content pipeline (spec phases 2–3) come later
-- as their own tables.

create table if not exists public.brand_palettes (
  client_id uuid primary key references public.clients(id) on delete cascade,
  slug text unique,                                  -- for the phase-2 report link
  data jsonb not null default '{}'::jsonb,           -- { business:{}, visual:{}, vibe:{}, voice:{}, audience:{}, offer:{}, goals:{}, content:{}, logistics:{}, _talk:{}, _suggest:{} }
  brandon_notes jsonb not null default '{}'::jsonb,  -- { <section>: "note" } — Studio only
  section_status jsonb not null default '{}'::jsonb, -- { <section>: { filled, of, at, by } }
  invited_at timestamptz,                            -- last "Send brand palette"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''                -- 'client' | 'brandon'
);
alter table public.brand_palettes add column if not exists invited_at timestamptz;
alter table public.brand_palettes add column if not exists created_at timestamptz not null default now();
alter table public.brand_palettes enable row level security; -- server only

create table if not exists public.brand_assets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  kind text not null check (kind in ('logo','font','moodboard','guide','reference','other')),
  label text not null default '',                    -- 'Primary logo', 'Icon', 'Dark version'
  r2_key text not null,                              -- brands/<client_id>/<id>-<filename>
  filename text not null default '',
  mime text not null default '',
  bytes bigint,
  width int, height int,
  created_at timestamptz not null default now()
);
alter table public.brand_assets add column if not exists filename text not null default '';
alter table public.brand_assets add column if not exists bytes bigint;
create index if not exists brand_assets_client_idx on public.brand_assets(client_id, created_at);
alter table public.brand_assets enable row level security; -- server only
