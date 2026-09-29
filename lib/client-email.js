// Branded wrapper for emails sent from Studio → Clients (broadcasts and
// "your gallery is ready"). Plain text in, simple HTML out.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function firstName(name, email) {
  const n = String(name || "").trim().split(/\s+/)[0];
  return n || String(email || "").split("@")[0];
}

// {name} in subject/body → the client's first name.
export function merge(template, client) {
  return String(template || "").replace(/\{name\}/gi, firstName(client.name, client.email));
}

export function wrapHtml({ body, cta = null }) {
  const paras = String(body || "")
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 1em;font-size:16px;line-height:1.55;color:#191612">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const button = cta
    ? `<p style="margin:1.5em 0"><a href="${esc(cta.href)}" style="display:inline-block;background:#191612;color:#f4efe6;text-decoration:none;font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:13px;padding:14px 22px;border-radius:999px">${esc(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4efe6;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <div style="font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:#b8552f;margin-bottom:18px">Roth Media</div>
  ${paras}${button}
  <p style="margin:2em 0 0;font-size:13px;line-height:1.5;color:#6b6358">Brandon Roth · Roth Media · Waverly, NY<br>Reply to this email or text 845-549-4425. Don&#39;t want emails from Roth Media? Reply STOP.</p>
</div></body></html>`;
}
