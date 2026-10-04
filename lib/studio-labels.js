// One vocabulary for the Studio. Every admin screen reads its shoot-type,
// shoot-status and inbox labels from here, so the same thing is never called
// two different names on two tabs. These are LABELS only — the values stored
// in the database (wedding, family, business, event, other · planned,
// confirmed, done, cancelled · new, contacted, booked, lost, archived) never
// change.

// Shoot types (shoots.kind), in the order the pickers show them.
export const SHOOT_KINDS = ["wedding", "family", "business", "event", "other"];
export const SHOOT_KIND_LABEL = {
  wedding: "Wedding",
  family: "Family",
  business: "Business",
  event: "Event",
  other: "Other",
};
// The label for one shoot. Unknown or missing types read as "Other".
export const shootKindLabel = (kind) => SHOOT_KIND_LABEL[kind] || SHOOT_KIND_LABEL.other;

// Playbook lists can also belong to "any" type.
export const PLAYBOOK_ANY_LABEL = "Every shoot";
export const PLAYBOOK_KIND_OPTIONS = [["any", PLAYBOOK_ANY_LABEL], ...SHOOT_KINDS.map((k) => [k, SHOOT_KIND_LABEL[k]])];
export const playbookKindLabel = (kind) => (kind === "any" ? PLAYBOOK_ANY_LABEL : shootKindLabel(kind));

// Shoot status (shoots.status).
export const SHOOT_STATUS_LABEL = { planned: "Planned", confirmed: "Confirmed", done: "Done", cancelled: "Cancelled" };
export const shootStatusLabel = (status) => SHOOT_STATUS_LABEL[status] || status || "";

// Inbox pipeline (submissions.status), in pipeline order.
export const LEAD_STATUSES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "booked", label: "Booked" },
  { key: "lost", label: "Lost" },
  { key: "archived", label: "Archived" },
];
export const LEAD_STATUS_LABEL = Object.fromEntries(LEAD_STATUSES.map((s) => [s.key, s.label]));
export const leadStatusLabel = (status) => LEAD_STATUS_LABEL[status] || status || "";

// What kind of form an inbox row is (submissions.kind).
export const FORM_KIND_LABEL = {
  quote: "Quote",
  booking: "Booked 💸",
  promo: "Promo entry",
  card: "Business card",
  contact: "Message",
  intake: "Intake answers",
};
export const formKindLabel = (kind) => FORM_KIND_LABEL[kind] || kind || "";
