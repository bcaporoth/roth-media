-- Studio → Clients: phone + notes on the roster. Run once in the Supabase SQL editor.
alter table public.clients
  add column if not exists phone text not null default '',
  add column if not exists notes text not null default '';
