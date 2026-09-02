#!/usr/bin/env node
/**
 * Re-sort an existing gallery into true capture order — no re-upload.
 *
 * Reads EXIF capture times from the LOCAL album folder (the same files that
 * were uploaded), sorts by time-taken, and rewrites media.position in
 * Supabase. Fixes albums where the camera's file counter rolled over past
 * 9999 mid-shoot, or where a second camera's files sorted to the end.
 *
 * Usage:
 *   node scripts/reorder-gallery.mjs \
 *     --gallery <gallery-uuid> \
 *     --dir "/path/to/album" \
 *     [--dry]            # print the new order without writing
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { captureTime } from "./lib/capture-time.mjs";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const key = process.argv[i].replace(/^--/, "");
  if (key === "dry") args.dry = true;
  else args[key] = process.argv[++i];
}
if (!args.gallery || !args.dir) {
  console.error(
    'Usage: node scripts/reorder-gallery.mjs --gallery <uuid> --dir "/path/to/album" [--dry]'
  );
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: media, error } = await db
  .from("media")
  .select("id, filename, position")
  .eq("gallery_id", args.gallery)
  .order("position")
  .limit(10000);
if (error) {
  console.error("Failed to read media:", error.message);
  process.exit(1);
}
if (!media?.length) {
  console.error("No media rows for that gallery id.");
  process.exit(1);
}
console.log(`Gallery has ${media.length} items.`);

const timed = [];
for (const row of media) {
  const full = path.join(args.dir, row.filename);
  if (!fs.existsSync(full)) {
    console.error(`Local file missing: ${row.filename} — aborting (wrong --dir?)`);
    process.exit(1);
  }
  timed.push({ ...row, time: await captureTime(full) });
}

timed.sort(
  (a, b) =>
    a.time - b.time ||
    a.filename.localeCompare(b.filename, undefined, { numeric: true })
);

let moved = 0;
timed.forEach((row, i) => {
  if (row.position !== i) moved++;
});
console.log(`${moved} of ${timed.length} items change position.`);
console.log("New first 5:", timed.slice(0, 5).map((r) => r.filename).join(", "));
console.log("New last 5: ", timed.slice(-5).map((r) => r.filename).join(", "));

if (args.dry) {
  console.log("(dry run — nothing written)");
  process.exit(0);
}

// Write in chunks; only rows whose position actually changed.
const updates = timed
  .map((row, i) => ({ id: row.id, position: i }))
  .filter((u, i) => timed[i].position !== u.position);
for (let i = 0; i < updates.length; i++) {
  const u = updates[i];
  const { error: uErr } = await db
    .from("media")
    .update({ position: u.position })
    .eq("id", u.id);
  if (uErr) {
    console.error(`Update failed at ${i}:`, uErr.message);
    process.exit(1);
  }
  if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${updates.length}`);
}
console.log(`Done — ${updates.length} rows updated. Refresh the gallery to see the new order.`);
