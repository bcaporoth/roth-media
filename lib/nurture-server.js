// Server side of the follow-up emails (lib/nurture.js). No table of its own:
// everything is append-only rows in site_events.
//   name "nurture_words"  data = { words }                       (latest row wins)
//   name "nurture"        data = { a, set, email, name?, start?, step?, due? }
//     a: start · sent · skip · unskip · move · stop · remove

import { ADMIN_EMAIL } from "./supabase-admin";
import { resendConfigured, sendEmail } from "./resend";
import { wrapHtml, unsubscribeUrl } from "./client-email";
import { isNoEmail } from "./no-email";
import { NURTURE_SETS, buildPeople, cleanWords, fillWords, isDay, todayKey } from "./nurture";

const EVENT = "nurture";
const WORDS = "nurture_words";

export async function loadWords(db) {
  const { data } = await db.from("site_events").select("data").eq("name", WORDS).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return cleanWords(data?.data?.words);
}

export async function saveWords(db, words) {
  const clean = cleanWords(words);
  const { error } = await db.from("site_events").insert({ type: "event", name: WORDS, path: "/nurture", data: { words: clean } });
  if (error) throw new Error(error.message);
  return clean;
}

export async function loadPeople(db) {
  const { data, error } = await db.from("site_events").select("created_at, data").eq("name", EVENT).order("created_at", { ascending: true }).limit(5000);
  if (error) throw new Error(error.message);
  const people = buildPeople(data);
  // Who turned emails off: shown on their row, and Send is refused.
  const emails = [...new Set(people.map((p) => p.email))];
  if (emails.length) {
    const { data: cl } = await db.from("clients").select("id, email, email_opt_out").in("email", emails).then((r) => r, () => ({ data: [] }));
    const by = new Map((cl || []).map((c) => [String(c.email).toLowerCase(), c]));
    for (const p of people) {
      const c = by.get(p.email);
      p.optedOut = Boolean(c?.email_opt_out);
      p.clientId = c?.id || "";
    }
  }
  return people;
}

// People to pick from when adding someone: recent inquiries and every client.
export async function loadPicks(db) {
  const since = new Date(Date.now() - 120 * 86400000).toISOString();
  const [subs, clients] = await Promise.all([
    db.from("submissions").select("name, email, created_at").in("kind", ["quote", "home", "card", "walkin", "intake"]).gte("created_at", since).order("created_at", { ascending: false }).limit(300),
    db.from("clients").select("name, email").order("created_at", { ascending: false }).limit(500).then((r) => r, () => ({ data: [] })),
  ]);
  const seen = new Set();
  const out = [];
  for (const r of [...(clients.data || []), ...(subs.data || [])]) {
    const email = String(r.email || "").toLowerCase();
    if (!email || isNoEmail(email) || seen.has(email)) continue;
    seen.add(email);
    out.push({ name: String(r.name || ""), email });
  }
  return out;
}

const log = async (db, data) => {
  const { error } = await db.from("site_events").insert({ type: "event", name: EVENT, path: `/nurture/${data.set}`, data });
  if (error) throw new Error(error.message);
};

const who = (body) => {
  const set = NURTURE_SETS.some((s) => s.key === body.set) ? body.set : "";
  const email = String(body.email || "").trim().toLowerCase();
  if (!set) throw new Error("Pick which set of emails.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || isNoEmail(email)) throw new Error("That email doesn't look right.");
  return { set, email };
};

export async function startPerson(db, body) {
  const { set, email } = who(body);
  const people = await loadPeople(db);
  if (people.some((p) => p.set === set && p.email === email)) throw new Error("They are already on that set.");
  await log(db, { a: "start", set, email, name: String(body.name || "").trim().slice(0, 120), start: isDay(body.start) ? body.start : todayKey() });
}

// skip · unskip · move · stop · remove
export async function markPerson(db, body) {
  const { set, email } = who(body);
  const a = String(body.action || "");
  const step = Number(body.step);
  if (["skip", "unskip", "move"].includes(a) && ![0, 1, 2].includes(step)) throw new Error("Which email?");
  if (a === "move" && !isDay(body.due)) throw new Error("Pick a date.");
  await log(db, { a, set, email, ...(a === "stop" || a === "remove" ? {} : { step }), ...(a === "move" ? { due: body.due } : {}) });
}

// The one place a follow-up email leaves: Brandon tapped Send for this
// person and this email. Refused if they turned emails off, if the words are
// empty, or if it already went.
export async function sendStep(db, body) {
  const { set, email } = who(body);
  const step = Number(body.step);
  const [people, words] = await Promise.all([loadPeople(db), loadWords(db)]);
  const p = people.find((x) => x.set === set && x.email === email);
  if (!p) throw new Error("They aren't on that set any more.");
  if (p.stopped) throw new Error("Their follow-ups are stopped.");
  const st = p.steps[step];
  if (!st) throw new Error("Which email?");
  if (st.sentAt) throw new Error("That one already went.");
  if (p.optedOut) throw new Error("They turned emails off, so this can't send.");
  const w = words[set][step];
  if (!w.subject || !w.body) throw new Error("Write this email's subject and words first.");
  if (!resendConfigured) throw new Error("Email isn't set up on this server (RESEND_API_KEY).");
  const { data: client } = await db.from("clients").select("unsubscribe_token").eq("email", email).maybeSingle().then((r) => r, () => ({ data: null }));
  const unsubscribe = unsubscribeUrl(client);
  const text = fillWords(w.body, p);
  await sendEmail({
    to: email,
    cc: [ADMIN_EMAIL],
    subject: fillWords(w.subject, p),
    html: wrapHtml({ body: text, unsubscribe }),
    text: `${text}${unsubscribe ? `\n\nDon't want emails from Roth Media? Unsubscribe: ${unsubscribe}` : ""}`,
  });
  await log(db, { a: "sent", set, email, step });
}
