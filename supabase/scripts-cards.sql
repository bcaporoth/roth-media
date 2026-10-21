-- Oct 21 2026: two new card kinds on a shoot day — T-chart and Questions.
-- Run once in the Supabase SQL editor (project roth-media).
alter table public.scripts drop constraint if exists scripts_kind_check;
alter table public.scripts add constraint scripts_kind_check
  check (kind in ('reel', 'howto', 'recipe', 'manual', 'promo', 'photos', 'tchart', 'questions', 'other'));
