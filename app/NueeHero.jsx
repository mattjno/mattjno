"use client";

import { useEffect, useRef, useState } from "react";

/* ----------------------------------------------------------------------------
   MATT.JNO — Hero « Nuée »
   Mur dense de photos (piochées au hasard dans /site.json, donc reflète
   automatiquement tes nouveaux albums) qui flotte, s'accélère et se disperse
   à mesure qu'on descend, pendant que le logo MATT JNO reste affiché.

   - Re-mélangé à chaque visite (Math.random).
   - Lit /site.json en direct => nouveaux albums pris en compte sans rien changer.
   - Miniatures via images.weserv.nl pour rester rapide malgré la densité.

   Intégration : voir le bas du fichier.
---------------------------------------------------------------------------- */

const ACCENT = "#e3a657";      // couleur d'accent (flèche)
const TILE_COUNT = 84;         // nb de photos uniques chargées
const TILE_W = 540;            // largeur des miniatures (px)
const LOGO = "Matt Jno";       // texte du logo
const SUBTITLE = "Scroll to explore";

const thumb = (src) =>
  `https://images.weserv.nl/?url=${encodeURIComponent(src.replace(/^https?:\/\//, ""))}&w=${TILE_W}&output=webp&q=72`;

function makeRng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function NueeHero() {
  const [tiles, setTiles] = useState([]);
  const heroRef = useRef(null);
  const nueeRef = useRef(null);
  const subRef = useRef(null);
  const nodes = useRef([]);
  const params = useRef([]);
  const P = useRef(0);
  const MX = useRef(0);
  const MY = useRef(0);

  // ── Données : piocher au hasard dans tous les albums ──────────────────────
  useEffect(() => {
    let alive = true;
    fetch("/site.json")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const all = [];
        (j.albums || []).forEach((a) => (a.photos || []).forEach((p) => { if (p.src) all.push(p); }));
        for (let i = all.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); const t = all[i]; all[i] = all[k]; all[k] = t; }
        const pool = all.slice(0, Math.min(TILE_COUNT, all.length));

        const rng = makeRng(7411);
        const R = (a, b) => a + (b - a) * rng();
        const COLS = 10, ROWS = 7, cw = 100 / COLS, ch = 100 / ROWS;
        const ps = [], ts = [];
        let n = 0;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const p = pool[n % pool.length]; n++;
            const left = (c + 0.5) * cw + R(-cw * 0.42, cw * 0.42);
            const top = (r + 0.5) * ch + R(-ch * 0.42, ch * 0.42);
            const sw = R(7, 13), sh = sw * R(1.04, 1.3);
            ps.push({ baseLeft: left, baseTop: top, freq: R(0.5, 1.4), phase: R(0, 6.28), ampX: R(5, 12), ampY: R(5, 12), parF: 5 + R(0, 14) });
            ts.push({ left, top, sw, sh, z: Math.round(sw * 4) + Math.floor(R(0, 5)), src: p ? thumb(p.src) : "", delay: R(0, 0.9) });
          }
        }
        params.current = ps;
        setTiles(ts);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // ── Scroll + souris + boucle d'animation ──────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const h = heroRef.current; if (!h) return;
      const rect = h.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      P.current = total > 0 ? Math.max(0, Math.min(1, -rect.top / total)) : 0;
    };
    const onMove = (e) => {
      const el = nueeRef.current; if (!el) return;
      const r = el.getBoundingClientRect();
      MX.current = ((e.clientX - r.left) / r.width - 0.5) * 2;
      MY.current = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMove);
    onScroll();

    let raf, last = null, T = 0;
    const loop = (ts) => {
      if (last == null) last = ts;
      const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
      const p = P.current, pe = p * p;
      T += dt * (1 + p * 9);
      const el = nueeRef.current;
      if (el) {
        const W = el.clientWidth, H = el.clientHeight;
        for (let i = 0; i < nodes.current.length; i++) {
          const node = nodes.current[i], tp = params.current[i];
          if (!node || !tp) continue;
          const oscX = Math.sin(T * tp.freq + tp.phase) * tp.ampX * (1 + p * 6);
          const oscY = Math.cos(T * tp.freq * 1.1 + tp.phase) * tp.ampY * (1 + p * 6);
          const pushX = ((tp.baseLeft - 50) / 100) * W * pe * 0.5;
          const pushY = ((tp.baseTop - 50) / 100) * H * pe * 0.5;
          const sc = 1 + pe * 0.3;
          node.style.transform = `translate(-50%,-50%) translate(${(pushX + oscX + MX.current * tp.parF).toFixed(1)}px,${(pushY + oscY + MY.current * tp.parF).toFixed(1)}px) scale(${sc.toFixed(3)})`;
        }
        el.style.opacity = p > 0.8 ? String(Math.max(0, 1 - (p - 0.8) / 0.2)) : "1";
      }
      if (subRef.current) subRef.current.style.opacity = String(Math.max(0, 1 - p * 2.6));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [tiles.length]);

  return (
    <section id="selection" ref={heroRef} style={{ position: "relative", height: "180vh", background: "#0a0a0a" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", background: "#0a0a0a" }}>

        <div ref={nueeRef} style={{ position: "absolute", inset: 0, zIndex: 1 }}>
          {tiles.map((t, i) => (
            <div
              key={i}
              ref={(el) => { nodes.current[i] = el; }}
              style={{
                position: "absolute", left: t.left.toFixed(2) + "%", top: t.top.toFixed(2) + "%",
                width: t.sw.toFixed(2) + "vmin", height: t.sh.toFixed(2) + "vmin", zIndex: t.z,
                transform: "translate(-50%,-50%)", willChange: "transform",
              }}
            >
              <div
                style={{
                  width: "100%", height: "100%", borderRadius: 2, overflow: "hidden",
                  backgroundImage: `url("${t.src}")`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#15140f",
                  boxShadow: "0 14px 38px -22px rgba(0,0,0,.85)",
                  animation: `mjpop .8s cubic-bezier(.34,1.56,.64,1) ${t.delay.toFixed(2)}s both`,
                }}
              />
            </div>
          ))}
        </div>

        <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", background: "linear-gradient(180deg, rgba(10,9,8,.5) 0%, rgba(10,9,8,.1) 24%, rgba(10,9,8,.1) 70%, rgba(10,9,8,.6) 100%)" }} />

        <div style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <h1 style={{ fontFamily: "'Anton', Impact, sans-serif", fontWeight: 400, fontSize: "clamp(64px,12vw,200px)", lineHeight: 0.82, textTransform: "uppercase", letterSpacing: "0.02em", margin: 0, color: "#f4efe6", textShadow: "0 6px 50px rgba(0,0,0,.85)" }}>{LOGO}</h1>
          <div ref={subRef} style={{ marginTop: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 13, letterSpacing: "0.34em", textTransform: "uppercase", color: "rgba(244,239,230,.88)", textShadow: "0 2px 14px rgba(0,0,0,.7)" }}>{SUBTITLE}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: ACCENT, animation: "mjnudge 2s ease-in-out infinite" }}>↓</div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes mjpop{0%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:scale(1)}}
        @keyframes mjnudge{0%,100%{transform:translateY(0);opacity:.7}50%{transform:translateY(7px);opacity:1}}
      `}</style>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   INTÉGRATION (dans app/page.jsx)

   1) Place ce fichier dans :  app/NueeHero.jsx
   2) En haut de page.jsx :    import NueeHero from "./NueeHero";
   3) Rends-le tout en haut, juste sous <header> … </header> :

        <NueeHero />

   4) (recommandé) Supprime l'ancienne section "Sélection" (le diaporama)
      et, si tu veux que la nuée soit la vraie page d'arrivée, l'ancien
      bloc <section> Hero "Matt Jno" — la nuée porte déjà le logo.

   5) Si tu utilises l'ancre de nav #selection, ajoute  id="selection"
      sur le <section> du composant (ligne `<section ref={heroRef} …>`).
---------------------------------------------------------------------------- */
