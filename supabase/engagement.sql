-- Engagement sessions as their own shoot type (Oct 2026). Run once in the
-- Supabase SQL editor on an existing project; fresh installs get this from
-- shoots.sql / playbook.sql already.
alter table public.shoots drop constraint if exists shoots_kind_check;
alter table public.shoots add constraint shoots_kind_check
  check (kind in ('wedding', 'engagement', 'family', 'business', 'event', 'other'));

alter table public.playbook drop constraint if exists playbook_kind_check;
alter table public.playbook add constraint playbook_kind_check
  check (kind in ('any', 'wedding', 'engagement', 'family', 'business', 'event', 'other'));
