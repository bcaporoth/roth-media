"use client";

// The opening shot of the redesign: a classical bust in black space, lit with
// one warm key and one red rim, behind a giant word. Three.js is loaded from a
// CDN at runtime (no npm dep, so the Vercel build can't miss a lockfile entry).
// Idle: slow turn. Cursor: subtle follow. Scroll: it rotates away and shrinks
// as the word splits. Drop a CC0 bust at /public/models/bust.glb to replace the
// placeholder form. Reduced motion → still frame. WebGL off → canvas hidden.

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const THREE_URL = "https://esm.sh/three@0.170.0";
const GLTF_URL = "https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js";
const MODEL = "/models/bust.glb";

export default function Statue() {
  const wrap = useRef(null);

  useEffect(() => {
    const host = wrap.current;
    if (!host) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dead = false, raf = 0, renderer, cleanup = () => {};

    (async () => {
      let THREE, GLTFLoader;
      try {
        THREE = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ THREE_URL);
        ({ GLTFLoader } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ GLTF_URL));
      } catch { host.classList.add("is-off"); return; }
      if (dead) return;

      const canvas = host.querySelector("canvas");
      try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); }
      catch { host.classList.add("is-off"); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      camera.position.set(0, 0.15, 6);

      // Lighting: one warm key from the upper left, one hard red rim from behind right.
      scene.add(new THREE.AmbientLight(0xffffff, 0.08));
      const key = new THREE.DirectionalLight(0xfff1dd, 2.4); key.position.set(-3, 4, 4); scene.add(key);
      const rim = new THREE.DirectionalLight(0xb3121b, 6); rim.position.set(4, 1.5, -3); scene.add(rim);
      const fill = new THREE.PointLight(0xffffff, 0.8, 20); fill.position.set(2, -2, 4); scene.add(fill);

      const marble = new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.55, metalness: 0.02 });
      const rig = new THREE.Group(); scene.add(rig);

      // Placeholder form until a bust.glb lands: a sculptural knot in marble.
      const placeholder = new THREE.Mesh(new THREE.TorusKnotGeometry(0.9, 0.3, 220, 32, 2, 3), marble);
      rig.add(placeholder);

      new GLTFLoader().load(MODEL, (g) => {
        if (dead) return;
        const m = g.scene;
        m.traverse((o) => { if (o.isMesh) { o.material = marble; o.castShadow = false; } });
        // Normalize: center it, scale the tallest side to ~2.6 units.
        const box = new THREE.Box3().setFromObject(m);
        const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
        const s = 2.6 / Math.max(size.x, size.y, size.z);
        m.position.sub(c).multiplyScalar(s); m.scale.setScalar(s);
        rig.remove(placeholder); rig.add(m); host.classList.add("has-model");
      }, undefined, () => {});

      const size = () => {
        const w = host.clientWidth, h = host.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h; camera.updateProjectionMatrix();
        rig.position.x = w > 760 ? 0.9 : 0; // sits right of the word on desktop
      };
      size();
      window.addEventListener("resize", size);

      // Cursor follow (desktop only), eased in the loop.
      const want = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
      const onMove = (e) => { want.x = (e.clientX / window.innerWidth - 0.5) * 0.6; want.y = (e.clientY / window.innerHeight - 0.5) * 0.35; };
      if (!reduce && matchMedia("(pointer: fine)").matches) window.addEventListener("pointermove", onMove);

      // Scroll: a full turn + pull-back as the opening leaves.
      const scroll = { t: 0 };
      let st;
      if (!reduce) {
        gsap.registerPlugin(ScrollTrigger);
        st = ScrollTrigger.create({ trigger: host, start: "top top", end: "bottom top", scrub: 0.6, onUpdate: (s) => { scroll.t = s.progress; } });
      }

      const clock = new THREE.Clock();
      const loop = () => {
        const t = clock.getElapsedTime();
        cur.x += (want.x - cur.x) * 0.05; cur.y += (want.y - cur.y) * 0.05;
        rig.rotation.y = (reduce ? 0.4 : t * 0.12) + cur.x + scroll.t * Math.PI * 1.2;
        rig.rotation.x = cur.y - scroll.t * 0.3;
        const k = 1 - scroll.t * 0.45; rig.scale.setScalar(k);
        rig.position.y = 0.1 - scroll.t * 1.2;
        renderer.render(scene, camera);
        if (!reduce) raf = requestAnimationFrame(loop);
      };
      loop();
      if (reduce) renderer.render(scene, camera);
      host.classList.add("is-live");

      // Word split: the giant letters rise in, then the kicker + line follow.
      const letters = host.querySelectorAll(".cin-open-word span");
      if (letters.length && !reduce) {
        gsap.fromTo(letters, { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.045, delay: 0.15 });
        gsap.fromTo(host.querySelectorAll(".cin-open-fade"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, delay: 0.7 });
      }

      cleanup = () => {
        window.removeEventListener("resize", size); window.removeEventListener("pointermove", onMove);
        st && st.kill(); cancelAnimationFrame(raf);
        scene.traverse((o) => { o.geometry && o.geometry.dispose(); });
        marble.dispose(); renderer.dispose();
      };
    })();

    return () => { dead = true; cleanup(); };
  }, []);

  return (
    <section className="cin-open" id="top" data-ch="Opening" ref={wrap}>
      <canvas className="cin-open-canvas" aria-hidden="true" />
      <div className="cin-open-copy">
        <p className="cin-kick cin-open-fade">Films · Photography · Twin Tiers</p>
        <h1 className="cin-open-word" aria-label="Roth Media">
          <span className="cin-open-line">{"ROTH".split("").map((c, i) => <span key={i}><span>{c}</span></span>)}</span>
          <span className="cin-open-line cin-open-line--red">{"MEDIA".split("").map((c, i) => <span key={i}><span>{c}</span></span>)}</span>
        </h1>
        <p className="cin-open-sub cin-open-fade">Timeless films for people and businesses who want to be remembered.</p>
        <p className="cin-open-scroll cin-open-fade" aria-hidden="true"><span /> Scroll</p>
      </div>
    </section>
  );
}
