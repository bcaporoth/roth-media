// Sprint 6 — the legal layer's vocabulary, the three gates, and the exports.
// Pure functions: the API cleans with these, the loader computes gates with
// these, the UI labels with these.

export const CLEARANCE_KIND_LABEL = { person: "Person", archival: "Archival", music: "Music", location: "Location", trademark: "Trademark / logo", claim: "Factual claim" };
export const CLEARANCE_STATUS_LABEL = { red: "Red — not cleared", yellow: "Yellow — in progress / conditional", green: "Green — cleared" };
export const CLEARANCE_BASIS_LABEL = { none: "No basis yet", release: "Signed release", license: "License", public_domain: "Public domain", fair_use: "Fair use (memo)", permission: "Written permission", incidental: "Incidental / de minimis", removed: "Removed from cut" };
export const MUSIC_SOURCE_LABEL = { temp: "Temp (must go)", library: "Library", composer: "Composer (work for hire)", licensed: "Licensed song", hymn: "Hymn / liturgical", pd: "Public domain" };
export const MUSIC_USAGE_LABEL = { bg: "Background", featured: "Featured", theme: "Theme", source: "Source (sung/played on camera)" };
export const LICENSE_STATUS_LABEL = { none: "Needed", na: "N/A", requested: "Requested", quoted: "Quoted", licensed: "Licensed" };
export const ARCHIVAL_KIND_LABEL = { photo: "Photo", film: "Film / video", document: "Document", audio: "Audio", newspaper: "Newspaper", map: "Map", other: "Other" };
export const ARCHIVAL_BASIS_LABEL = { unknown: "Unknown — find out", license: "License", public_domain: "Public domain", fair_use: "Fair use (memo)", materials_release: "Materials release from lender", owned: "Owned by client / us" };
export const ARCHIVAL_STATUS_LABEL = { wanted: "Wanted", in_hand: "In hand", cleared: "Cleared", rejected: "Rejected" };

