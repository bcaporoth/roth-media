// Release texts — the words someone agrees to when they sign on Brandon's
// phone. Stored in full on every signature, so changing these later never
// changes what anyone already signed. TEMPLATES, not legal advice: have a
// Pennsylvania / New York attorney read them once before the first real
// signature, then bump TEXT_VERSION.

export const TEXT_VERSION = "2026-10-24";
export const BUSINESS = "Roth Media (Roth Ventures LLC), Sayre, Pennsylvania";

export const RELEASE_KINDS = {
  appearance: "Appearance release",
  liability: "Liability release",
  location: "Location release",
  minor: "Appearance release — minor",
};

const fill = (t, v) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ?? "");

export const RELEASE_TEXT = {
  appearance: `APPEARANCE AND LIKENESS RELEASE

I, {{name}}, agree to appear in the film, photographs and recordings being made by {{business}} ("Roth Media") for the project "{{project}}".

I grant Roth Media and its client the irrevocable right to record my image, likeness, voice, name and the things I say, and to use, edit, reproduce, publish, distribute and display those recordings — in whole or in part, in any media now known or later developed, worldwide, forever — for the project, its promotion, and Roth Media's own portfolio and marketing.

I understand I will not be paid for this, that I will not have approval over how the recordings are edited or used, and that Roth Media is not obliged to use them. I release Roth Media, its client, and anyone working with them from any claim arising from the use of these recordings, including claims about privacy, publicity, defamation or the way I am portrayed.

I am at least 18 years old and I have read and understand this release.`,

  minor: `APPEARANCE AND LIKENESS RELEASE — MINOR

I, {{name}}, am the parent or legal guardian of the minor named below, and on their behalf I agree that they may appear in the film, photographs and recordings being made by {{business}} ("Roth Media") for the project "{{project}}".

Minor's name: {{minor}}

I grant Roth Media and its client the irrevocable right to record the minor's image, likeness, voice, name and the things they say, and to use, edit, reproduce, publish, distribute and display those recordings — in whole or in part, in any media now known or later developed, worldwide, forever — for the project, its promotion, and Roth Media's own portfolio and marketing.

I understand there is no payment, that I will not have approval over how the recordings are edited or used, and that Roth Media is not obliged to use them. On the minor's behalf and my own I release Roth Media, its client, and anyone working with them from any claim arising from the use of these recordings.

I have the legal authority to sign this and I have read and understand it.`,

  liability: `RELEASE AND WAIVER OF LIABILITY

I, {{name}}, am taking part in a filming or photography session run by {{business}} ("Roth Media") for the project "{{project}}" on {{date}} at {{place}}.

I understand that being on a working set — around camera equipment, lights, stands, cables, moving vehicles, stairs, outdoor terrain, weather, and other people — carries a risk of injury or loss, and I choose to take part anyway. I will follow Roth Media's safety directions and I will tell them before the session about anything that limits what I can safely do.

To the fullest extent the law allows, I release and agree not to sue Roth Media, its owner, crew and client for any injury, illness, loss or damage to me or my property arising from this session, including from their ordinary negligence. I understand this does not release anyone from liability for gross negligence or intentional misconduct, which the law does not allow me to waive.

I am at least 18 years old, I am signing this freely, and I have read and understand it.`,

  location: `LOCATION RELEASE

I, {{name}}, have the authority to grant access to the property at {{place}} (the "Location") and I grant {{business}} ("Roth Media") permission to enter it with crew and equipment to record film, photographs and sound for the project "{{project}}" on {{date}} and on other dates we agree to.

Roth Media may use the recordings of the Location — inside and out, including its name, signage and distinctive features — in the project, its promotion and Roth Media's own portfolio, in any media, worldwide, forever, without further permission or payment.

Roth Media will leave the Location in the condition it was found and is responsible for damage its crew causes. I release Roth Media from any other claim arising from the use of the recordings.

I have read and understand this release.`,
};

export function releaseBody(kind, v) {
  return fill(RELEASE_TEXT[kind] || RELEASE_TEXT.appearance, { business: BUSINESS, project: "the project", date: "the agreed date", place: "the agreed location", minor: "", ...v });
}
