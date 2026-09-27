"use client";

import { useState } from "react";
import QRCode from "qrcode";

// QR downloads for the business card: a big PNG for print shops and
// Canva, an SVG that stays sharp at any size, and the print-ready card.
export default function CardQrTools({ url, svg }) {
  const [copied, setCopied] = useState(false);

  async function downloadPng() {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 2000,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#191612", light: "#ffffff" },
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "roth-media-card-qr.png";
    a.click();
  }

  function downloadSvg() {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "roth-media-card-qr.svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy the card link:", url);
    }
  }

  return (
    <div className="cqr">
      <div className="cqr-code" dangerouslySetInnerHTML={{ __html: svg }} aria-label={`QR code for ${url}`} role="img" />
      <div className="cqr-side">
        <h2>Your QR code</h2>
        <p className="inbox-hint">
          Scans open your digital business card: save your contact, call, text, get a quote, or
          book a call. Every scan is counted in Stats as &ldquo;QR code (business card)&rdquo;.
        </p>
        <p className="cqr-url">{url.replace("https://", "")}</p>
        <div className="gcard-actions">
          <button type="button" className="abtn" onClick={downloadPng}>Download PNG</button>
          <button type="button" className="abtn abtn-ghost" onClick={downloadSvg}>Download SVG</button>
          <button type="button" className={"achip" + (copied ? " is-done" : "")} onClick={copy}>
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        </div>
        <div className="gcard-actions">
          <a className="abtn abtn-ghost" href="/card?src=preview" target="_blank" rel="noreferrer">
            Preview the card page ↗
          </a>
          <a className="abtn abtn-ghost" href="/portal/admin/card/print" target="_blank" rel="noreferrer">
            Print-ready business card ↗
          </a>
        </div>
        <p className="inbox-hint">
          Tip: text your card link to anyone who asks — it works the same as scanning.
        </p>
      </div>
    </div>
  );
}
