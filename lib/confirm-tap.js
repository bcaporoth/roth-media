// "Are you sure?" that always works (2026-11-08). Some browsers (the Claude
// desktop app's browser, some in-app phone browsers) block window.confirm():
// it returns false instantly and shows nothing, so the button seems dead.
// confirmTap() uses the normal popup when it works. When it's blocked, the
// first tap shows a small note — "… Tap again to confirm" — and a second tap
// on the same action within 5 seconds counts as yes.

let armed = { msg: "", at: 0 };

function note(text) {
  if (typeof document === "undefined") return;
  let el = document.getElementById("confirm-tap-note");
  if (!el) {
    el = document.createElement("div");
    el.id = "confirm-tap-note";
    el.setAttribute("role", "status");
    el.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;max-width:min(92vw,520px);padding:12px 18px;border-radius:14px;background:#2a1715;border:1px solid #e5705f;color:#ffd9d4;font:500 15px/1.4 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45);text-align:center";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.display = "block";
  clearTimeout(note.t);
  note.t = setTimeout(() => { el.style.display = "none"; }, 5000);
}

export function confirmTap(msg) {
  const started = Date.now();
  let ok = false;
  try { ok = window.confirm(msg); } catch { ok = false; }
  if (ok) return true;
  if (Date.now() - started > 40) return false; // the popup showed and they said no
  // Blocked popup: two taps instead.
  if (armed.msg === msg && Date.now() - armed.at < 5000) {
    armed = { msg: "", at: 0 };
    const el = typeof document !== "undefined" && document.getElementById("confirm-tap-note");
    if (el) el.style.display = "none";
    return true;
  }
  armed = { msg, at: Date.now() };
  note(`${msg} Tap again to confirm.`);
  return false;
}
