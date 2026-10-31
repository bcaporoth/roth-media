-- Inspo: private-to-Brandon reference links (reels, videos, sites) + a scratch note per client.
-- Shape: { "links": [ { "url": "...", "label": "...", "note": "..." } ], "notes": "..." }
alter table public.clients add column if not exists inspo jsonb not null default '{"links":[],"notes":""}'::jsonb;
