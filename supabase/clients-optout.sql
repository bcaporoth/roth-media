-- Studio → Clients: one-click unsubscribe for broadcasts. Run once in the Supabase SQL editor.
alter table public.clients
  add column if not exists email_opt_out boolean not null default false,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();
create unique index if not exists clients_unsubscribe_token_idx on public.clients(unsubscribe_token);
