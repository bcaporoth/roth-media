"use client";

import { useEffect } from "react";

// Logs a gallery open, then watches clicks for downloads: any link to an
// original (/orig/) is one saved file, the album zip is "download all".
// Bulk saves are batched into one request.
const ADMIN_FLAG = "rm-admin-device";

export default function GalleryBeacon({ galleryId, via }) {
  useEffect(() => {
    try {
      if (localStorage.getItem(ADMIN_FLAG) === "1") return;
    } catch {}

    let queue = [];
    let timer = null;
    const flush = () => {
      timer = null;
      if (!queue.length) return;
      const body = JSON.stringify({ galleryId, via, actions: queue });
      queue = [];
      if (!(navigator.sendBeacon && navigator.sendBeacon("/api/activity", body))) {
        fetch("/api/activity", { method: "POST", body, keepalive: true }).catch(() => {});
      }
    };
    const push = (action, filename = "") => {
      queue.push({ action, filename });
      if (!timer) timer = setTimeout(flush, 1500);
    };

    push("view");

    const onClick = (e) => {
      const a = e.target?.closest?.("a[href]");
      if (!a) return;
      let path = "";
      try {
        path = decodeURIComponent(new URL(a.href, window.location.href).pathname);
      } catch {
        return;
      }
      if (/album\.zip$/.test(path)) push("download_all");
      else if (path.includes("/orig/")) push("download", path.split("/").pop());
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [galleryId, via]);

  return null;
}
