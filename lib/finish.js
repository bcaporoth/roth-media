// Sprint 7 — the finish: deliverable package, QC checklist, follow-up
// schedule, 1099 math. Pure vocabulary + small functions.
export const DELIVERABLE_KINDS = { master: "Archival master", textless: "Textless master", web: "Web master", broadcast: "Broadcast / DCP", captions: "Captions", stems: "Audio stems", trailer: "Trailer", social: "Social cutdowns", poster: "Poster frames", stills: "Stills", cuesheet: "Cue sheet", transcript: "Transcript", credits: "Credits list", archive: "Project archive", other: "Other" };
export const DELIVERABLE_STATUS_LABEL = { todo: "To do", rendering: "Rendering", qc: "In QC", delivered: "Delivered", acknowledged: "Acknowledged" };
export const DEFAULT_DELIVERABLES = [
  ["master", "Archival master", "ProRes 422 HQ · UHD 3840×2160 · 23.976 · Rec.709 · 24-bit 48k stereo + 5.1 if mixed · -24 LKFS"],
  ["textless", "Textless master", "Same as master, no titles/lower thirds/credits — for future versions"],
  ["web", "Web master", "H.264 High · 1080p · 15–20 Mb/s · AAC 320k · -16 LUFS"],
  ["captions", "Captions", "SRT + burned-in version of the web master; checked against the final transcript"],
  ["stems", "Audio stems", "Dialogue / music / effects + full mix · 24-bit 48k WAV, timecode-matched"],
  ["trailer", "Trailer", "60–90s · 1080p · with and without end card"],
  ["social", "Social cutdowns", "3 × 30–60s · 9:16 and 1:1 · captions burned in"],
  ["poster", "Poster frames", "12 graded stills from the film · 4K TIFF + web JPG"],
  ["stills", "Stills", "Edited BTS + portrait stills from the shoot · JPG, sized for print and web"],
  ["cuesheet", "Cue sheet", "CSV + PDF · every cue with publisher, usage, in/out, duration"],
  ["transcript", "Transcript", "Final film transcript · DOCX + TXT · for the parish archive and accessibility"],
  ["credits", "Credits & disclaimers list", "Final credit roll as text, verified at timecode"],
  ["archive", "Project archive", "Camera originals + proxies + project file + graded masters + paperwork · manifest with checksums"],
];
export const QC_CHECKS = [
  ["head_tail", "Head/tail: 2s black, slate if required, clean out"],
  ["frame", "Frame: no flash frames, no black frames, no dropped frames"],
  ["levels", "Audio levels: dialogue -24 LKFS (bcast) / -16 LUFS (web); no clipping"],
  ["sync", "Sync: dialogue, VO and music on every section"],
  ["color", "Color: no clipping, legal range, consistent across interviews"],
  ["titles", "Titles: spelling of every name and credit; safe margins"],
  ["captions", "Captions: timing, spelling, speaker IDs"],
  ["clearance", "Clearance: nothing in frame that isn't green on the pass"],
  ["playback", "Playback: full watch-through on the delivery file, not the timeline"],
  ["checksum", "Checksum recorded and matches the uploaded file"],
];
export const FOLLOWUP_KIND_LABEL = { testimonial: "Ask for a testimonial", referral: "Referral nudge", anniversary: "Anniversary note", purge_notice: "Archive purge notice", premiere_reminder: "Premiere reminder", custom: "Custom" };
export function defaultFollowups(deliveredDate, retentionUntil) {
  const d = new Date(`${deliveredDate}T12:00:00`);
  const plus = (days) => new Date(d.getTime() + days * 864e5).toLocaleDateString("en-CA");
  const list = [
    { kind: "testimonial", label: "Ask the parish for a testimonial + permission to show the film in your reel", due: plus(7) },
    { kind: "referral", label: "Referral note — who else should see this? (diocese, other parishes, the historical society)", due: plus(30) },
    { kind: "anniversary", label: "One year on — check in, offer an anniversary screening or a short follow-up piece", due: plus(335) },
  ];
  if (retentionUntil) list.push({ kind: "purge_notice", label: "Retention ends — tell the client 60 days before originals are purged; offer the archive drive", due: new Date(new Date(`${retentionUntil}T12:00:00`).getTime() - 60 * 864e5).toLocaleDateString("en-CA") });
  return list;
}
export const VENDOR_SERVICES = ["composer", "colorist", "sound mix", "transcription", "captions", "drone", "rental house", "insurance broker", "attorney", "printing", "catering", "other"];
export const TRAVEL_KIND_LABEL = { mileage: "Mileage", lodging: "Lodging", meal: "Meal", trip: "Trip / fare", other: "Other" };
export const IRS_MILEAGE_CENTS = 70; // 2026 standard rate — update yearly
export const TEN99_THRESHOLD_CENTS = 60000; // $600 (2026 rule raised to $2,000 for payments made after 2025 — check with the accountant)

// Invoice lines from approved, un-invoiced timesheets + a member's rates.
export function invoiceLines(sheets, member) {
  const rate = member?.project_rate_cents ?? member?.rate_cents ?? 0; const type = member?.rate_type || "day"; const kit = member?.kit_fee_cents || 0;
  const lines = [];
  for (const s of sheets) {
    const base = type === "hour" ? Math.round(rate * Number(s.hours || 0)) : rate;
    lines.push({ date: s.date, label: `${type === "hour" ? `${s.hours} h` : "Day"} — ${s.notes || "crew"}`, cents: base });
    if (Number(s.ot_hours) > 0) lines.push({ date: s.date, label: `OT ${s.ot_hours} h × 1.5`, cents: Math.round((type === "hour" ? rate : rate / 10) * 1.5 * Number(s.ot_hours)) });
    if (s.kit && kit) lines.push({ date: s.date, label: "Kit fee", cents: kit });
    if (Number(s.miles) > 0) lines.push({ date: s.date, label: `Mileage ${s.miles} mi`, cents: Math.round(Number(s.miles) * IRS_MILEAGE_CENTS) });
    if (Number(s.per_diem_cents) > 0) lines.push({ date: s.date, label: "Per diem", cents: Number(s.per_diem_cents) });
  }
  return lines;
}
export function buildDailyReportText({ project, day, report, scenes = [], rolls = [] }) {
  const L = [`DAILY PRODUCTION REPORT — ${project.title}`, `${day?.title || ""} · ${report.date || day?.date || ""}`, ""];
  L.push(`Crew: ${report.crew_present || "—"}`, `Call ${report.call_actual || "—"} · First shot ${report.first_shot || "—"} · Wrap ${report.wrap_actual || "—"}`, `Setups: ${report.setups || 0}`, "");
  L.push(`Scenes shot: ${report.scenes_shot || "—"}`, `Rolls: ${report.rolls || rolls.map((r) => r.roll_name).join(", ") || "—"}`, "");
  L.push(`Camera: ${report.camera_notes || "—"}`, `Sound: ${report.sound_notes || "—"}`, `Weather: ${report.weather || "—"}`, `Meals: ${report.meals || "—"}`, `Issues / incidents: ${report.issues || "none"}`, "", `Next day: ${report.next_day || "—"}`, "", `Signed: ${report.signed_by || ""}`);
  return L.join("\n");
}
