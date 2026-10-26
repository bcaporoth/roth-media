// Sprint-1 vocabulary: scenes, locations, budget, phases, milestones.
export const PHASES = ["development", "preproduction", "production", "post", "delivery", "archive"];
export const PHASE_LABEL = { development: "Development", preproduction: "Pre-production", production: "Production", post: "Post", delivery: "Delivery", archive: "Archived" };

export const SCENE_KINDS = ["interview", "verite", "archival", "montage", "transition"];
export const SCENE_KIND_LABEL = { interview: "Interview", verite: "Verité", archival: "Archival", montage: "Montage", transition: "Transition" };
export const SCENE_STATUSES = ["idea", "planned", "shot", "selected", "assembled", "cut", "locked"];
export const SCENE_STATUS_LABEL = { idea: "Idea", planned: "Planned", shot: "Shot", selected: "Selected", assembled: "Assembled", cut: "In cut", locked: "Locked" };
export const TCHART_REL = { illustrates: "illustrates", counterpoints: "counterpoints", reveals: "reveals", transitions: "transitions" };

export const LOCATION_KINDS = ["church", "interior", "exterior", "home", "archive", "broll", "other"];
export const LOCATION_KIND_LABEL = { church: "Church", interior: "Interior", exterior: "Exterior", home: "Someone's home", archive: "Archive / office", broll: "B-roll spot", other: "Other" };
export const LOCATION_STATUS_LABEL = { idea: "Idea", scouted: "Scouted", cleared: "Cleared", shot: "Shot" };
export const PERMIT_LABEL = { none: "No permit needed", needed: "Permit needed", requested: "Permit requested", granted: "Permit granted" };
export const COI_LABEL = { none: "No COI needed", needed: "COI needed", requested: "COI requested", delivered: "COI delivered" };

export const BUDGET_SECTIONS = ["atl", "production", "post", "other"];
export const BUDGET_SECTION_LABEL = { atl: "Above the line", production: "Production", post: "Post", other: "Other" };
// Doc-flavored top sheet. Seeded into a new project's budget; edit freely.
export const BUDGET_TOPSHEET = [
  ["1100", "atl", "Story & rights (archival licensing share)", "allow"],
  ["1200", "atl", "Producer fee", "flat"],
  ["1300", "atl", "Director fee", "flat"],
  ["1400", "atl", "On-camera / narrator", "allow"],
  ["2000", "production", "Production staff (PA, coordinator)", "day"],
  ["2100", "production", "Camera (2nd shooter, drone op)", "day"],
  ["2200", "production", "Sound (mixer, wireless)", "day"],
  ["2300", "production", "Lighting & grip", "day"],
  ["2500", "production", "Locations (fees, permits, parking)", "allow"],
  ["2600", "production", "Equipment rental", "day"],
  ["2700", "production", "Travel (mileage, fuel)", "allow"],
  ["2800", "production", "Lodging & per diem", "allow"],
  ["2900", "production", "Catering / crafty", "day"],
  ["3000", "production", "Media & data (cards, drives, cloud)", "allow"],
  ["3100", "production", "Insurance (GL, equipment, drone, COIs)", "flat"],
  ["3200", "production", "Legal / clearances", "allow"],
  ["4000", "post", "Editorial (editor, AE, transcription)", "week"],
  ["4100", "post", "Archival & stock licensing", "allow"],
  ["4200", "post", "Music (composer / library)", "allow"],
  ["4300", "post", "Graphics / titles / maps", "flat"],
  ["4400", "post", "Color", "flat"],
  ["4500", "post", "Sound post (mix)", "flat"],
  ["4700", "post", "Deliverables (masters, captions, cutdowns)", "flat"],
  ["4800", "post", "Screening / premiere", "allow"],
  ["5000", "other", "General & admin", "allow"],
];
export const COST_KINDS = { invoice: "Invoice", card: "Card", cash: "Cash", mileage: "Mileage", perdiem: "Per diem" };

export const DEFAULT_MILESTONES = [
  { key: "kickoff", label: "Kickoff", client_visible: true },
  { key: "treatment", label: "Treatment approved", client_visible: true },
  { key: "interviews", label: "Interview list approved", client_visible: true },
  { key: "wrap", label: "Production wrap", client_visible: true },
  { key: "rough", label: "Rough cut approved", client_visible: true },
  { key: "fine", label: "Fine cut approved", client_visible: true },
  { key: "final", label: "Final approved", client_visible: true },
  { key: "delivered", label: "Delivered", client_visible: true },
  { key: "premiere", label: "Premiere", client_visible: true },
];
export const TASK_CATEGORY_LABEL = { access: "Access", document: "Document", introduction: "Introduction", approval: "Approval", scheduling: "Scheduling", materials: "Materials", payment: "Payment" };
export const STAKEHOLDER_ROLE_LABEL = { approver: "Approver", reviewer: "Reviewer", viewer: "Viewer" };

export const money = (cents) => ((cents || 0) / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const fmtSecs = (s) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "—");

