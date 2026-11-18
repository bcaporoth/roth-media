"use client";
// "Save Brandon's card to your Photos": one tap puts the business card
// picture (/card/image) in the phone's Photos. 2026-11-18, Brandon wants
// everyone who scans one of his QR codes to be able to find his card later.
// A website can't write to Photos by itself, so on a phone this opens the
// share sheet (they tap "Save Image"); elsewhere it downloads the picture.
// The picture is fetched ahead of the tap: iPhone only opens the share sheet
// if nothing slow happens between the tap and the share (same trick as
// components/PortalGallery.js).
import "../app/theme/card-save.css";
import { useEffect, useRef, useState } from "react";
import { track } from "../lib/track";

const SRC = "/card/image";
const NAME = "roth-media-card.png";

export default function SaveCardButton({ where = "", lead = "Keep my card", className = "" }) {
  const fileRef = useRef(null);
  const [state, setState] = useState("idle"); // idle | busy | shared | saved | error

  async function getFile() {
    if (fileRef.current) return fileRef.current;
    const res = await fetch(SRC);
    if (!res.ok) throw new Error("no card");
    const blob = await res.blob();
    fileRef.current = new File([blob], NAME, { type: "image/png" });
    return fileRef.current;
  }
  useEffect(() => { getFile().catch(() => {}); }, []);

  function download(file) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = NAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function save() {
    setState("busy");
    track("card_save_photo", { where });
    try {
      const file = await getFile();
      const canShare = typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
      // Phones get the share sheet (that is where "Save Image" lives). A
      // desktop browser just downloads the file.
      const phone = /iphone|ipad|ipod|android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /mac/i.test(navigator.platform || ""));
      if (canShare && phone) {
        try {
          await navigator.share({ files: [file] });
          setState("shared");
          return;
        } catch (err) {
          if (err?.name === "AbortError") { setState("idle"); return; } // they closed the sheet
        }
      }
      download(file);
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return (
    <div className={"cardsave " + className}>
      <p className="cardsave-lead">{lead}</p>
      <div className="cardsave-row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="cardsave-thumb" src={SRC} alt="Brandon Roth's business card: Roth Media, 845-549-4425, rothmediaco.com" width="108" height="135" loading="lazy" />
        <div className="cardsave-acts">
          <button type="button" className="cardsave-btn" onClick={save} disabled={state === "busy"}>
            {state === "busy" ? "Getting the card…" : "Save Brandon's card to your Photos"}
          </button>
          <p className="cardsave-help" role="status">
            {state === "shared" ? "If you tapped Save Image, it is in your Photos now."
              : state === "saved" ? "Saved. Look in your downloads or your photo gallery."
              : state === "error" ? "That did not work. Press and hold the card picture, then tap Save to Photos."
              : "On iPhone, tap Save Image when the menu opens."}
          </p>
          <a className="cardsave-link" href="/card/vcard" onClick={() => track("card_save_contact", { where })}>Add Brandon to your contacts instead</a>
        </div>
      </div>
    </div>
  );
}
