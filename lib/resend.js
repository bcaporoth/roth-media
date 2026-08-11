// Minimal Resend client — plain fetch, no SDK. Used for premiere emails.
// Requires RESEND_API_KEY in the environment (Vercel → Settings → Env Vars).

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

export const resendConfigured = Boolean(RESEND_API_KEY);

export const FROM = 'Brandon Roth <brandon@rothventures.co>';

// scheduledAt: ISO 8601 string → Resend delivers the email at that moment.
export async function sendEmail({ to, subject, html, scheduledAt = null }) {
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
      html,
      ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Resend error ${res.status}`);
  return json; // { id }
}
