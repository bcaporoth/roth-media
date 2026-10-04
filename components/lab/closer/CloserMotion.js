"use client";

// Behaviour + motion for /lab/closer.
//  1. Audience switch — sets data-aud on the root; CSS shows the matching
//     content. With JS off every audience simply renders, stacked.
//  2. Menu, the day scrubber, the phone bar's manners.
//  3. Motion (skipped under prefers-reduced-motion): reveal-on-scroll,
//     number counters, and a few scrubbed transforms via GSAP ScrollTrigger.

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const AUDS = ["wedding", "business", "family"];

export default function CloserMotion() {
  useEffect(() => {
    const root = document.querySelector(".lab-closer");
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups = [];
    const on = (el, evt, fn, opts) => {
      if (!el) return;
      el.addEventListener(evt, fn, opts);
      cleanups.push(() => el.removeEventListener(evt, fn, opts));
    };

    // ── 1. Audience switch ──
    const selects = root.querySelectorAll("[data-aud-select]");
    const paint = (aud) => {
      root.dataset.aud = aud;
      root.querySelectorAll("button[data-aud-set]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.audSet === aud)));
      selects.forEach((s) => { s.value = aud; });
    };
    const setAud = (aud, anchor) => {
      if (!AUDS.includes(aud) || aud === root.dataset.aud) return;
      // Keep whatever the visitor tapped in the same place on screen.
      const before = anchor && anchor.isConnected ? anchor.getBoundingClientRect().top : null;
      paint(aud);
      try { sessionStorage.setItem("clo-aud", aud); } catch {}
      if (before !== null) {
        const after = anchor.getBoundingClientRect().top;
        if (Math.abs(after - before) > 1) window.scrollBy({ top: after - before, behavior: "instant" });
      }
      requestAnimationFrame(() => { syncStrip(); ScrollTrigger.refresh(); });
    };

    let initial = "wedding";
    try {
      const q = new URLSearchParams(window.location.search).get("for");
      const want = q === "portraits" ? "family" : q;
      const saved = sessionStorage.getItem("clo-aud");
      if (AUDS.includes(want)) initial = want;
      else if (AUDS.includes(saved)) initial = saved;
    } catch {}
    root.classList.add("is-js");
    paint(initial);

    on(root, "click", (e) => {
      const t = e.target.closest("[data-aud-set]");
      if (!t) return;
      // Links (the proof ledger) switch first, then jump to their target.
      setAud(t.dataset.audSet, t.tagName === "A" ? null : t.closest(".clo-sec-head") || t.closest(".clo-doors") || t);
    });
    selects.forEach((s) => on(s, "change", () => setAud(s.value, null)));
    // Past the first screen the header takes on a hairline + the switch.
    const onTop = () => root.classList.toggle("is-scrolled", window.scrollY > 24);
    on(window, "scroll", onTop, { passive: true });
    onTop();

    // ── 2a. Menu ──
    const head = root.querySelector(".clo-head");
    const menuBtn = root.querySelector(".clo-menu-btn");
    const setMenu = (open) => {
      head.classList.toggle("is-menu", open);
      menuBtn.setAttribute("aria-expanded", String(open));
    };
    on(menuBtn, "click", (e) => { e.stopPropagation(); setMenu(!head.classList.contains("is-menu")); });
    on(document, "click", (e) => { if (head.classList.contains("is-menu") && (!e.target.closest(".clo-menu") || e.target.closest("a"))) setMenu(false); });
    on(document, "keydown", (e) => { if (e.key === "Escape") setMenu(false); });

    // ── 2b. Day scrubber: the strip scrolls natively; the bar mirrors it ──
    const strip = root.querySelector("[data-strip]");
    const range = root.querySelector("[data-strip-range]");
    const maxScroll = () => Math.max(1, strip.scrollWidth - strip.clientWidth);
    function syncStrip() {
      if (!strip || !range) return;
      const k = strip.scrollLeft / maxScroll();
      range.value = String(Math.round(k * 1000));
      range.style.setProperty("--k", k.toFixed(4));
    }
    if (strip && range) {
      let raf = 0;
      on(strip, "scroll", () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; syncStrip(); }); }, { passive: true });
      on(range, "input", () => {
        strip.classList.add("is-scrubbing");
        strip.scrollLeft = (Number(range.value) / 1000) * maxScroll();
        range.style.setProperty("--k", (Number(range.value) / 1000).toFixed(4));
      });
      const release = () => strip.classList.remove("is-scrubbing");
      on(range, "change", release);
      on(range, "pointerup", release);
      const step = (dir) => {
        const frames = [...strip.children];
        const x = strip.scrollLeft;
        const pad = parseFloat(getComputedStyle(strip).paddingLeft) || 0;
        const lefts = frames.map((f) => f.offsetLeft - pad);
        const target = dir > 0 ? lefts.find((l) => l > x + 8) : [...lefts].reverse().find((l) => l < x - 8);
        strip.scrollTo({ left: target === undefined ? (dir > 0 ? maxScroll() : 0) : target, behavior: reduce ? "auto" : "smooth" });
      };
      on(root.querySelector("[data-strip-prev]"), "click", () => step(-1));
      on(root.querySelector("[data-strip-next]"), "click", () => step(1));

      // Mouse drag (touch already swipes natively).
      let drag = null;
      on(strip, "pointerdown", (e) => {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        drag = { x: e.clientX, left: strip.scrollLeft, moved: false };
      });
      on(window, "pointermove", (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.x;
        if (Math.abs(dx) > 4) { drag.moved = true; strip.classList.add("is-scrubbing"); }
        if (drag.moved) strip.scrollLeft = drag.left - dx;
      });
      on(window, "pointerup", () => { if (drag) { strip.classList.remove("is-scrubbing"); setTimeout(() => { drag = null; }, 0); } });
      on(strip, "click", (e) => { if (drag && drag.moved) e.preventDefault(); }, true);
      syncStrip();
    }

    // Load the strip's photos just before it arrives, so none pop in mid-scrub.
    if (strip && "IntersectionObserver" in window) {
      const warm = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        warm.disconnect();
        strip.querySelectorAll("img[loading=lazy]").forEach((img) => { img.loading = "eager"; });
      }, { rootMargin: "900px 0px" });
      warm.observe(strip);
      cleanups.push(() => warm.disconnect());
    }

    // ── 2c. Phone bar steps aside at the footer (its links live there too) ──
    const bar = root.querySelector(".clo-bar");
    const foot = root.querySelector(".clo-foot-cols");
    if (bar && foot && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(([e]) => bar.classList.toggle("is-away", e.isIntersecting), { rootMargin: "0px 0px -80px 0px" });
      io.observe(foot);
      cleanups.push(() => io.disconnect());
    }

    if (reduce || !("IntersectionObserver" in window)) {
      return () => { cleanups.forEach((c) => c()); root.classList.remove("is-js"); };
    }

    // ── 3. Motion ──
    gsap.registerPlugin(ScrollTrigger);
    root.classList.add("is-motion");

    // Reveal-on-scroll. Observer-based so content hidden by the audience
    // switch reveals when it is actually shown.
    const rise = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        rise.unobserve(e.target);
      }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    root.querySelectorAll(".clo-rise").forEach((el) => rise.observe(el));
    cleanups.push(() => rise.disconnect());

    // Number counters.
    const counted = new WeakSet();
    const count = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting || counted.has(e.target)) return;
        counted.add(e.target);
        const el = e.target;
        const end = Number(el.dataset.count);
        if (!(end > 1)) return;
        const o = { v: 0 };
        gsap.to(o, { v: end, duration: Math.min(1.6, 0.7 + end / 400), ease: "power2.out", onUpdate: () => { el.textContent = String(Math.round(o.v)); }, onComplete: () => { el.textContent = String(end); } });
      }),
      { threshold: 0.6 }
    );
    root.querySelectorAll("[data-count]").forEach((el) => count.observe(el));
    cleanups.push(() => count.disconnect());

    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      // Hero photo eases back as you leave it.
      gsap.fromTo(".clo-hero-layer img", { scale: 1.08 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: ".clo-hero", start: "top top", end: "bottom top", scrub: true },
      });

      // Booking steps: the line draws as you read down.
      gsap.fromTo(".clo-steps-line > span", { scaleY: 0 }, {
        scaleY: 1, ease: "none",
        scrollTrigger: { trigger: ".clo-steps-wrap", start: "top 75%", end: "bottom 55%", scrub: true },
      });

      // Portrait: slow parallax inside its frame.
      gsap.fromTo(".clo-about-photo img", { yPercent: -6 }, {
        yPercent: 6, ease: "none",
        scrollTrigger: { trigger: ".clo-about-photo", start: "top bottom", end: "bottom top", scrub: true },
      });

      // The full-bleed frame: opens from an inset print to the full width
      // of the screen, the photo drifting inside it, the words closing in.
      gsap.fromTo(".clo-bleed-img", { clipPath: "inset(10% 7% 10% 7%)" }, {
        clipPath: "inset(0% 0% 0% 0%)", ease: "none",
        scrollTrigger: { trigger: "[data-bleed-wrap]", start: "top 92%", end: "top 12%", scrub: true },
      });
      gsap.fromTo(".clo-bleed-frame img", { yPercent: -7, scale: 1.06 }, {
        yPercent: 7, scale: 1, ease: "none",
        scrollTrigger: { trigger: "[data-bleed-wrap]", start: "top bottom", end: "bottom top", scrub: true },
      });
      gsap.utils.toArray(".clo-bleed-line").forEach((line) => {
        gsap.fromTo(line.children, { xPercent: (i) => (i % 2 ? -12 : 12) }, {
          xPercent: 0, ease: "none", stagger: 0,
          scrollTrigger: { trigger: "[data-bleed-wrap]", start: "top 80%", end: "center 45%", scrub: true },
        });
      });

      // Closing photo drifts behind the last line.
      gsap.fromTo(".clo-close-bg img", { yPercent: -8 }, {
        yPercent: 8, ease: "none",
        scrollTrigger: { trigger: ".clo-close", start: "top bottom", end: "bottom top", scrub: true },
      });

      // Closing line slides in.
      gsap.from("[data-clo-slide]", {
        xPercent: 6, ease: "none",
        scrollTrigger: { trigger: ".clo-close", start: "top 95%", end: "top 45%", scrub: true },
      });

      // Day strip: desktop gets a gentle scroll-linked drift on the photos
      // inside their frames; phones keep the plain swipe.
      mm.add("(min-width: 900px)", () => {
        gsap.fromTo(".clo-feature .clo-film-poster", { scale: 1.12 }, {
          scale: 1, ease: "none",
          scrollTrigger: { trigger: ".clo-feature", start: "top bottom", end: "center center", scrub: true },
        });
      });
    }, root);

    // The day strip rides the page scroll — the day plays forward as you read
    // down — until the visitor takes hold of it (swipe, drag, bar or arrows).
    if (strip) {
      let auto = true;
      let lastSet = -1;
      const letGo = () => {
        if (!auto) return;
        auto = false;
        strip.classList.remove("is-auto");
        st.kill();
      };
      const st = ScrollTrigger.create({
        trigger: ".clo-day",
        start: "top 75%",
        end: "bottom 35%",
        onUpdate: (self) => {
          if (!auto) return;
          // A scroll position we did not set means the visitor moved it.
          if (lastSet >= 0 && Math.abs(strip.scrollLeft - lastSet) > 3) { letGo(); return; }
          strip.classList.add("is-auto");
          strip.scrollLeft = self.progress * maxScroll() * 0.72;
          lastSet = strip.scrollLeft;
        },
      });
      on(range, "pointerdown", letGo);
      on(range, "keydown", letGo);
      on(strip, "keydown", letGo);
      on(root.querySelector("[data-strip-prev]"), "pointerdown", letGo);
      on(root.querySelector("[data-strip-next]"), "pointerdown", letGo);
      on(strip, "pointerdown", (e) => { if (e.pointerType === "mouse") letGo(); });
      cleanups.push(() => st.kill());
    }

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const t = setTimeout(refresh, 1200);

    return () => {
      clearTimeout(t);
      window.removeEventListener("load", refresh);
      mm.revert();
      ctx.revert();
      cleanups.forEach((c) => c());
      root.classList.remove("is-js", "is-motion");
    };
  }, []);

  return null;
}
