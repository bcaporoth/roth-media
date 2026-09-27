// Client helper every site form uses. Saves to the Studio inbox via
// /api/forms (which also emails the alert); if that alert didn't go out,
// falls back to FormSubmit so the lead still reaches the inbox by email.

import { EMAIL as CONTACT_EMAIL } from "./site";
import { readUtm } from "./track";

const FORMSUBMIT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

// lead: { kind, name, email, phone, subject, summary, fields: [[label, value]] }
export async function submitLead(lead) {
  let stored = false;
  let emailed = false;
  try {
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, path: window.location.pathname, utm: readUtm() }),
    });
    const json = await res.json().catch(() => ({}));
    stored = Boolean(json.stored);
    emailed = Boolean(json.emailed);
  } catch {}

  if (!emailed) {
    const payload = { _subject: lead.subject, _template: "table" };
    for (const [k, v] of lead.fields || []) {
      if (v !== undefined && v !== "") payload[k] = v;
    }
    try {
      const res = await fetch(FORMSUBMIT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      emailed = res.ok && String(json.success) === "true";
    } catch {}
  }

  if (!stored && !emailed) throw new Error("failed");
  return { stored, emailed };
}