// The generic legal register: one table, many kinds, each with its own
// small field list (stored in `data`) and its own status vocabulary.
export const LEGAL_KINDS = {
  contract: { label: "Contracts", statuses: ["draft", "sent", "signed", "expired"], fields: [["type", "Type", "client master · composer · crew template · vendor · transcription (no-training) · drone sub"], ["terms", "Key terms", "term, usage rights, payment, kill fee, credit"], ["signatory", "Signatory + authority", "Fr. Matthew — authority letter from diocese on file?"]] },
  permission: { label: "Permissions", statuses: ["ask", "asked", "granted", "denied"], fields: [["scope", "Scope", "interiors · during Mass · drone · clergy on camera · parish crest"], ["conditions", "Conditions", "no comms during consecration · no minors' faces"]] },
  policy: { label: "Insurance", statuses: ["quote", "bound", "in_force", "lapsed"], fields: [["type", "Policy", "GL · equipment · auto · workers comp · drone · E&O"], ["carrier", "Carrier / broker", ""], ["limits", "Limits", "$1M / $2M"], ["policy_no", "Policy #", ""]] },
  coi: { label: "COIs", statuses: ["needed", "requested", "delivered"], fields: [["holder", "Certificate holder", "Diocese of Rochester · St. Mary's Church"], ["additional_insured", "Additional insured?", "yes / no"]] },
  permit: { label: "Permits", statuses: ["needed", "applied", "granted", "denied"], fields: [["authority", "Authority", "City of Corning · NYS Parks · county"], ["permit_no", "Permit #", ""]] },
  drone: { label: "Drone flights", statuses: ["planned", "laanc", "flown", "scrubbed"], fields: [["pilot", "Pilot (Part 107 #)", ""], ["airspace", "Airspace / LAANC", "Class G · LAANC auth # …"], ["remote_id", "Remote ID", "standard / module"], ["over_people", "Over people?", "no · Cat 1–4"], ["ordinance", "Local rules checked", "NYS Parks ban · city ordinance"], ["weather", "Wx at flight", ""]] },
  safety: { label: "Safety", statuses: ["open", "done"], fields: [["type", "Type", "risk assessment · emergency card · briefing ack · incident report"], ["hazards", "Hazards", "ladders · balcony · candles · cold"], ["hospital", "Nearest ER", ""]] },
  title: { label: "Chain of title", statuses: ["needed", "in_hand", "registered"], fields: [["type", "Item", "copyright registration · assignment · WFH · license · title report"], ["holder", "Where it lives", "binder / Drive link"]] },
  fair_use: { label: "Fair-use memos", statuses: ["needed", "requested", "received"], fields: [["item", "What", "clip / photo / text relied on"], ["attorney", "Attorney", ""], ["summary", "Opinion summary", ""]] },
  defamation: { label: "Defamation review", statuses: ["open", "flagged", "resolved", "signed"], fields: [["claim", "Claim in the cut", "what is said, by whom, at TC"], ["support", "Support", "documents / second source"], ["change", "Change made", ""]] },
  credit: { label: "Credits & disclaimers", statuses: ["open", "verified"], fields: [["text", "Exact text", "Archival courtesy of … · Music by …"], ["obligation", "Required by", "license § · deal memo · lender"]] },
  revocation: { label: "Revocations", statuses: ["open", "attorney", "declined", "closed"], fields: [["person", "Who", ""], ["asked", "What they asked", "remove entirely · cut one line · blur"], ["response", "Our response", ""], ["attorney_note", "Attorney involved?", ""]] },
  minor: { label: "Minors", statuses: ["open", "released", "excluded"], fields: [["guardian", "Guardian", ""], ["on_camera", "How they appear", "crowd · named · interviewed"], ["safe_env", "Crew safe-environment training", "yes / no"]] },
};
export const LEGAL_STATUS_LABEL = { draft: "Draft", sent: "Sent", signed: "Signed", expired: "Expired", ask: "Need to ask", asked: "Asked", granted: "Granted", denied: "Denied", quote: "Quote", bound: "Bound", in_force: "In force", lapsed: "Lapsed", needed: "Needed", requested: "Requested", delivered: "Delivered", applied: "Applied", planned: "Planned", laanc: "LAANC ok", flown: "Flown", scrubbed: "Scrubbed", open: "Open", done: "Done", in_hand: "In hand", registered: "Registered", received: "Received", flagged: "Flagged", resolved: "Resolved", verified: "Verified", attorney: "With attorney", declined: "Declined", closed: "Closed", released: "Released", excluded: "Excluded" };
const GOOD = new Set(["signed", "granted", "in_force", "bound", "delivered", "flown", "done", "in_hand", "registered", "received", "resolved", "verified", "closed", "released", "excluded", "scrubbed", "declined"]);
export const isGood = (status) => GOOD.has(status);

