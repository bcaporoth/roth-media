-- Guest Reel ↔ client album link. Run once in the Supabase SQL editor.
alter table public.guest_events
  add column if not exists gallery_id uuid references public.galleries(id) on delete set null;
create index if not exists guest_events_gallery_idx on public.guest_events(gallery_id);
