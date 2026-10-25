"use client";

// Le chargement (MATTJNO, à la manière de landonorris.com) et le curseur, le collimateur d'autofocus du boîtier.

import { useEffect, useRef } from "react";
import gsap from "gsap";

export const SEEN = "mj-seen"; // déjà chargé dans cet onglet : le chargement ne se rejoue pas (posé aussi par layout.js)
const MIN = 1200; // le chargement dure au moins…
const MAX = 4500; // …et jamais plus, même si une photo traîne
const WORD = "MATTJNO";
const DIVE = 3; // la lettre où l'on plonge : le second T, dont la hampe large remplit l'écran une fois agrandie

// Chargement : un écran clair, MATTJNO en noir qui se lève lettre après lettre, l'avancement en bas. L'écran est en
// mode « superposition » (screen) : son blanc reste blanc, son noir laisse voir la page. Les lettres sont donc déjà
// des fenêtres sur l'accueil, encore noir derrière. Tout chargé, l'accueil se joue (onReveal) et l'on plonge dans la
// hampe du second T jusqu'à ce qu'elle couvre l'écran ; le chargement a disparu (onDone).
export function Loader({ onReveal, onDone }) {
  const root = useRef(null);
  const word = useRef(null);
  const pct = useRef(null);

  useEffect(() => {
    const el = root.current;
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN) === "1"; } catch {}
    if (seen) { onReveal(); onDone(); return; }
    // Le chargement s'ouvre sur l'accueil, pas là où le navigateur aurait rendu la page
    try { history.scrollRestoration = "manual"; } catch {}
    window.scrollTo(0, 0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Les lettres se lèvent en CSS dès le premier affichage (site.css) : on attend seulement qu'elles soient en place
    const letters = [...word.current.querySelectorAll(".ld-l > span")];
    const rising = () => letters.some((l) => l.getAnimations().some((a) => a.playState === "running"));
    // Ce qu'il faut avoir avant d'ouvrir : l'image de l'accueil
    const imgs = [...document.querySelectorAll(".pf-hero [data-boot] img")];
    const loaded = (img) => img.complete && img.naturalWidth > 0;
    const t0 = performance.now();
    let shown = 0;
    let prev = t0;
    let raf = 0;
    let tl = null;

    const finish = () => {
      const done = () => { try { sessionStorage.setItem(SEEN, "1"); } catch {} onDone(); };
      if (reduce) {
        onReveal();
        tl = gsap.timeline({ onComplete: done }).to(el, { opacity: 0, duration: 0.5 });
        return;
      }
      // La photo de l'accueil paraît tout de suite dans les lettres ; le nom et le reste, une fois l'écran couvert
      // (is-dive, site.css)
      document.documentElement.classList.add("is-dive");
      onReveal();
      // Le centre de la hampe du T, mesuré sur le dessin réel de la lettre (police chargée)
      const box = word.current.getBoundingClientRect();
      const t = word.current.querySelectorAll(".ld-l")[DIVE].getBoundingClientRect();
      const cs = getComputedStyle(word.current);
      const ctx = document.createElement("canvas").getContext("2d");
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = ctx.measureText("T");
      const x = t.left + (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2 - box.left;
      const y = t.top + t.height * 0.6 - box.top;
      gsap.set(word.current, { transformOrigin: `${x.toFixed(1)}px ${y.toFixed(1)}px` });
      tl = gsap.timeline({ onComplete: done })
        .to(pct.current, { opacity: 0, duration: 0.2 }, 0)
        .to(word.current, { scale: 90, duration: 0.95, ease: "power4.in" }, 0.15)
        .set(el, { opacity: 0 });
    };

    const tick = (now) => {
      const ready = imgs.length ? imgs.filter(loaded).length / imgs.length : 1;
      const elapsed = now - t0;
      const target = elapsed > MAX ? 1 : Math.min(ready, elapsed / MIN);
      // Le pourcentage rattrape le réel au même rythme quelle que soit la cadence de l'écran
      shown += (target - shown) * (1 - Math.exp(-(now - prev) / 160));
      prev = now;
      if (target === 1 && shown > 0.995) shown = 1;
      pct.current.textContent = `Chargement ${Math.round(shown * 100)}\u202f%`;
      if (shown >= 1 && !rising()) finish();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); if (tl) tl.kill(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ld" ref={root} aria-hidden="true">
      <p className="ld-word" ref={word}>
        {WORD.split("").map((c, i) => <span className="ld-l" key={i}><span style={{ "--i": i }}>{c}</span></span>)}
      </p>
      <p className="ld-pct" ref={pct}>{"Chargement 0\u202f%"}</p>
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
