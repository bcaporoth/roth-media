-- Playbook: a fifth section, "camera" — settings & reminders ticked on the
-- shoot (white balance, slo-mo, hold still, tripod angle). Run once in the
-- Supabase SQL editor; the app seeds the starter lists the next time the
-- Playbook or a shoot loads.
alter table public.playbook drop constraint if exists playbook_section_check;
alter table public.playbook add constraint playbook_section_check check (section in ('gear', 'shots', 'flow', 'poses', 'camera'));
