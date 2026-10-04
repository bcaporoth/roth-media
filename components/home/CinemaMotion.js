"use client";

// Scroll motion for the homepage (GSAP + ScrollTrigger). All enhancement:
// with JS off or "reduce motion" on, the page is fully visible and scrolls.

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const pad = (n) => String(n).padStart(2, "0");

export default function CinemaMotion() {
  useEffect(() => {
    const root = document.querySelector(".rm-cinema");
    if (!root) return;

    // Close the phone menu after a link tap (works without this too).
    const menu = root.querySelector(".cin-menu");
    const closeMenu = (e) => { if (menu && e.target.closest("a")) menu.removeAttribute("open"); };
    menu && menu.addEventListener("click", closeMenu);

    // Ambient loop: only fetch + play when the scene is on screen.
    const loops = [...root.querySelectorAll("video[data-loop-src]")];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let io;
    if (!reduce && "IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const v = en.target;
          if (en.isIntersecting) {
            if (!v.getAttribute("src")) v.setAttribute("src", v.dataset.loopSrc);
            v.play().catch(() => {});
          } else if (!v.paused) v.pause();
        });
      }, { rootMargin: "200px 0px" });
      loops.forEach((v) => {
        v.addEventListener("playing", () => v.classList.add("is-live"), { once: true });
        io.observe(v);
      });
    }

    if (reduce) return () => { menu && menu.removeEventListener("click", closeMenu); };

    gsap.registerPlugin(ScrollTrigger);
    root.classList.add("cin--js");
    const mm = gsap.matchMedia();

    const ctx = gsap.context(() => {
      // ── Scrub bar + timecode: the page as a film you scrub through. ──
      const bar = root.querySelector(".cin-scrub-fill");
      const tc = root.querySelector(".cin-tc");
      const RUNTIME = 228; // seconds shown on the timecode at the end of the page
      let last = "";
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          if (bar) gsap.set(bar, { scaleX: self.progress });
          if (tc) {
            const t = self.progress * RUNTIME;
            const s = `00:${pad(Math.floor(t / 60))}:${pad(Math.floor(t % 60))}:${pad(Math.floor((t % 1) * 24))}`;
            if (s !== last) { tc.textContent = s; last = s; }
          }
        },
      });

      // Chapter rail — light up the chapter you're in.
      const links = [...root.querySelectorAll(".cin-rail a")];
      const chName = root.querySelector(".cin-ch-name");
      gsap.utils.toArray("[data-ch]").forEach((sec) => {
        const set = () => {
          links.forEach((a) => a.classList.toggle("is-on", a.getAttribute("href") === `#${sec.dataset.rail || sec.id}`));
          if (chName) chName.textContent = sec.dataset.ch;
        };
        ScrollTrigger.create({ trigger: sec, start: "top 55%", end: "bottom 55%", onEnter: set, onEnterBack: set });
      });

      // Header gets a solid plate once you leave the opening shot.
      ScrollTrigger.create({
        start: 80,
        end: "max",
        // Stays on at the very bottom of the page too (isActive drops at "max").
        onToggle: (self) => root.classList.toggle("cin--scrolled", self.isActive || self.progress > 0),
      });

      // ── Opening shot: slow push-in while the title drifts up. ──
      gsap.to(".cin-hero-media", {
        scale: 1.14,
        yPercent: 4,
        ease: "none",
        scrollTrigger: { trigger: ".cin-hero", start: "top top", end: "bottom top", scrub: true },
      });
      mm.add("(min-width: 800px)", () => {
        gsap.to(".cin-hero-title", {
          yPercent: -14,
          ease: "none",
          scrollTrigger: { trigger: ".cin-hero", start: "top top", end: "bottom top", scrub: true },
        });
      });

      // ── Wedding reel: full-bleed stills cut over each other (CSS sticky);
      // each one keeps a slow pull-back the whole time it's on screen. ──
      const reel = root.querySelector(".cin-reel");
      gsap.utils.toArray(".cin-frame").forEach((frame, i) => {
        const h = () => frame.offsetHeight;
        const img = frame.querySelector(".cin-frame-media picture");
        const cap = frame.querySelector(".cin-sub");
        gsap.fromTo(img,
          { scale: 1.2 },
          {
            scale: 1,
            ease: "none",
            scrollTrigger: { trigger: reel, start: () => `top+=${i * h()} bottom`, end: () => `top+=${(i + 1) * h()} top`, scrub: true, invalidateOnRefresh: true },
          });
        if (cap) {
          gsap.fromTo(cap,
            { yPercent: 60 },
            {
              yPercent: 0, ease: "none",
              scrollTrigger: { trigger: reel, start: () => `top+=${i * h()} 70%`, end: () => `top+=${i * h()} 15%`, scrub: true, invalidateOnRefresh: true },
            });
        }
      });

      // ── Feature film: the screen grows to full width as it arrives. ──
      gsap.fromTo(".cin-screen",
        { scale: 0.9 },
        {
          scale: 1, ease: "none",
          scrollTrigger: { trigger: ".cin-screen", start: "top 100%", end: "top 45%", scrub: true },
        });

      // Full-bleed backdrops drift slower than the page.
      gsap.utils.toArray("[data-drift]").forEach((el) => {
        gsap.fromTo(el, { yPercent: -7, scale: 1.16 }, {
          yPercent: 7, scale: 1.16, ease: "none",
          scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
        });
      });

      // Title cards: lines rise out of their masks — quick, and started
      // early, so a headline is never caught half-revealed.
      gsap.utils.toArray(".cin-card-title").forEach((el) => {
        gsap.from(el.querySelectorAll(".cin-mask > span"), {
          yPercent: 112, duration: 0.5, ease: "power3.out", stagger: 0.05,
          scrollTrigger: { trigger: el, start: "top 104%", once: true },
        });
      });

      // Everything else: a short, quiet rise.
      gsap.utils.toArray(".cin-rise").forEach((el) => {
        gsap.from(el, {
          opacity: 0, y: 18, duration: 0.45, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 101%", once: true },
        });
      });

      // Credits roll in one line at a time.
      gsap.from(".cin-credits > *", {
        opacity: 0, y: 16, duration: 0.45, ease: "power2.out", stagger: 0.05,
        scrollTrigger: { trigger: ".cin-credits", start: "top 97%", once: true },
      });

      // ── Portrait filmstrip: on desktop the strip travels sideways as you
      // scroll past it. Phones keep a native swipe. ──
      mm.add("(min-width: 900px) and (hover: hover)", () => {
        const strip = root.querySelector(".cin-strip");
        const track = root.querySelector(".cin-strip-track");
        if (!strip || !track) return;
        strip.classList.add("is-driven");
        const dist = () => Math.max(0, track.scrollWidth - strip.clientWidth);
        const tween = gsap.fromTo(track, { x: 0 }, {
          x: () => -dist(), ease: "none",
          scrollTrigger: { trigger: strip, start: "top 85%", end: "bottom 15%", scrub: 0.5, invalidateOnRefresh: true },
        });
        return () => {
          tween.scrollTrigger && tween.scrollTrigger.kill();
          tween.kill();
          gsap.set(track, { clearProps: "transform" });
          strip.classList.remove("is-driven");
        };
      });
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const t = setTimeout(refresh, 1200);

    return () => {
      clearTimeout(t);
      window.removeEventListener("load", refresh);
      menu && menu.removeEventListener("click", closeMenu);
      io && io.disconnect();
      mm.revert();
      ctx.revert();
      root.classList.remove("cin--js", "cin--scrolled");
    };
  }, []);

  return null;
}
