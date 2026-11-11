"use client";

// Text / Call / Email on a computer (2026-11-11).
// sms:, tel: and mailto: links are made for a phone. On a computer they often
// do nothing at all (no app to catch them), so every Studio button that uses
// one looked broken. On a computer this does something you can see instead:
//   Email → opens a Gmail draft (Roth account) in a new tab. Nothing sends.
//   Text  → copies the message (or the number) so it can be pasted.
//   Call  → copies the number.
// The original link still runs for Text and Call, so a Mac that can hand it to
// Messages or FaceTime still does. On a phone nothing changes.

import { useEffect, useState } from "react";

const GMAIL_ACCOUNT = "brandon@rothventures.co";

function onComputer() {
  try {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  } catch {
    return false;
  }
}

function prettyPhone(n) {
  const d = String(n || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : n;
}

// The old-style copy works in browsers that refuse navigator.clipboard
// (seen on the live site in the Claude browser pane, 2026-11-11). It has to
// run right inside the click, so it goes first.
function copyOldWay(text) {
  try {
    const t = document.createElement("textarea");
    t.value = text;
    t.setAttribute("readonly", "");
    t.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand("copy");
    t.remove();
    return ok;
  } catch {
    return false;
  }
}
function copy(text) {
  if (copyOldWay(text)) return Promise.resolve(true);
  try {
    return navigator.clipboard.writeText(text).then(() => true, () => false);
  } catch {
    return Promise.resolve(false);
  }
}

function toast(message) {
  window.dispatchEvent(new CustomEvent("contacttoast", { detail: message }));
}

export function gmailDraftUrl(mailto) {
  const u = new URL(mailto);
  const q = new URLSearchParams({ authuser: GMAIL_ACCOUNT, view: "cm", fs: "1", to: decodeURIComponent(u.pathname) });
  if (u.searchParams.get("subject")) q.set("su", u.searchParams.get("subject"));
  if (u.searchParams.get("body")) q.set("body", u.searchParams.get("body"));
  return `https://mail.google.com/mail/?${q}`;
}

// Does the computer version of a contact link. Returns true when the caller
// should NOT also follow the link (only Email, which becomes a Gmail tab).
export function handleOnComputer(href) {
  if (!href || !onComputer()) return false;
  if (href.startsWith("mailto:")) {
    const url = gmailDraftUrl(href);
    const w = window.open(url, "_blank");
    if (w) {
      w.opener = null;
      toast("Opened a Gmail draft in a new tab. Nothing sends until you press Send.");
    } else {
      // The browser blocked the new tab: offer the link instead of leaving Studio.
      toast({ text: "Your browser blocked the new tab.", href: url, link: "Open the Gmail draft" });
    }
    return true;
  }
  if (href.startsWith("sms:")) {
    const rest = href.slice(4);
    const number = rest.split(/[?&]/)[0];
    const m = rest.match(/[?&]body=([^&]*)/);
    const body = m ? decodeURIComponent(m[1]) : "";
    copy(body || number).then((ok) => {
      if (!ok) return toast(`Text ${prettyPhone(number)}`);
      toast(body ? `Message copied. If Messages didn't open, paste it in a text to ${prettyPhone(number)}.` : `Number copied: ${prettyPhone(number)}`);
    });
    return false;
  }
  if (href.startsWith("tel:")) {
    const number = href.slice(4);
    copy(number).then((ok) => toast(ok ? `Number copied: ${prettyPhone(number)}. Call it from your phone.` : `Call ${prettyPhone(number)} from your phone.`));
    return false;
  }
  return false;
}

// For code that opens a contact link itself (window.location.href = "sms:…").
export function openContact(href) {
  if (handleOnComputer(href)) return;
  window.location.href = href;
}

// Mounted once in StudioShell: catches every Text / Call / Email link in
// Studio and shows a small note at the bottom saying what happened.
export default function ContactLinks() {
  const [note, setNote] = useState("");
  useEffect(() => {
    let timer;
    const show = (e) => {
      const d = e.detail || "";
      setNote(typeof d === "string" ? { text: d } : d);
      clearTimeout(timer);
      timer = setTimeout(() => setNote(""), d.href ? 15000 : 6000);
    };
    const click = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.('a[href^="sms:"], a[href^="tel:"], a[href^="mailto:"]');
      if (!a) return;
      if (handleOnComputer(a.getAttribute("href"))) e.preventDefault();
    };
    window.addEventListener("contacttoast", show);
    document.addEventListener("click", click);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("contacttoast", show);
      document.removeEventListener("click", click);
    };
  }, []);
  if (!note) return null;
  return (
    <p className="contact-toast" role="status" onClick={() => setNote("")}>
      {note.text}
      {note.href && (
        <>
          {" "}
          <a href={note.href} target="_blank" rel="noopener noreferrer">{note.link || "Open"}</a>
        </>
      )}
    </p>
  );
}
