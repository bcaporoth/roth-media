"use client";

// Scroll-driven motion for the /v2 homepage preview (GSAP + ScrollTrigger).
// Everything here is enhancement: with JS off, or "reduce motion" on, the page
// renders fully visible and simply scrolls.

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function V2Motion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);

    const root = document.querySelector(".v2");
    if (!root) return;

    // Split the statement into words so each can light up on its own.
    const wordsEl = root.querySelector("[data-v2-words]");
    const original = wordsEl ? wordsEl.textContent : "";
    if (wordsEl) {
      wordsEl.setAttribute("aria-label", original.trim().replace(/\s+/g, " "));
      wordsEl.innerHTML = original
        .trim()
        .split(/\s+/)
        .map((w) => `<span class="v2-word" aria-hidden="true">${w}</span>`)
        .join(" ");
    }

    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      // Hero — headline lines rise out of their masks, the rest fades up.
      gsap.from(".v2-line > span", {
        yPercent: 110,
        duration: 1.15,
        ease: "power4.out",
        stagger: 0.11,
        delay: 0.15,
      });
      gsap.from(".v2-hero-fade", {
        opacity: 0,
        y: 24,
        duration: 0.9,
        ease: "power2.out",
        stagger: 0.12,
        delay: 0.75,
      });

      // Hero — the film eases back and the copy lifts away as you scroll off.
      gsap.fromTo(
        ".v2-hero-media",
        { scale: 1.14 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: ".v2-hero", start: "top top", end: "bottom top", scrub: true },
        }
      );
      gsap.to(".v2-hero-inner", {
        yPercent: -14,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: { trigger: ".v2-hero", start: "top top", end: "bottom top", scrub: true },
      });

      // Statement — words go from faint to full ink as they pass.
      gsap.fromTo(
        ".v2-word",
        { opacity: 0.16 },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.08,
          scrollTrigger: { trigger: ".v2-statement", start: "top 72%", end: "bottom 62%", scrub: true },
        }
      );

      // Generic rise-in for headings and copy blocks.
      gsap.utils.toArray(".v2-rise").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 36,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      // Feature film — starts inset and rounded, opens to full width.
      gsap.fromTo(
        ".v2-feature",
        { scale: 0.82, opacity: 0.6 },
        {
          scale: 1,
          opacity: 1,
          ease: "none",
          scrollTrigger: { trigger: ".v2-feature", start: "top 95%", end: "top 30%", scrub: true },
        }
      );

      // About photo — slow parallax inside its frame.
      gsap.fromTo(
        ".v2-about-photo img",
        { yPercent: -8 },
        {
          yPercent: 8,
          ease: "none",
          scrollTrigger: { trigger: ".v2-about-photo", start: "top bottom", end: "bottom top", scrub: true },
        }
      );

      // Footer line slides in from the right.
      gsap.from("[data-v2-slide]", {
        xPercent: 18,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: ".v2-footer", start: "top 95%", end: "top 45%", scrub: true },
      });

      // Work — on desktop the section pins and the photos travel sideways.
      // Phones keep a native swipe (see v2.css), which feels better there.
      mm.add("(min-width: 900px)", () => {
        const track = root.querySelector(".v2-track");
        const pin = root.querySelector(".v2-work-pin");
        if (!track || !pin) return;
        root.classList.add("v2--pinwork");
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: pin,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });
        return () => {
          tween.scrollTrigger && tween.scrollTrigger.kill();
          tween.kill();
          gsap.set(track, { clearProps: "transform" });
          root.classList.remove("v2--pinwork");
        };
      });
    }, root);

    // Images and fonts change layout after first paint; re-measure once.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const t = setTimeout(refresh, 1200);

    return () => {
      clearTimeout(t);
      window.removeEventListener("load", refresh);
      mm.revert();
      ctx.revert();
      if (wordsEl) {
        wordsEl.textContent = original;
        wordsEl.removeAttribute("aria-label");
      }
    };
  }, []);

  return null;
}
