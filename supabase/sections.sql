-- Album sections ("parts of the day") — run once in the Supabase SQL Editor.
-- Media rows can carry a section name (e.g. "Getting Ready", "Ceremony");
-- the gallery pages group tiles under these headings in upload order.
-- Null section = ungrouped, renders without a heading.
alter table media add column if not exists section text;
