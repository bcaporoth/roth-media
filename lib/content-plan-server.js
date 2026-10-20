// Content plan — server side: where it's stored (brand_palettes.
// brandon_notes._plan, see lib/content-plan.js), and the Claude call that
// drafts one from the client's brand palette, their business brief and
// Brandon's direction. Brandon always edits and publishes; nothing Claude
// writes reaches a client on its own.

import Anthropic from "@anthropic-ai/sdk";
import { SECTIONS, fieldsFor } from "./brand";
import { latestBrief } from "./intake";
import { cleanPlan, cleanCounts, publicPlan } from "./content-plan";

export const aiConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
const MODEL = "claude-opus-5-5";

// ── Storage ─────────────────────────────────────────────────────────
export async function loadPlanState(db, clientId) {
  const { data, error } = await db.from("brand_palettes").select("brandon_notes").eq("client_id", clientId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return data.brandon_notes?._plan || {};
}

export async function savePlanState(db, clientId, patch) {
  const { data: row, error } = await db.from("brand_palettes").select("brandon_notes").eq("client_id", clientId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("No brand palette yet");
  const notes = row.brandon_notes || {};
  const next = { ...(notes._plan || {}), ...patch };
  const { error: upErr } = await db.from("brand_palettes").update({ brandon_notes: { ...notes, _plan: next } }).eq("client_id", clientId);
  if (upErr) throw new Error(upErr.message);
  return next;
}

// The portal's read: only the published plan, without Studio-only parts.
export async function loadPublishedPlan(db, clientId) {
  try {
    const { data } = await db.from("brand_palettes").select("plan:brandon_notes->_plan->published, at:brandon_notes->_plan->published_at").eq("client_id", clientId).maybeSingle();
    if (!data?.plan) return null;
    const plan = publicPlan(data.plan);
    return plan.items.length ? { ...plan, published_at: data.at || null } : null;
  } catch {
    return null;
  }
}

// ── What Claude reads ───────────────────────────────────────────────
function fmt(field, v) {
  if (v == null || v === "") return "";
  if (field.kind === "choice") return field.optionLabels?.[v] || String(v);
  if (field.kind === "chips") return Array.isArray(v) ? v.join(", ") : "";
  if (field.kind === "sliders") return Object.entries(v || {}).map(([k, n]) => `${k.replace("|", " (1) to ")} (5): ${n}`).join("; ");
  if (field.kind === "colors") return (Array.isArray(v) ? v : []).map((c) => `${c.name || c.role} ${c.hex}`).join(", ");
  if (field.kind === "fonts") return [v.headline && `headline ${v.headline}`, v.body && `body ${v.body}`].filter(Boolean).join(", ");
  if (field.kind === "checklist") return Object.keys(v || {}).filter((k) => v[k]).join(", ");
  if (field.kind === "assets") return "";
  return String(v).trim();
}

export function brandText(data = {}, notes = {}) {
  const out = [];
  for (const s of SECTIONS) {
    const lines = [];
    for (const f of fieldsFor(s, data)) {
      const v = fmt(f, data?.[s.key]?.[f.id]);
      if (v) lines.push(`- ${f.label}: ${v}`);
    }
    const note = typeof notes?.[s.key] === "string" ? notes[s.key].trim() : "";
    if (note) lines.push(`- Brandon's note: ${note}`);
    if (lines.length) out.push(`${s.title}\n${lines.join("\n")}`);
  }
  return out.join("\n\n");
}

export async function briefText(db, email) {
  if (!email) return "";
  const { data } = await db.from("submissions").select("id, created_at, updated_at, kind, fields, utm").eq("kind", "intake").eq("email", email.toLowerCase()).order("created_at", { ascending: false }).limit(3);
  const b = latestBrief(data || []);
  return b ? Object.entries(b.answers).map(([q, a]) => `- ${q}: ${a}`).join("\n") : "";
}

// ── The call ────────────────────────────────────────────────────────
const SYSTEM = `You draft content plans for Roth Media, a one-person video and photo business run by Brandon. He films short vertical reels, promo videos and photo sets for local businesses. The plan you write is a first draft: Brandon edits it, then the business owner reads it in their client portal.

How to write it:
- Plain, specific and concrete. Short sentences. Describe what gets filmed and how it is cut.
- No praise, hype, slogans, taglines, emojis or exclamation marks. Don't flatter the business.
- Don't put words in anyone's mouth: no scripted lines, testimonials or quotes for Brandon, the owner, staff or customers.
- Use only the facts you are given. Never invent names, prices, dates, events, products, services or hours. When the plan needs a fact you don't have, plan around it and add a question.
- Follow how the owner wants to show up on camera (talking, just working, voice-over, faceless) and how comfortable they are. If they only want faceless content, no item has them talking to camera.
- Customers, congregants and children appear only with permission; say so in needs when an item films people. At a place of worship, don't plan filming during a service or a sacred moment unless the direction says it's allowed.

Each item:
- kind: reel (15-45 seconds, vertical, one clear idea, filmable in one visit), promo (30-90 seconds, the overview piece), photos (a photo set, say what it's for) or other.
- title: a short plain label, not a slogan.
- idea: two to four sentences on what the piece shows and why it's useful to this business.
- hook: what is on screen in the first two seconds. Describe the shot; any on-screen text must be a plain fact you were given.
- shots: four to eight concrete shots in order.
- on_camera: who is on camera and how, or "Nobody — hands, product and the place".
- length: e.g. "20-30 sec".
- when: when to film or post it, tied to their season or calendar when you know it (use today's date), otherwise "First shoot" or similar.
Make the items clearly different from each other: process, people, the place, an offer or event, a before/after, a day in the life.

Also write:
- intro: one or two factual sentences on what this plan contains and who it's for, e.g. "Four reels and one promo video for <business>, filmed at the shop." Don't name Brandon or write "I". Mention there's no charge only if the direction says it's free.
- needs: two to six concrete things Brandon needs from them (access times, permission, a person, a product ready).
- questions: three to eight things Brandon should ask before filming. These stay with Brandon.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["intro", "items", "needs", "questions"],
  properties: {
    intro: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "title", "idea", "hook", "shots", "on_camera", "length", "when"],
        properties: {
          kind: { type: "string", enum: ["reel", "promo", "photos", "other"] },
          title: { type: "string" },
          idea: { type: "string" },
          hook: { type: "string" },
          shots: { type: "array", items: { type: "string" } },
          on_camera: { type: "string" },
          length: { type: "string" },
          when: { type: "string" },
        },
      },
    },
    needs: { type: "array", items: { type: "string" } },
    questions: { type: "array", items: { type: "string" } },
  },
};

const today = () => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date());

export async function draftPlan(db, { client, palette, direction, counts, free }) {
  if (!aiConfigured) throw new Error("Claude isn't set up on this server — add ANTHROPIC_API_KEY.");
  const c = cleanCounts(counts);
  const want = [c.reel && `${c.reel} reel${c.reel === 1 ? "" : "s"}`, c.promo && `${c.promo} promo video${c.promo === 1 ? "" : "s"}`, c.photos && `${c.photos} photo set${c.photos === 1 ? "" : "s"}`].filter(Boolean).join(", ");
  if (!want) throw new Error("Ask for at least one reel, promo or photo set.");
  const brand = brandText(palette?.data || {}, palette?.brandon_notes || {});
  const brief = await briefText(db, client.email);

  const user = [
    `Today is ${today()}.`,
    `<client>${client.name || "(no name yet)"}</client>`,
    `<items_wanted>${want} — in that order, reels first.</items_wanted>`,
    `<price>${free ? "Free. Brandon is making these at no charge." : "Not free; leave price out of the intro."}</price>`,
    `<direction from="Brandon">\n${String(direction || "").trim() || "(none)"}\n</direction>`,
    `<brand_palette filled_in_by="the client and Brandon">\n${brand || "(nothing filled in yet)"}\n</brand_palette>`,
    `<business_brief filled_in_by="the client">\n${brief || "(none)"}\n</business_brief>`,
  ].join("\n\n");

  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: "https://api.anthropic.com" });
  let res;
  try {
    res = await ai.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
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
  if (res.stop_reason === "refusal") throw new Error("Claude declined to draft this one. Try rewording the direction.");
  if (res.stop_reason === "max_tokens") throw new Error("The draft ran too long. Ask for fewer items.");
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error("Claude's draft came back unreadable. Try again."); }
  // Kinds follow what was asked for, in order (reels, then promos, then
  // photo sets) — the model sometimes labels the promo a reel.
  const kinds = [...Array(c.reel).fill("reel"), ...Array(c.promo).fill("promo"), ...Array(c.photos).fill("photos")];
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  if (items.length === kinds.length) items.forEach((it, i) => { it.kind = kinds[i]; });
  const plan = cleanPlan({ ...parsed, items, price: free ? "No charge" : "" });
  return { plan, model: res.model, usage: res.usage };
}