// ── Gates ──
// Each check: { key, label, ok, detail }. `bundle` is what loadProject
// returns plus the legal tables; overrides are project.gate_overrides.
export function computeGates(b) {
  const p = b.project || {}; const s1 = b.sprint1 || {}; const s2 = b.sprint2; const s3 = b.sprint3 || {}; const s5 = b.sprint5 || {}; const L = b.sprint6 || {};
  const legal = L.legal || []; const cues = L.cues || []; const arch = L.archival || []; const clear = L.clearance || [];
  const by = (kind) => legal.filter((x) => x.kind === kind);
  const releases = b.releases || []; const people = b.people || []; const team = b.team || [];
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const upcoming = (b.days || []).filter((d) => d.date && d.date >= today).sort((a, c) => a.date.localeCompare(c.date));
  const day1 = upcoming[0];
  const interviewees = people.filter((x) => x.kind === "interview");
  const featured = interviewees.filter((x) => ["interviewed", "done"].includes(x.status));
  const hasRelease = (pid) => releases.some((r) => r.person_id === pid && ["appearance", "minor", "estate", "clergy", "verbal"].includes(r.kind));
  const policies = by("policy");
  const pol = (t) => policies.find((x) => String(x.data?.type || "").toLowerCase().includes(t));
  const live = (x) => x && ["bound", "in_force"].includes(x.status) && (!x.expires || x.expires >= today);
  const locs = (s1.locations || []).filter((l) => l.status !== "idea");
  const chk = (key, label, ok, detail = "") => ({ key, label, ok: Boolean(ok), detail });
  const A = [
    chk("a.contract", "Client agreement signed", by("contract").some((x) => /client/i.test(x.data?.type || x.title) && x.status === "signed"), "Contracts → type 'client master', status Signed"),
    chk("a.authority", "Signatory authority on file", by("contract").some((x) => /client/i.test(x.data?.type || x.title) && x.status === "signed" && (x.data?.signatory || "").trim()), "Who signed for the parish, and the diocesan threshold"),
    chk("a.permission", "Diocesan / parish written permission", by("permission").some((x) => x.status === "granted"), "Permissions → interiors, Mass, clergy, drone"),
    chk("a.gl", "General liability in force", live(pol("gl") || pol("general") || pol("liab")), "Insurance → GL"),
    chk("a.equipment", "Equipment policy in force", live(pol("equip") || pol("gear")), "Insurance → equipment"),
    chk("a.drone_policy", "Drone policy (if flying)", !by("drone").length || live(pol("drone")), "Only if there are drone flights"),
    chk("a.coi", "COIs delivered where needed", !locs.some((l) => ["needed", "requested"].includes(l.coi)) && !by("coi").some((x) => x.status !== "delivered"), "Locations with COI needed/requested, COI register"),
    chk("a.deals", "Crew deal memos signed", team.length > 0 && team.every((m) => m.deal_release_id), team.length ? `${team.filter((m) => m.deal_release_id).length}/${team.length} signed` : "No crew on the project yet"),
    chk("a.locations", "Locations cleared (permit · COI · hospital)", locs.length > 0 && locs.every((l) => !["needed", "requested"].includes(l.permit) && !["needed", "requested"].includes(l.coi) && l.hospital), `${locs.filter((l) => !["needed", "requested"].includes(l.permit) && !["needed", "requested"].includes(l.coi) && l.hospital).length}/${locs.length}`),
    chk("a.callsheet", "Call sheet for Day 1", day1 && day1.callsheet && Object.keys(day1.callsheet).length > 2, day1 ? `Day 1: ${day1.title} ${day1.date}` : "No upcoming day"),
    chk("a.safety", "Risk assessment + emergency card", by("safety").some((x) => /risk/i.test(x.data?.type || x.title) && x.status === "done") && by("safety").some((x) => /emergency/i.test(x.data?.type || x.title) && x.status === "done"), "Safety → risk assessment, emergency card"),
    chk("a.media", "Media plan (cards + drives registered)", s2 && (s2.cards || []).length > 0 && (s2.drives || []).length >= 2, "Days & crew → Media"),
    chk("a.conventions", "Conventions locked (project code)", Boolean(p.code), "Production → Conventions"),
    chk("a.story", "Thesis v1 + question bank + style guide", (p.thesis || []).length > 0 && (s3.questions || []).length >= 5 && Object.values(p.style || {}).filter(Boolean).length >= 3, "Story tab"),
    chk("a.plans", "Interview plans for everyone booked", interviewees.filter((x) => x.status === "scheduled").every((x) => x.plan && (x.plan.setup || x.plan.must_gets)), "People → interview plan"),
    chk("a.discovery", "Brief locked + approver named", Boolean(p.discovery_locked_at) && (s1.stakeholders || []).some((x) => x.portal_role === "approver" || x.decision_maker), "Client side → The brief, Who at the client"),
    chk("a.deposit", "Deposit paid", (s5.payments || []).some((x) => /deposit/i.test(x.label) && x.status === "paid"), "Client side → Payments"),
  ];
  const B = [
    chk("b.clearance", "Clearance pass 100% green", clear.length > 0 && clear.every((x) => x.status === "green"), clear.length ? `${clear.filter((x) => x.status === "green").length}/${clear.length} green` : "No clearance items yet — seed them"),
    chk("b.releases", "Every featured person released", featured.length > 0 && featured.every((x) => hasRelease(x.id)), `${featured.filter((x) => hasRelease(x.id)).length}/${featured.length}`),
    chk("b.minors", "Minors resolved", by("minor").every((x) => x.status !== "open"), ""),
    chk("b.revocations", "Revocation cases closed", by("revocation").every((x) => ["closed", "declined"].includes(x.status)), ""),
    chk("b.archival", "Archival: basis known + cleared", arch.filter((x) => x.status !== "rejected").every((x) => x.basis !== "unknown" && x.status === "cleared"), `${arch.filter((x) => x.status === "cleared").length}/${arch.filter((x) => x.status !== "rejected").length}`),
    chk("b.music", "No temp music; sync + master per cue", cues.length > 0 && cues.every((x) => x.source !== "temp" && ["licensed", "na"].includes(x.sync_status) && ["licensed", "na"].includes(x.master_status)), cues.length ? `${cues.filter((x) => x.source === "temp").length} temp cues left` : "No cues logged"),
    chk("b.fair_use", "Fair-use memos received where relied on", by("fair_use").every((x) => x.status === "received") && arch.filter((x) => x.basis === "fair_use").every((x) => by("fair_use").some((f) => f.status === "received" && (f.ref_id === x.id || (f.data?.item || "").includes(x.title)))), ""),
    chk("b.defamation", "Defamation review signed", by("defamation").length > 0 && by("defamation").every((x) => ["resolved", "signed"].includes(x.status)) && by("defamation").some((x) => x.status === "signed"), "Defamation review → one 'signed' line from the attorney"),
    chk("b.title", "Chain of title gaps = 0", by("title").length > 0 && by("title").every((x) => ["in_hand", "registered"].includes(x.status)), ""),
    chk("b.client_review", "Client factual review approved", (s5.approvals || []).some((x) => x.kind === "cut" && x.status === "approved"), "Client side → Sign-offs (kind: Cut)"),
    chk("b.coverage", "Every scene has selects", (s1.scenes || []).filter((x) => !["idea", "locked"].includes(x.status)).every((sc) => (b.sprint4?.selects || []).some((s) => s.scene_id === sc.id)), "Edit → Stringout"),
  ];
  const C = [
    chk("c.eo", "E&O bound", live(pol("e&o") || pol("eo") || pol("errors")), "Insurance → E&O"),
    chk("c.copyright", "Copyright registered", by("title").some((x) => /copyright/i.test(x.data?.type || x.title) && x.status === "registered"), "Chain of title → copyright registration"),
    chk("c.cuesheet", "Cue sheet complete (every cue timed)", cues.length > 0 && cues.every((x) => x.in_s != null && x.out_s != null && x.publisher), ""),
    chk("c.credits", "Credits & disclaimers verified", by("credit").length > 0 && by("credit").every((x) => x.status === "verified"), ""),
    chk("c.deliverables", "Deliverables approved by client", (s5.approvals || []).some((x) => x.kind === "deliverable" && x.status === "approved"), "Client side → Sign-offs (kind: Deliverable)"),
    chk("c.paid", "All payments paid", (s5.payments || []).length > 0 && (s5.payments || []).every((x) => ["paid", "waived"].includes(x.status)), ""),
    chk("c.drone_logs", "Drone flights logged", by("drone").every((x) => ["flown", "scrubbed"].includes(x.status)), ""),
  ];
  const ov = p.gate_overrides || {};
  const apply = (list) => list.map((c) => ({ ...c, override: ov[c.key] || null, pass: c.ok || Boolean(ov[c.key]) }));
  const gates = { A: { label: "Gate A — before the first shoot day", checks: apply(A) }, B: { label: "Gate B — before picture lock", checks: apply(B) }, C: { label: "Gate C — before delivery", checks: apply(C) } };
  for (const g of Object.values(gates)) { g.passed = g.checks.filter((c) => c.pass).length; g.total = g.checks.length; g.open = g.checks.every((c) => c.pass); }
  return gates;
}