// Sprint 3 — story engine vocabulary
export const ARC_ROLES = ["keeper", "witness", "inheritor", "outsider", "historian", "chorus"];
export const ARC_ROLE_LABEL = { keeper: "The Keeper — held it together", witness: "The Witness — there for the worst year", inheritor: "The Inheritor — who it's for now", outsider: "The Outsider — the town's view", historian: "The Historian — has the paper", chorus: "Chorus — a voice, not a thread" };
export const ERAS = ["founding", "growth", "decline", "near-closure", "revival", "now"];
export const EVIDENCE_LABEL = { documented: "Documented (2+ sources)", single: "Single source", oral: "Oral / memory", disputed: "Disputed" };
export const SOURCE_KINDS = ["parish_record", "diocesan_record", "newspaper", "photos", "book", "article", "oral", "web", "document"];
export const SOURCE_KIND_LABEL = { parish_record: "Parish record", diocesan_record: "Diocesan record", newspaper: "Newspaper", photos: "Photo collection", book: "Book", article: "Article", oral: "Someone's memory", web: "Web", document: "Document" };
export const RELIABILITY_LABEL = { primary: "Primary", secondary: "Secondary", hearsay: "Hearsay" };
export const QUESTION_THEMES = ["founding", "decline", "closure threat", "the decision", "faith", "community", "revival", "personal", "general"];
export const ACCESS_LABEL = { ask: "Need to ask", asked: "Asked", approved: "Approved", restricted: "Restricted" };
export const EVENT_STATUS_LABEL = { planned: "Planned", shot: "Shot", missed: "Missed" };
export const STYLE_FIELDS = [
  ["aspect", "Aspect ratio", "16:9 (2.39 letterbox for the film? decide once)"],
  ["res_fps", "Resolution / frame rate", "4K UHD · 23.976 · 120p for slo-mo"],
  ["codec", "Codec / profile", "10-bit All-I · S-Log3 / S-Gamut3.Cine"],
  ["color", "Color pipeline", "Resolve color-managed, Rec.709 Gamma 2.4 out; s709 to monitor"],
  ["interview_look", "Interview look", "Key: big soft source 45° off, fill 2 stops under, hair/edge light warm; background with depth, practicals on; 50mm/85mm, f/2–2.8; subject on the thirds, eyes top third"],
  ["eyeline", "Eyeline rule", "Alternate L/R by character — opposing characters face each other across cuts"],
  ["verite", "Verité approach", "Handheld or gimbal, 24–35mm, available light, never direct the moment"],
  ["broll", "B-roll grammar", "Hold 10s. Static or one slow move. One idea per shot. Golden hour for exteriors; blue hour for the lit church"],
  ["archival", "Archival treatment", "Scan 600dpi, keep borders, slow push 3–5%, no Ken-Burns gymnastics; grain match"],
  ["sound", "Sound", "Lav + boom; 30s room tone every setup; capture bells, organ, choir, HVAC-off ambience"],
  ["references", "References (films, images)", "links + one line each on why"],
  ["dont", "Don't", "No drone over the congregation · no music under interviews until the edit · no zooms"],
];

// ── Sprint 5: the client machinery ──
export const DISCOVERY_FIELDS = [
  ["goal", "What should this film do?", "Who watches it, and what do you want them to feel, think or do after?"],
  ["audience", "Who is it for, first?", "Parishioners · the diocese · the town · donors · the next generation"],
  ["shown", "Where will it be shown?", "Premiere in the church · parish site · YouTube · diocesan event · local TV"],
  ["must", "What must be in it?", "People, moments, places, dates it cannot leave out"],
  ["never", "What must not be in it?", "Topics, people, claims — and how we should handle each (see the sensitivity list)"],
  ["voices", "Whose voices matter most?", "The 5–8 people the parish would expect to hear from"],
  ["story", "In one breath, what is the story?", "The way you'd tell a friend over coffee"],
  ["approvals", "Who signs off, and in what order?", "Pastor → finance council → ? · What does each need to see?"],
  ["deadlines", "Dates that matter", "Feast days, anniversaries, the premiere, a diocesan deadline"],
  ["references", "Films or videos you admire", "Links and why"],
  ["worries", "What worries you about this?", "Say it now — it shapes how we film"],
];
export const APPROVAL_KIND_LABEL = { milestone: "Milestone", cut: "Cut", change_order: "Change order", deliverable: "Deliverable", other: "Other" };
export const APPROVAL_STATUS_LABEL = { pending: "Awaiting", approved: "Approved", changes: "Changes requested" };
export const CO_STATUS_LABEL = { draft: "Draft", sent: "Sent", accepted: "Accepted", declined: "Declined", expired: "Expired" };
export const PAYMENT_STATUS_LABEL = { scheduled: "Scheduled", invoiced: "Invoiced", paid: "Paid", late: "Late", waived: "Waived" };
export const DEFAULT_PAYMENTS = [["Deposit — signs the agreement", 30, "Nothing is scheduled until this clears"], ["Production start", 30, "Due before the first shoot day"], ["Picture lock", 20, "Due when the cut is approved"], ["Delivery", 20, "Masters hand over when this clears"]];
export const CHANNEL_LABEL = { call: "Call", email: "Email", text: "Text", meeting: "Meeting", portal: "Portal", other: "Other" };
export const HANDLING_LABEL = { public: "Fine to use", internal_only: "Internal only", approve_before_use: "Approve before use", omit: "Leave out" };
