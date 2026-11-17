import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { loadPeople, loadWords, saveWords, startPerson, markPerson, sendStep } from "../../../../lib/nurture-server";

export const dynamic = "force-dynamic";
const bad = (error, status = 422) => NextResponse.json({ error }, { status });

// Command Center → Inbox → Follow-ups (lib/nurture.js).
//   words {words} · start {set,email,name,start} · send {set,email,step}
//   skip / unskip / move {due} / stop / remove
export async function POST(request) {
  if (!(await isAdminRequest())) return bad("Not authorized", 403);
  if (!adminConfigured) return bad("Not set up", 503);
  const db = supabaseAdmin();
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === "words") await saveWords(db, body.words);
    else if (body.action === "start") await startPerson(db, body);
    else if (body.action === "send") await sendStep(db, body);
    else if (["skip", "unskip", "move", "stop", "remove"].includes(body.action)) await markPerson(db, body);
    else if (body.action !== "list") return bad("Unknown action", 400);
    const [people, words] = await Promise.all([loadPeople(db), loadWords(db)]);
    return NextResponse.json({ ok: true, people, words });
  } catch (e) {
    return bad(e?.message || "That didn't work");
  }
}