// ── Exports ──
const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
export function buildClearanceBible({ project, clearance, scenes = [], people = [] }) {
  const sc = Object.fromEntries(scenes.map((s) => [s.id, `${s.number}. ${s.title}`]));
  const rows = [["Kind", "Item", "Scene", "Segment", "Status", "Basis", "Document", "Reviewer", "Reviewed", "Notes"].map(q).join(",")];
  for (const c of clearance) rows.push([CLEARANCE_KIND_LABEL[c.kind], c.label, sc[c.scene_id] || "", c.segment, c.status.toUpperCase(), CLEARANCE_BASIS_LABEL[c.basis], c.doc, c.reviewer, c.reviewed_at ? c.reviewed_at.slice(0, 10) : "", c.notes].map(q).join(","));
  return rows.join("\n");
}
export function buildCueSheet({ project, cues, scenes = [] }) {
  const sc = Object.fromEntries(scenes.map((s) => [s.id, `${s.number}. ${s.title}`]));
  const t = (s) => { if (s == null) return ""; const n = Math.floor(s); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`; };
  const rows = [["#", "Title", "Composer/Artist", "Publisher", "Source", "Usage", "Scene", "In", "Out", "Duration", "Sync", "Master", "License", "Fee"].map(q).join(",")];
  cues.forEach((c, i) => rows.push([i + 1, c.title, c.artist, c.publisher, MUSIC_SOURCE_LABEL[c.source], MUSIC_USAGE_LABEL[c.usage], sc[c.scene_id] || "", t(c.in_s), t(c.out_s), c.in_s != null && c.out_s != null ? t(c.out_s - c.in_s) : "", LICENSE_STATUS_LABEL[c.sync_status], LICENSE_STATUS_LABEL[c.master_status], c.license_link, (c.fee_cents / 100).toFixed(2)].map(q).join(",")));
  return rows.join("\n");
}
export function buildEOPacket({ project, gates, clearance, cues, archival, legal, releases = [], people = [] }) {
  const out = [`# E&O clearance packet — ${project.title}`, `Generated ${new Date().toISOString().slice(0, 10)} · project code ${project.code || "—"}`, ""];
  for (const g of Object.values(gates)) { out.push(`## ${g.label} — ${g.passed}/${g.total}`); for (const c of g.checks) out.push(`- [${c.pass ? "x" : " "}] ${c.label}${c.override ? ` (override: ${c.override.reason})` : c.detail ? ` — ${c.detail}` : ""}`); out.push(""); }
  out.push(`## Releases on file (${releases.length})`);
  const pn = Object.fromEntries(people.map((p) => [p.id, p.name]));
  for (const r of releases) out.push(`- ${r.kind} — ${r.signer_name}${r.person_id && pn[r.person_id] ? ` (for ${pn[r.person_id]})` : ""} · ${String(r.signed_at).slice(0, 10)} · text v${r.text_version}`);
  out.push("", `## Clearance items (${clearance.length}) — ${clearance.filter((c) => c.status === "green").length} green / ${clearance.filter((c) => c.status === "yellow").length} yellow / ${clearance.filter((c) => c.status === "red").length} red`);
  for (const c of clearance) out.push(`- ${c.status.toUpperCase()} · ${CLEARANCE_KIND_LABEL[c.kind]} · ${c.label}${c.segment ? ` @ ${c.segment}` : ""} · ${CLEARANCE_BASIS_LABEL[c.basis]}${c.doc ? ` · ${c.doc}` : ""}`);
  out.push("", `## Music cues (${cues.length})`);
  for (const c of cues) out.push(`- ${c.title} — ${c.artist || "?"} / ${c.publisher || "?"} · ${MUSIC_SOURCE_LABEL[c.source]} · sync ${LICENSE_STATUS_LABEL[c.sync_status]} · master ${LICENSE_STATUS_LABEL[c.master_status]}`);
  out.push("", `## Archival (${archival.length})`);
  for (const a of archival) out.push(`- ${a.title} (${ARCHIVAL_KIND_LABEL[a.kind]}) · lender ${a.lender || "?"} · rights ${a.rights_holder || "?"} · ${ARCHIVAL_BASIS_LABEL[a.basis]} · ${ARCHIVAL_STATUS_LABEL[a.status]}${a.reasoning ? ` — ${a.reasoning}` : ""}`);
  for (const [k, def] of Object.entries(LEGAL_KINDS)) { const list = legal.filter((x) => x.kind === k); if (!list.length) continue; out.push("", `## ${def.label} (${list.length})`); for (const x of list) out.push(`- ${x.title}${x.party ? ` — ${x.party}` : ""} · ${LEGAL_STATUS_LABEL[x.status] || x.status}${x.date ? ` · ${x.date}` : ""}${x.expires ? ` · expires ${x.expires}` : ""}${x.link ? ` · ${x.link}` : ""}${Object.entries(x.data || {}).filter(([, v]) => v).map(([kk, v]) => ` · ${kk}: ${v}`).join("")}`); }
  return out.join("\n");
}
