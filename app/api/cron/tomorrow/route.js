import { NextResponse } from "next/server";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { resendConfigured, sendEmail } from "../../../../lib/resend";
import { LEAD_ALERT_TO } from "../../../../lib/studio-emails";
import { wrapHtml } from "../../../../lib/client-email";
import { timing, fmt12 } from "../../../../lib/sun";
import { mapsUrl } from "../../../../lib/geo";
import { GROUP_LABEL } from "../../../../lib/shoot-guides";

export const dynamic = "force-dynamic";

// Every evening (vercel.json): the night-before email for tomorrow's shoots
// — leave time, sunset, address with directions, who to text, the gear to
// pack, the flow, and (business) the shoot day with its scripts. No shoot
// tomorrow = no email.
const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (!adminConfigured) return NextResponse.json({ ok: false, reason: "not configured" });
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const db = supabaseAdmin();
  const tomorrow = dayKey(new Date(Date.now() + 86400000));
  const { data: shoots, error } = await db.from("shoots").select("*").eq("date", tomorrow).neq("status", "cancelled").order("start_time", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!shoots?.length) return NextResponse.json({ ok: true, tomorrow, shoots: 0, sent: false });

  const blocks = [];
  for (const s of shoots) {
    const t = timing(s);
    const lines = [`${s.title.toUpperCase()}${s.client_name ? ` — ${s.client_name}` : ""}`];
    lines.push(`Start ${t.start ? fmt12(t.start) : "TBD"}${t.leave ? ` · leave home ${fmt12(t.leave)}` : ""}${s.drive_min ? ` (${s.drive_min} min drive)` : ""}`);
    if (t.sunset) lines.push(`Sunset ${fmt12(t.sunset)} · golden hour from ${t.golden ? fmt12(t.golden) : "—"}`);
    if (s.address) lines.push(`${s.address}\nDirections: ${mapsUrl(s.address, s.lat, s.lng)}`);
    if (s.client_phone) lines.push(`Text ${s.client_name.split(" ")[0] || "the client"}: ${s.client_phone}`);
    const list = Array.isArray(s.checklist) ? s.checklist : [];
    for (const g of ["gear", "flow", "camera", "shots"]) {
      const items = list.filter((c) => c.group === g && !c.done);
      if (items.length) lines.push(`${GROUP_LABEL[g]} (${items.length}):\n` + items.slice(0, 25).map((c) => `  ☐ ${c.time ? `${fmt12(c.time)} ` : ""}${c.text}`).join("\n") + (items.length > 25 ? `\n  + ${items.length - 25} more` : ""));
    }
    // A business shoot day hanging off this shoot: the scripts.
    try {
      const { data: day } = await db.from("shoot_days").select("id, title, client_id").eq("shoot_id", s.id).maybeSingle();
      if (day) {
        const { data: scripts } = await db.from("scripts").select("title, kind, status, minutes").eq("day_id", day.id).order("position", { ascending: true });
        lines.push(`${day.title} — ${(scripts || []).length} script${(scripts || []).length === 1 ? "" : "s"}, ${(scripts || []).filter((x) => x.status !== "draft").length} ready:\n` + (scripts || []).map((x) => `  • ${x.title || x.kind} (${x.minutes}m, ${x.status})`).join("\n") + `\nFilm mode: https://rothmediaco.com/portal/admin/clients/${day.client_id}/days/${day.id}`);
      }
    } catch {}
    if (s.crew_token) lines.push(`Call sheet${s.callsheet?.version ? ` v${s.callsheet.version}` : " (not issued yet)"}: https://rothmediaco.com/call/${s.crew_token}`);
    lines.push(`Prep sheet: https://rothmediaco.com/portal/admin/shoots/print?id=${s.id}`);
    blocks.push(lines.join("\n"));
  }
  const body = [`Tomorrow, ${new Date(tomorrow + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}: ${shoots.length} shoot${shoots.length === 1 ? "" : "s"}. Charge batteries, format cards, pack tonight.`, ...blocks].join("\n\n");
  const subject = `Tomorrow: ${shoots.map((s) => s.title).join(" · ").slice(0, 90)}`;
  let sent = false;
  if (!dry && resendConfigured) {
    try { await sendEmail({ to: LEAD_ALERT_TO, subject, text: body, html: wrapHtml({ body, cta: { label: "Open Shoots", href: "https://rothmediaco.com/portal/admin/shoots" } }) }); sent = true; } catch {}
  }
  return NextResponse.json({ ok: true, tomorrow, shoots: shoots.length, sent, ...(dry ? { body } : {}) });
}
