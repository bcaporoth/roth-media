-- Roth Media Studio — upgrades, round 2 (October 2026).
--
-- HOW TO RUN: Supabase → SQL editor → paste this whole file → Run. Once.
-- SAFE TO RUN TWICE: every statement is "add … if not exists" (or skips
-- itself with a notice), so a second run changes nothing. It only ADDS
-- things: no table, column or row that exists today is changed or removed.
-- The Studio works before this is run, too — the features below just show a
-- small "run supabase/studio-2.sql once" note until it is.
--
-- It adds to tables the earlier files create: supabase/studio.sql
-- (submissions), supabase/shoots.sql (shoots), supabase-schema-phase2.sql
-- (media). If one of those hasn't been run yet, that part is skipped with a
-- notice rather than stopping the script — run this file again afterwards.
--
-- WHAT IT ADDS
--   1. Inbox    → submissions.first_contacted_at, .next_follow_up, .lost_reason
--                 + an index on next_follow_up
--                 (first-reply time, follow-up reminders, "lost because…")
--   2. Shoots   → shoots.sneak_due, .final_due, .sneak_delivered_at,
--                 .final_delivered_at
--                 (the delivery clock: what's owed to clients and when)
--   3. Galleries → a unique index on media (gallery_id, filename)
--                 (a file can't be saved into the same gallery twice)

-- ───────────────────────────────────────────────────────────────────────
-- 1. Inbox
-- == inbox ==
-- When Brandon first replied, when to follow up, and why a lead was lost.
-- All nullable; nothing existing changes.
alter table if exists public.submissions add column if not exists first_contacted_at timestamptz;
alter table if exists public.submissions add column if not exists next_follow_up date;
alter table if exists public.submissions add column if not exists lost_reason text;
do $$
begin
  create index if not exists submissions_next_follow_up_idx
    on public.submissions (next_follow_up) where next_follow_up is not null;
exception when undefined_table or undefined_column then
  raise notice 'submissions_next_follow_up_idx not created: %', sqlerrm;
end $$;
-- == /inbox ==

-- ───────────────────────────────────────────────────────────────────────
-- 2. Shoots
-- == shoots ==
-- Delivery clock: when the sneak peek and the finished work are due for a
-- shoot, and when each actually went out. All nullable; old shoots are left
-- alone (the Studio works the due dates out from the shoot date until then).
alter table if exists public.shoots add column if not exists sneak_due timestamptz;
alter table if exists public.shoots add column if not exists final_due timestamptz;
alter table if exists public.shoots add column if not exists sneak_delivered_at timestamptz;
alter table if exists public.shoots add column if not exists final_delivered_at timestamptz;
-- Old shoots you've already delivered: use "Mark the older ones delivered"
-- at the top of Studio → Shoots (one tap). Or, by hand (NOT part of this
-- script — it stays commented out):
--   update public.shoots set final_delivered_at = now()
--   where final_delivered_at is null and date < current_date - 60;
-- == /shoots ==

-- ───────────────────────────────────────────────────────────────────────
-- 3. Galleries
-- == galleries ==
-- One media row per file per gallery. The Studio already skips files that
-- are in the gallery when an upload finishes; this makes the database refuse
-- a double-insert too (two "finish" calls landing at the same moment).
-- If an old gallery already holds the same filename twice, the index is
-- skipped with a notice instead of failing this whole script — nothing else
-- depends on it.
do $$
begin
  create unique index if not exists media_gallery_filename_key
    on public.media (gallery_id, filename);
exception when others then
  raise notice 'media_gallery_filename_key not created: %', sqlerrm;
end $$;
-- == /galleries ==
