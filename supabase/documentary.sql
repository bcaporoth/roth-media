-- Shoot type "documentary" (long-form film: interviews, b-roll, archival).
-- Run once in the Supabase SQL editor. Then Studio → Playbook → filter
-- Documentary → "Add the Documentary starter lists".
alter table public.shoots drop constraint if exists shoots_kind_check;
alter table public.shoots add constraint shoots_kind_check
  check (kind in ('wedding', 'engagement', 'family', 'business', 'event', 'documentary', 'other'));
alter table public.playbook drop constraint if exists playbook_kind_check;
alter table public.playbook add constraint playbook_kind_check
  check (kind in ('any', 'wedding', 'engagement', 'family', 'business', 'event', 'documentary', 'other'));
