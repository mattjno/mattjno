"use client";

// Le boîtier de Matthieu, deux fois : le chargement vu dans le viseur, et le curseur, son collimateur d'autofocus.

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Pic from "./Pic";

export const SEEN = "mj-seen"; // déjà chargé dans cet onglet : le chargement ne se rejoue pas (posé aussi par layout.js)
const MIN = 1400; // le chargement dure au moins…
const MAX = 4500; // …et jamais plus, même si une photo traîne
const STEP = 340; // une photo de la rafale toutes les 340 ms : moins de trois changements par seconde, pas de clignotement
const SHOTS = 208; // vues restantes au départ, comme sur l'écran du boîtier
const RATE = 40; // le compteur descend d'une vue toutes les 40 ms : la rafale à 25 images par seconde

// Chargement : le viseur, pendant que le site se charge. Les photos passent comme une rafale, floues puis nettes
// à mesure que le tampon se remplit (pourcentage rouge, jauge) ; le compteur de vues descend. À 100 %, le collimateur
// accroche (vert), l'obturateur claque et se rouvre sur l'accueil.
export function Loader({ shots, onDone }) {
  const root = useRef(null);
  const pctRef = useRef(null);
  const countRef = useRef(null);

  useEffect(() => {
    const el = root.current;
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN) === "1"; } catch {}
    if (seen) { onDone(); return; }
    // Le chargement s'ouvre sur l'accueil, pas là où le navigateur aurait rendu la page
    try { history.scrollRestoration = "manual"; } catch {}
    window.scrollTo(0, 0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frames = [...el.querySelectorAll(".ld-shot")];
    const blades = [...el.querySelectorAll(".ld-shutter span")];
    const bars = [...el.querySelectorAll(".ld-gauge i")];
    // Ce qu'il faut avoir avant d'ouvrir : l'image de l'accueil et les trois premières de la rafale (les autres
    // arrivent pendant qu'elle tourne ; elle ne passe que par des photos chargées, jamais par un cadre noir)
    const loaded = (img) => img && img.complete && img.naturalWidth > 0;
    const imgs = [...document.querySelectorAll(".pf-hero [data-boot] img"), ...frames.slice(0, 3).map((f) => f.querySelector("img"))].filter(Boolean);
    const t0 = performance.now();
    let shown = 0;
    let cur = 0;
    let last = t0;
    let prev = t0;
    let raf = 0;
    let tl = null;

    gsap.set(blades, { scaleY: 0 });
    const finish = () => {
      el.classList.add("is-lock");
      tl = gsap.timeline({ onComplete: () => { try { sessionStorage.setItem(SEEN, "1"); } catch {} onDone(); } });
      if (reduce) {
        tl.to(el, { opacity: 0, duration: 0.4, delay: 0.2 });
        return;
      }
      // Le temps de voir l'accroche verte, puis le déclic : rideaux fermés, le viseur disparaît, ils s'ouvrent sur l'accueil
      tl.to(blades, { scaleY: 1, duration: 0.07, ease: "power2.in" }, 0.32)
        .add(() => el.classList.add("is-open"))
        .to(blades, { scaleY: 0, duration: 0.2, ease: "power2.out" }, "+=0.06");
    };

    const tick = (now) => {
      const ready = imgs.length ? imgs.filter(loaded).length / imgs.length : 1;
      const elapsed = now - t0;
      const target = elapsed > MAX ? 1 : Math.min(ready, elapsed / MIN);
      // Le pourcentage rattrape le réel au même rythme quelle que soit la cadence de l'écran
      shown += (target - shown) * (1 - Math.exp(-(now - prev) / 160));
      prev = now;
      if (target === 1 && shown > 0.995) shown = 1;
      pctRef.current.textContent = `${Math.round(shown * 100)}%`;
      countRef.current.textContent = String(Math.max(0, SHOTS - Math.floor(elapsed / RATE)));
      bars.forEach((b, i) => b.classList.toggle("is-on", shown * bars.length > i + 0.5));
      el.style.setProperty("--focus", shown.toFixed(3));
      if (!reduce && frames.length > 1 && now - last > STEP) {
        const next = (cur + 1) % frames.length;
        if (loaded(frames[next].querySelector("img"))) {
          frames[cur].classList.remove("is-on");
          frames[next].classList.add("is-on");
          cur = next;
        }
        last = now;
      }
      if (shown >= 1) finish();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); if (tl) tl.kill(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ld" ref={root} aria-hidden="true">
      <div className="ld-view">
        <div className="ld-frame">
          {shots.map((p, i) => (
            <div className={`ld-shot${i === 0 ? " is-on" : ""}`} key={p.src}>
              <Pic p={p} sizes="(min-width: 760px) 64vw, 92vw" quality={70} loading="eager" focal />
            </div>
          ))}
          <div className="ld-ui">
            <div className="ld-row">
              <span className="ld-count" ref={countRef}>{SHOTS}</span>
              <span>3:2</span>
              <span>RAW</span>
              <span className="ld-grow">AF-C</span>
              <span>MATT.JNO</span>
            </div>
            <span className="ld-af"><i /><i /><i /><i /></span>
            <div className="ld-row">
              <span>1/2000</span>
              <span>F2.8</span>
              <span>±0.0</span>
              <span className="ld-grow">ISO 3200</span>
              <span className="ld-gauge">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</span>
              <span className="ld-pct" ref={pctRef}>0%</span>
            </div>
          </div>
        </div>
      </div>
      <div className="ld-shutter"><span /><span /></div>
    </div>
  );
}

// Curseur : le collimateur du boîtier, rouge. Sur un lien, un bouton ou une photo, l'autofocus accroche : il passe au
// vert et se resserre. Enfoncé, il se pince comme le déclencheur à mi-course. Seulement avec une souris.
const HOT = "a, button, label, summary, [role='button']";
const TEXT = "input, textarea, select";

export function FocusCursor() {
  const ref = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mq.matches) return;
    const el = ref.current;
    const html = document.documentElement;
    html.classList.add("has-cursor");
    let x = -100;
    let y = -100;
    let raf = 0;
    const place = () => { raf = 0; el.style.transform = `translate3d(${x}px, ${y}px, 0)`; };
    const aim = (t) => {
      el.classList.toggle("is-lock", !!t?.closest(HOT));
      el.classList.toggle("is-text", !!t?.closest(TEXT));
    };
    const move = (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(place);
      aim(e.target instanceof Element ? e.target : null);
      el.classList.add("is-on");
    };
    // La page défile sous le curseur immobile : ce qu'il vise a changé
    let pending = 0;
    const scroll = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => { pending = 0; aim(document.elementFromPoint(x, y)); });
    };
    const away = () => el.classList.remove("is-on");
    const down = () => el.classList.add("is-press");
    const up = () => el.classList.remove("is-press");
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    html.addEventListener("mouseleave", away);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(pending);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      html.removeEventListener("mouseleave", away);
      html.classList.remove("has-cursor");
    };
  }, []);

  return (
    <div className="fc" ref={ref} aria-hidden="true">
      <span className="fc-box"><i /><i /><i /><i /></span>
    </div>
  );
}
