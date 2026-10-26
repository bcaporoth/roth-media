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
