-- Shoot day end time — run once in the Supabase SQL editor (safe to re-run).
alter table public.shoot_days add column if not exists end_time text not null default '';
