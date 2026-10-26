// Sprint 5 — server helpers for the client machinery.
// draftUpdate(): a Friday status update written from the data, for Brandon
// to edit before it goes to the portal (and, if he says so, to email).
const fmt = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "a date to be set");
const short = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD");

export async function draftUpdate(db, projectId) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const weekAgo = new Date(Date.now() - 7 * 864e5).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const twoWeeks = new Date(Date.now() + 14 * 864e5).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const soft = (q) => q.then((r) => r.data || [], () => []);
  const [{ data: project }, shoots, people, tasks, approvals, payments, reviews] = await Promise.all([
    db.from("projects").select("title, phase, milestones, client_name").eq("id", projectId).maybeSingle(),
    soft(db.from("shoots").select("title, date, status, client_visible").eq("project_id", projectId)),
    soft(db.from("project_people").select("name, status, kind, shoot_id").eq("project_id", projectId).eq("kind", "interview")),
    soft(db.from("client_tasks").select("title, due, done_at").eq("project_id", projectId)),
    soft(db.from("approvals").select("label, status").eq("project_id", projectId).eq("status", "pending")),
    soft(db.from("payments").select("label, amount_cents, due, status").eq("project_id", projectId)),
    soft(db.from("review_versions").select("label, status, client_visible").eq("project_id", projectId).eq("status", "open").eq("client_visible", true)),
  ]);
  const vis = shoots.filter((s) => s.client_visible !== false && s.status !== "cancelled");
  const filmed = vis.filter((s) => s.date && s.date >= weekAgo && s.date <= today);
  const coming = vis.filter((s) => s.date && s.date > today && s.date <= twoWeeks).sort((a, b) => a.date.localeCompare(b.date));
  const ms = (project?.milestones || []).filter((m) => m.client_visible !== false);
  const nextMs = ms.find((m) => !m.done);
  const open = tasks.filter((t) => !t.done_at);
  const due = payments.filter((p) => ["invoiced", "late"].includes(p.status));
  const first = (project?.client_name || "").split(" ")[0];
  const lines = [];
  lines.push(`${first ? `Hi ${first} —` : "Hi —"} here's where ${project?.title || "the film"} stands this week.`);
  lines.push("");
  if (filmed.length) lines.push(`This week we filmed: ${filmed.map((s) => `${s.title} (${short(s.date)})`).join(", ")}.`);
  const done = people.filter((p) => ["interviewed", "done"].includes(p.status)).length;
  if (people.length) lines.push(`Interviews: ${done} of ${people.length} done.`);
  if (coming.length) lines.push(`Coming up: ${coming.map((s) => `${s.title} on ${fmt(s.date)}`).join("; ")}.`);
  if (reviews.length) lines.push(`There's a cut waiting for your notes in the portal: ${reviews.map((r) => r.label).join(", ")}.`);
  if (nextMs) lines.push(`Next milestone: ${nextMs.label}${nextMs.date ? ` — ${fmt(nextMs.date)}` : ""}.`);
  lines.push("");
  if (open.length || approvals.length || due.length) {
    lines.push("What I need from you:");
    for (const a of approvals) lines.push(`• Sign off on: ${a.label} (in the portal)`);
    for (const t of open) lines.push(`• ${t.title}${t.due ? ` — by ${short(t.due)}` : ""}`);
    for (const p of due) lines.push(`• ${p.label}: $${(p.amount_cents / 100).toLocaleString()}${p.due ? ` — due ${short(p.due)}` : ""}`);
    lines.push("");
  }
  lines.push("Anything you're hearing from the parish that I should know? Reply here or text me.");
  return lines.join("\n");
}
