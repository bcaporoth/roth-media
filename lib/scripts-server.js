// Shoot days + scripts — server side: who may open a day (Brandon, or the
// client it belongs to), loading a day with its scripts, and the Claude call
// that drafts one detailed script from the kind, the idea, the client's
// brand palette and their brief.

import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServer, portalConfigured } from "./supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "./supabase-admin";
import { brandText, briefText } from "./content-plan-server";
import { cleanBody, KIND_LABEL, isUuid, scriptFromPlanItem, dayWindow, fmt12 } from "./scripts";
import { loadPlanState } from "./content-plan-server";
import { sendEmail, resendConfigured } from "./resend";
import { wrapHtml, firstName } from "./client-email";

export const aiConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
const MODEL = "claude-opus-5-5";

// Who is asking: { role: 'brandon' | 'client', email, clientId? } or null.
export async function whoAmI() {
  if (!portalConfigured || !adminConfigured) return null;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const email = user.email.toLowerCase();
  if (email === ADMIN_EMAIL) return { role: "brandon", email };
  const { data: client } = await supabaseAdmin().from("clients").select("id").eq("email", email).maybeSingle();
  return client ? { role: "client", email, clientId: client.id } : null;
}

// Every day this person may open. Brandon: any; a client: their own.
export function canOpen(me, day) {
  if (!me || !day) return false;
  return me.role === "brandon" || me.clientId === day.client_id;
}

export async function loadDay(db, dayId) {
  if (!isUuid(dayId)) return null;
  const { data: day, error } = await db.from("shoot_days").select("*, clients!client_id(id, name, email)").eq("id", dayId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!day) return null;
  const { data: scripts, error: e2 } = await db.from("scripts").select("*").eq("day_id", dayId).order("position", { ascending: true }).order("created_at", { ascending: true });
  if (e2) throw new Error(e2.message);
  return { ...day, client: day.clients, clients: undefined, scripts: scripts || [] };
}

export async function listDays(db, clientId) {
  const { data, error } = await db.from("shoot_days").select("id, title, date, start_time, status, updated_at").eq("client_id", clientId).order("date", { ascending: false, nullsFirst: true }).order("created_at", { ascending: false });
  if (error) {
    // Table not created yet → the card says so instead of the page failing.
    if (/shoot_days/.test(error.message)) return null;
    throw new Error(error.message);
  }
  const days = data || [];
  if (!days.length) return [];
  const { data: counts } = await db.from("scripts").select("day_id, status").in("day_id", days.map((d) => d.id));
  const by = {};
  for (const c of counts || []) { by[c.day_id] = by[c.day_id] || { n: 0, ready: 0 }; by[c.day_id].n += 1; if (c.status !== "draft") by[c.day_id].ready += 1; }
  return days.map((d) => ({ ...d, scripts: by[d.id]?.n || 0, ready: by[d.id]?.ready || 0 }));
}

