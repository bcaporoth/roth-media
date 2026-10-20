// Shoot days + scripts — server side: who may open a day (Brandon, or the
// client it belongs to), loading a day with its scripts, and the Claude call
// that drafts one detailed script from the kind, the idea, the client's
// brand palette and their brief.

import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServer, portalConfigured } from "./supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "./supabase-admin";
import { brandText, briefText } from "./content-plan-server";
import { cleanBody, KIND_LABEL, isUuid } from "./scripts";

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
