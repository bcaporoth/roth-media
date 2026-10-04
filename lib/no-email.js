// Clients added without an email get a stand-in address so the roster's
// "email is the key" joins keep working. ".invalid" can never receive mail.
export const NO_EMAIL_DOMAIN = "no-email.rothmediaco.invalid";

export const isNoEmail = (email) => String(email || "").toLowerCase().endsWith("@" + NO_EMAIL_DOMAIN);

export function standInEmail(name) {
  const slug = String(name || "client").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "client";
  const rand = Math.random().toString(36).slice(2, 8);
  return `${slug}-${rand}@${NO_EMAIL_DOMAIN}`;
}
