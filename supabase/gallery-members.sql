-- Extra people on an album (a spouse, parents): they log in with their own
-- email and see the gallery in their portal. Run once in the Supabase SQL editor.
create table if not exists public.gallery_members (
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (gallery_id, client_id)
);
alter table public.gallery_members enable row level security;

create policy "members read own memberships" on public.gallery_members
  for select using (
    client_id in (select id from public.clients where email = auth.jwt() ->> 'email')
  );
create policy "members read shared galleries" on public.galleries
  for select using (
    id in (
      select m.gallery_id from public.gallery_members m
      join public.clients c on c.id = m.client_id
      where c.email = auth.jwt() ->> 'email'
    )
  );
create policy "members read shared media" on public.media
  for select using (
    gallery_id in (
      select m.gallery_id from public.gallery_members m
      join public.clients c on c.id = m.client_id
      where c.email = auth.jwt() ->> 'email'
    )
  );