// ── Claude drafts one script ─────────────────────────────────────────
const SYSTEM = `You write filming scripts for Roth Media, a one-person video and photo business run by Brandon in the Twin Tiers (Sayre PA / Waverly NY). He films short vertical content for local businesses, usually with the owner on camera. A script you write is shared between Brandon and the business owner: both read it, both edit it, and on the day they film straight from it. So it must be detailed enough that nobody has to ask "what do I say next?" or "what are you pointing the camera at?".

Write in plain, spoken American English. Short sentences. Nothing corporate, no marketing filler, no emoji. The owner's lines should sound like a real person talking to a friend across the counter — contractions, specifics, no "we are passionate about".

The output is JSON matching the schema. Rules per field:
- goal: one sentence — what this piece is for (trust, proof, craving, teaching, selling one thing).
- hook: the exact first words or the first thing on screen. For a reel it must land in under 2 seconds. Give the words, not a description of them.
- on_camera: who is on camera and who is behind it.
- where: the spot in the business, the light, the time of day if it matters.
- length: the finished length, e.g. "30–45s" or "3–4 min".
- needs: everything to have ready before the camera rolls. For a recipe: every ingredient WITH AMOUNTS, plus the tools and the oven temperature. For a walk-through or how-to: every part, tool, product, and page of the manual involved. For a reel: props, outfits, people.
- steps: the heart of it. Numbered in filming order. Each step has: "say" — the exact words spoken on camera (or "(no talking)"); "do" — the physical action in that moment, specific (quantities, temperatures, which hand, which button); "shot" — what the camera shows: framing (wide / medium / close / over-the-shoulder / top-down), angle, movement, and lens or phone note when useful; "secs" — how long that step should be on screen in the finished piece. A recipe or how-to walks through EVERY step of making the thing, in order, nothing skipped, with the numbers; add a step for the finished reveal. A reel has 4–10 tight beats. A walk-through of instructions follows the manual's order exactly and says where a viewer tends to go wrong.
- broll: extra shots to grab that aren't tied to one step (hands, textures, signage, the street outside, customers).
- cta: the closing line — one ask.
- caption: the post caption, 1–3 lines, with the one hashtag set that fits.
- notes: anything else the two of them should know — safety, timing, what to shoot first while the light is good, what can be faked for camera.

Use the business's own names for things, from the brand palette and brief. Never invent prices, awards or claims. If an idea is thin, make reasonable choices and say so in notes rather than asking questions.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "goal", "hook", "on_camera", "where", "length", "needs", "steps", "broll", "cta", "caption", "notes"],
  properties: {
    title: { type: "string" },
    goal: { type: "string" },
    hook: { type: "string" },
    on_camera: { type: "string" },
    where: { type: "string" },
    length: { type: "string" },
    needs: { type: "array", items: { type: "string" } },
    steps: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["say", "do", "shot", "secs"], properties: { say: { type: "string" }, do: { type: "string" }, shot: { type: "string" }, secs: { type: "integer" } } },
    },
    broll: { type: "array", items: { type: "string" } },
    cta: { type: "string" },
    caption: { type: "string" },
    notes: { type: "string" },
  },
};

const today = () => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date());

export async function draftScript(db, { client, kind, title, idea, current, thread }) {
  if (!aiConfigured) throw new Error("Claude isn't set up on this server — add ANTHROPIC_API_KEY.");
  const { data: palette } = await db.from("brand_palettes").select("data, brandon_notes").eq("client_id", client.id).maybeSingle();
  const brand = brandText(palette?.data || {}, palette?.brandon_notes || {});
  const brief = await briefText(db, client.email);
  const cur = current && (current.steps?.length || current.goal || current.hook) ? JSON.stringify(cleanBody(current)) : "";
  const notes = (thread || []).slice(-12).map((t) => `${t.who === "brandon" ? "Brandon" : client.name || "the owner"}: ${t.text}`).join("\n");

  const user = [
    `Today is ${today()}.`,
    `<business>${client.name || "(no name yet)"}</business>`,
    `<kind>${KIND_LABEL[kind] || "Reel"}</kind>`,
    `<title>${title || "(untitled — pick one)"}</title>`,
    `<idea>\n${String(idea || "").trim() || "(none given — build it from the brand and brief)"}\n</idea>`,
    cur ? `<current_script note="rewrite this, keeping what's good, filling what's thin">\n${cur}\n</current_script>` : "",
    notes ? `<notes_between_brandon_and_owner>\n${notes}\n</notes_between_brandon_and_owner>` : "",
    `<brand_palette>\n${brand || "(nothing filled in yet)"}\n</brand_palette>`,
    `<business_brief filled_in_by="the owner">\n${brief || "(none)"}\n</business_brief>`,
  ].filter(Boolean).join("\n\n");

  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: "https://api.anthropic.com" });
  let res;
  try {
    res = await ai.beta.messages.create({
      model: MODEL,
      max_tokens: 12000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error("Claude rejected the API key (ANTHROPIC_API_KEY).");
    if (err instanceof Anthropic.RateLimitError) throw new Error("Claude is busy or out of credits — try again in a minute.");
    if (err instanceof Anthropic.APIError) throw new Error(`Claude error ${err.status ?? ""}: ${err.message}`);
    throw err;
  }
  if (res.stop_reason === "refusal") throw new Error("Claude declined to draft this one. Try rewording the idea.");
  if (res.stop_reason === "max_tokens") throw new Error("The draft ran too long. Narrow the idea and try again.");
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error("Claude's draft came back unreadable. Try again."); }
  const { title: t, ...body } = parsed;
  return { title: String(t || title || "").slice(0, 140), body: cleanBody(body), model: res.model };
}


// ── Claude plans a whole day ─────────────────────────────────────────
// One call, every script: the theme Brandon gives, how many of each kind,
// ordered sensibly for a filming day (what needs the oven or the morning
// light first; the owner talking to camera after they've warmed up).
const DAY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["day_notes", "scripts"],
  properties: {
    day_notes: { type: "string" },
    scripts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "minutes", ...SCHEMA.required],
        properties: { kind: { type: "string", enum: Object.keys(KIND_LABEL).filter((k) => k !== "tchart" && k !== "questions") }, minutes: { type: "integer" }, ...SCHEMA.properties },
      },
    },
  },
};

export async function draftDay(db, { client, theme, counts, existing, day }) {
  if (!aiConfigured) throw new Error("Claude isn't set up on this server — add ANTHROPIC_API_KEY.");
  const want = Object.entries(counts || {}).filter(([k, n]) => KIND_LABEL[k] && n > 0).map(([k, n]) => `${n} × ${KIND_LABEL[k]}`).join(", ");
  if (!want) throw new Error("Ask for at least one script.");
  const { data: palette } = await db.from("brand_palettes").select("data, brandon_notes").eq("client_id", client.id).maybeSingle();
  const brand = brandText(palette?.data || {}, palette?.brandon_notes || {});
  const brief = await briefText(db, client.email);
  const have = (existing || []).map((s) => `- ${KIND_LABEL[s.kind]}: ${s.title || "(untitled)"}`).join("\n");
  const user = [
    `Today is ${today()}.`,
    `<business>${client.name || "(no name yet)"}</business>`,
    `<scripts_wanted>${want} — one filming day. Order them for the day: anything that needs the oven, the morning light or an empty shop first; the owner's talk-to-camera pieces once they've warmed up; the quick reels and photo set in the gaps. Each one clearly different from the others.</scripts_wanted>`,
    `<theme from="Brandon">\n${String(theme || "").trim() || "(none — build the day from the brand and brief)"}\n</theme>`,
    have ? `<already_on_this_day note="don't repeat these">\n${have}\n</already_on_this_day>` : "",
    (() => { const w = dayWindow(day || {}, existing || []); return w.available !== null ? `<time_budget>Filming runs ${fmt12(day.start_time)} to ${fmt12(day.end_time)} — ${w.available} minutes in total, ${Math.max(0, w.available - w.total)} still free after what's already planned. The new scripts' "minutes" must add up to fit inside that, with a little slack for resets and lunch.</time_budget>` : ""; })(),
    `<brand_palette>\n${brand || "(nothing filled in yet)"}\n</brand_palette>`,
    `<business_brief filled_in_by="the owner">\n${brief || "(none)"}\n</business_brief>`,
    `Also write day_notes: three to six plain lines for the two of them about running this day — what to shoot first and why, what to have prepped before the camera arrives, where the light is good, what to avoid. "minutes" is how long filming each script takes, realistically, including resets.`,
  ].filter(Boolean).join("\n\n");

  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: "https://api.anthropic.com" });
  let res;
  try {
    res = await ai.beta.messages.create({
      model: MODEL,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: { type: "json_schema", schema: DAY_SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error("Claude rejected the API key (ANTHROPIC_API_KEY).");
    if (err instanceof Anthropic.RateLimitError) throw new Error("Claude is busy or out of credits — try again in a minute.");
    if (err instanceof Anthropic.APIError) throw new Error(`Claude error ${err.status ?? ""}: ${err.message}`);
    throw err;
  }
  if (res.stop_reason === "refusal") throw new Error("Claude declined to plan this one. Try rewording the theme.");
  if (res.stop_reason === "max_tokens") throw new Error("The plan ran too long. Ask for fewer scripts at once.");
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error("Claude's plan came back unreadable. Try again."); }
  const scripts = (Array.isArray(parsed.scripts) ? parsed.scripts : []).slice(0, 20).map((sc) => {
    const { kind, minutes, title, ...body } = sc;
    return { kind: KIND_LABEL[kind] ? kind : "reel", minutes: Math.max(5, Math.min(600, Math.round(Number(minutes) || 20))), title: String(title || "").slice(0, 140), body: cleanBody(body) };
  });
  return { scripts, dayNotes: String(parsed.day_notes || "").slice(0, 4000), model: res.model };
}

// The client's content plan (published, else the draft) as starting scripts.
export async function planItemsFor(db, clientId) {
  const state = (await loadPlanState(db, clientId).catch(() => null)) || {};
  const plan = state.published || state.draft;
  return (plan?.items || []).map((it) => ({ id: it.id, label: `${it.title || "(untitled)"} — ${it.kind}`, script: scriptFromPlanItem(it) }));
}

// "Have a look": emails the owner a button that opens the day in their portal.
export async function sendDayEmail({ day, note }) {
  if (!resendConfigured) throw new Error("Email isn't set up on this server (RESEND_API_KEY).");
  const c = day.client || {};
  if (!c.email || /@no-email\.rothmediaco\.invalid$/.test(c.email)) throw new Error("They have no email on file yet — add one on their profile first.");
  const link = `https://rothmediaco.com/portal/days/${day.id}`;
  const when = day.date ? new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "";
  const n = (day.scripts || []).length;
  const body = [
    `Hi ${firstName(c.name, c.email)},`,
    `The plan for "${day.title}"${when ? ` on ${when}` : ""} is up — ${n} script${n === 1 ? "" : "s"} for the day: what we film, what you say, what the camera sees.`,
    String(note || "").trim(),
    "Read it through and change anything — add a line, swap an idea, leave me a note on any script. I see every edit, and we film from whatever it says on the day.",
  ].filter(Boolean).join("\n\n");
  const html = wrapHtml({ body, cta: [{ lead: "Sign in with your email and password and it opens right up.", label: "Open the shoot day", href: link }], signoff: "— Brandon" });
  const text = `${body}\n\n${link}\n\n— Brandon`;
  await sendEmail({ to: c.email, cc: [ADMIN_EMAIL], subject: `Our shoot day plan — ${day.title}`, html, text });
  return { to: c.email };
}
