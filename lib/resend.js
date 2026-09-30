// Minimal Resend client — plain fetch, no SDK. Used for premiere emails.
// Requires RESEND_API_KEY in the environment (Vercel → Settings → Env Vars).

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

export const resendConfigured = Boolean(RESEND_API_KEY);

export const FROM = 'Brandon Roth <brandon@rothventures.co>';

// scheduledAt: ISO 8601 string → Resend delivers the email at that moment.
// Up to 100 messages in one request (broadcasts). Each: { to, subject, html, text }.
export async function sendBatch(messages) {
  if (!resendConfigured) throw new Error("Resend not configured");
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(messages.map((m) => ({
      from: FROM, to: [m.to], subject: m.subject,
      ...(m.html ? { html: m.html } : {}), ...(m.text ? { text: m.text } : {}),
      // Gmail/Apple show a native "Unsubscribe" button when this header is present.
      ...(m.unsubscribe ? { headers: { "List-Unsubscribe": `<${m.unsubscribe.replace("/unsubscribe?", "/api/unsubscribe?")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
    }))),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Resend error ${res.status}`);
  return json;
}

export async function sendEmail({ to, subject, html, text, scheduledAt = null }) {
  if (!resendConfigured) throw new Error("Resend not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
      ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Resend error ${res.status}`);
  return json; // { id }
}
