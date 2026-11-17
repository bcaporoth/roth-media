import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { cleanQuote, createQuote, getQuoteSettings, listQuotes, patchQuote, quoteProblem, saveQuoteSettings } from "../../../../lib/quotes-server";
import { quoteSendCopy } from "../../../../lib/quotes";
import { creditsFor } from "../../../../lib/walkin";

export const dynamic = "force-dynamic";
const bad = (error, status = 422) => NextResponse.json({ error }, { status });

const siteOf = (request) => {
  const origin = new URL(request.url).origin;
  return /(^|\.)rothmediaco\.com$/.test(new URL(origin).hostname) || /localhost/.test(origin) ? origin : "https://rothmediaco.com";
};

// Studio → Money → Quotes. Nothing here messages the client: create returns
// the link and the words, and Brandon sends it himself.
//   list · settings {rate, blocks, removed} · create {quote} · void {id} · delete {id}
export async function POST(request) {
  if (!(await isAdminRequest())) return bad("Not authorized", 403);
  if (!adminConfigured) return bad("Not set up", 503);
  const db = supabaseAdmin();
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === "list") return NextResponse.json({ ok: true, quotes: await listQuotes(db), settings: await getQuoteSettings(db) });
    if (body.action === "settings") return NextResponse.json({ ok: true, settings: await saveQuoteSettings(db, body) });
    if (body.action === "credits") return NextResponse.json({ ok: true, credits: await creditsFor(db, body.email) });
    if (body.action === "create") {
      const q = cleanQuote(body.quote || {});
      const problem = quoteProblem(q);
      if (problem) return bad(problem);
      const saved = await createQuote(db, q);
      const url = `${siteOf(request)}/q/${saved.token}`;
      return NextResponse.json({ ok: true, quote: saved, url, copy: quoteSendCopy(saved, url), quotes: await listQuotes(db) });
    }
    if (body.action === "void" || body.action === "delete") {
      if (!body.id) return bad("Which quote?");
      await patchQuote(db, body.id, { status: body.action === "void" ? "void" : "deleted" });
      return NextResponse.json({ ok: true, quotes: await listQuotes(db) });
    }
    return bad("Unknown action", 400);
  } catch (e) {
    return bad(e.message || "Something went wrong", 500);
  }
}
