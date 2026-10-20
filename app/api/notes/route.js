import { NextResponse } from "next/server";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { noteAccess, listNotes, postNote, markSeen } from "../../../lib/notes-server";

export const dynamic = "force-dynamic";
const bad = (error, status = 422) => NextResponse.json({ error }, { status });

// Notes with Brandon. Brandon passes clientId; a client gets their own thread.
//   list — the thread (and marks the other side's notes as seen)
//   post — add a note; the other side gets an email carrying it
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const access = await noteAccess(request, { createSupabaseServer, portalConfigured, adminConfigured }, body.clientId);
  if (!access) return bad("Sign in first", 401);
  const { me, client } = access;
  const db = supabaseAdmin();
  try {
    if (body.action === "list") {
      const notes = await listNotes(db, client.id);
      if (notes === null) return NextResponse.json({ ok: true, notes: [], ready: false });
      await markSeen(db, client.id, me);
      return NextResponse.json({ ok: true, notes, ready: true });
    }
    if (body.action === "post") {
      const r = await postNote(db, { client, who: me, text: body.text });
      return NextResponse.json({ ok: true, ...r });
    }
    return bad("Unknown action", 400);
  } catch (err) {
    return bad(err.message || "Something went wrong", 500);
  }
}
