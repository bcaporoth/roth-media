"use client";

import { useEffect } from "react";

// Reveal-on-scroll for .cx-reveal (and the legacy .reveal) elements.
//
//   Render <Reveal /> once on the page; put className="cx-reveal" on blocks.
//   Optional stagger: style={{ transitionDelay: "120ms" }} on an element.
//
// Safe by construction:
//   • no JS / reduced motion → nothing is ever hidden (CSS only hides .cx-wait, which this adds);
//   • only blocks still BELOW the fold are hidden, and a block is shown as soon as the reader
//     reaches or passes it — a fast fling, an anchor jump or a full-page screenshot can never
//     leave one invisible;
//   • printing shows everything.
export default function Reveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll(".cx-reveal, .reveal")];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!els.length || reduce) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    let waiting = [];
    let raf = 0;
    const show = (el) => { el.classList.add("in"); el.classList.remove("cx-wait"); };
    const check = () => {
      raf = 0;
      const line = window.innerHeight * 0.92;
      waiting = waiting.filter((el) => {
        if (el.getBoundingClientRect().top < line) { show(el); return false; }
        return true;
      });
      if (!waiting.length) stop();
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    const stop = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    const line = window.innerHeight * 0.92;
    els.forEach((el) => {
      if (el.classList.contains("in")) return;
      if (el.getBoundingClientRect().top < line) { el.classList.add("in"); return; } // on screen or above: never hide it
      el.classList.add("cx-wait");
      waiting.push(el);
    });
    if (waiting.length) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
    }
    const showAll = () => { els.forEach(show); waiting = []; };
    window.addEventListener("beforeprint", showAll);
    return () => {
      stop();
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("beforeprint", showAll);
      els.forEach((el) => el.classList.remove("cx-wait"));
    };
  }, []);

  return null;
}
