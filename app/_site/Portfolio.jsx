"use client";

// Version A : la v3 corrigée et resserrée. Un chapitre par sport, une fenêtre qui s'ouvre depuis le geste,
// une grille par sport, une visionneuse plein écran. Les photos ne sont jamais modifiées : seuls leurs cadres bougent.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "@fontsource-variable/instrument-sans";
import Viewer from "./Viewer";
import { pack, span } from "./pack";
import "./site.css";

const INSTAGRAM = "https://instagram.com/matt.jno";
const HERO_INTERVAL = 5500;
// Ouvertures de chapitre : un peu plus vif qu'à l'accueil, on y passe moins de temps
const CHAPTER_INTERVAL = 4500;
const LOCAL = process.env.NEXT_PUBLIC_LOCAL_IMG === "1";
// Grands écrans où les scènes tenues ont la place de jouer (la tablette en portrait suit le téléphone)
const WIDE = "(min-width: 1024px) and (min-height: 560px)";

// Colonnes des galeries : 2 sur téléphone, 4, puis 5 sur grand écran
const XL = "(min-width: 1700px)";
const PHONE = "(max-width: 759px)";

const SIZES = {
  1: "(min-width: 1700px) 19vw, (min-width: 760px) 24vw, 48vw",
  2: "(min-width: 1700px) 39vw, (min-width: 760px) 49vw, 100vw",
  3: "(min-width: 1700px) 59vw, (min-width: 760px) 74vw, 100vw",
  side: "(min-width: 1700px) 19vw, (min-width: 1024px) 24vw, (min-width: 760px) 30vw, 44vw",
  sideWide: "(min-width: 1024px) 60vw, 94vw",
  feature: "(min-width: 1700px) 40vw, (min-width: 760px) 50vw, 100vw",
};

const ratio = (p) => +(p.w / p.h).toFixed(4);

// Lettre O d'Instrument Sans en graisse 700, en em depuis l'origine du caractère : centre du trait gauche,
// sa largeur à mi-hauteur, et cette mi-hauteur au-dessus de la ligne de base (mesuré au canevas).
const O_STROKE = { x: 0.108, w: 0.155, y: 0.36 };

// Galerie d'un chapitre pour `cols` colonnes. Trop peu de photos pour une rangée complète : on essaie avec moins de colonnes.
function galleryOf(ch, cols) {
  const base = { id: ch.id, sport: ch.full ?? ch.name };
  if (ch.kind === "side") {
    const items = ch.series.map((p) => ({ p, s: span(p) })).filter((x) => x.s > 0).slice(0, ch.cells);
    return { ...base, cols, items };
  }
  for (const c of [...new Set([cols, 4, 2])].filter((c) => c <= cols)) {
    const items = pack(ch.series, c, { rows: Math.floor(ch.cells / c), feature: ch.kind === "mosaic" });
    if (items.length) return { ...base, cols: c, items };
  }
  return { ...base, cols, items: [] };
}

// Ouverture de chapitre : les paysages du sport se succèdent en fondu, comme à l'accueil, une fois la fenêtre
// grande ouverte et tant qu'elle est à l'écran. Quand elle se referme, elle revient à sa première photo.
function cycler(open) {
  const slides = [...open.querySelectorAll(".ch-slide")];
  slides.forEach((el, i) => el.classList.toggle("is-on", i === 0));
  let cur = 0;
  let timer = null;
  let opened = false;
  let seen = false;
  const show = (i) => {
    if (i === cur) return;
    slides[cur].classList.remove("is-on");
    slides[i].classList.add("is-on");
    cur = i;
  };
  const next = () => {
    const i = (cur + 1) % slides.length;
    const img = slides[i].querySelector("img");
    if (img && !img.complete) return; // pas encore chargée : on attend le tour suivant
    show(i);
  };
  const sync = () => {
    const run = slides.length > 1 && opened && seen && !document.hidden;
    if (run && !timer) timer = setInterval(next, CHAPTER_INTERVAL);
    else if (!run && timer) { clearInterval(timer); timer = null; }
  };
  return {
    open(v) { if (v === opened) return; opened = v; if (!v) show(0); sync(); },
    seen(v) { seen = v; sync(); },
    sync,
    stop() { clearInterval(timer); timer = null; },
  };
}

function Pic({ p, sizes, priority = false, quality = 80, alt = "", focal = false }) {
  const src = LOCAL && p.i != null ? `/_local/v/${p.i}.jpg` : p.src;
  const style = focal && p.fx != null ? { objectPosition: `${p.fx}% ${p.fy}%` } : undefined;
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} quality={quality} unoptimized={LOCAL} style={style} draggable={false} />;
}

// Fenêtre de départ de l'ouverture : centrée sur le point d'action de la photo, sans toucher la zone du titre.
// Renvoie les retraits haut, droite, bas, gauche en % de l'écran.
function startWindow(fx = 50, fy = 50) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const portrait = vw / vh < 1;
  const ww = (portrait ? 0.8 : 0.4) * vw;
  const wh = (portrait ? 0.44 : 0.46) * vh;
  const margin = Math.min(32, Math.max(16, vw * 0.022));
  const minTop = 0.12 * vh;
  const maxBottom = (portrait ? 0.66 : 0.72) * vh;
  // Avec object-position au point d'action, ce point tombe à fx % de la largeur et fy % de la hauteur de l'écran
  const cx = Math.min(Math.max((fx / 100) * vw, margin + ww / 2), vw - margin - ww / 2);
  const cy = Math.min(Math.max((fy / 100) * vh, minTop + wh / 2), maxBottom - wh / 2);
  const top = cy - wh / 2;
  const left = cx - ww / 2;
  return [(100 * top) / vh, (100 * (vw - left - ww)) / vw, (100 * (vh - top - wh)) / vh, (100 * left) / vw];
}

// Découpe à l'avancement p (0 : fenêtre de départ, 1 : plein écran)
const insetAt = (s, p) => `inset(${s.map((v) => `${(v * (1 - p)).toFixed(3)}%`).join(" ")})`;

function Opener({ ch, count }) {
  const first = ch.slides[0];
  return (
    <div className="ch-open" style={{ "--hold": ch.hold }} data-fx={first.fx ?? 50} data-fy={first.fy ?? 50}>
      <div className="ch-stage">
        <div className="ch-win">
          {ch.slides.map((p, i) => (
            <div className={`ch-slide${i === 0 ? " is-on" : ""}`} key={p.src} aria-hidden={i > 0 ? "true" : undefined}>
              <div className="pf-fill" style={{ transformOrigin: `${p.fx ?? 50}% ${p.fy ?? 50}%` }}>
                <Pic p={p} sizes="100vw" quality={82} focal alt={i === 0 ? `${ch.full ?? ch.name}, photo d'ouverture` : ""} />
              </div>
            </div>
          ))}
        </div>
        <div className="ch-scrim" />
        <div className={`ch-text${ch.kind === "grid" ? " is-bare" : ""}`}>
          <h2 className="ch-title" id={`${ch.id}-h`}>{ch.full ?? ch.name}</h2>
          <p className="ch-meta"><strong>{count} photos</strong></p>
        </div>
      </div>
    </div>
  );
}

// Vignette cliquable : ouvre la visionneuse
function Frame({ g, k, p, sizes, className, onOpen, register, quality = 80 }) {
  return (
    <button
      type="button"
      className={`${className} hv pf-btn`}
      ref={register(g.id, k)}
      onClick={(e) => onOpen(g, k, e.currentTarget, sizes)}
      aria-label={`Agrandir la photo ${k + 1} sur ${g.items.length}, ${g.sport}`}
    >
      <span className="pf-fill"><Pic p={p} sizes={sizes} quality={quality} focal /></span>
    </button>
  );
}

// Case de grille : portrait sur 1 colonne, paysage sur 2, panoramique sur 3, tous à la hauteur d'un portrait.
// Seul sur sa rangée (téléphone), un paysage garde son format d'origine.
function Tile({ g, k, x, pre, ...f }) {
  const { p, s, feature } = x;
  const full = !feature && s > 1 && s >= g.cols;
  const sizes = feature ? SIZES.feature : SIZES[Math.min(s, 3)];
  const cls = `${pre}-item${s > 1 && !feature ? " is-wide" : ""}${full ? " is-full" : ""}${feature ? " mo-feature" : ""}`;
  return (
    <figure className={cls} style={s > 1 && !feature ? { "--s": s, "--r": ratio(p) } : undefined}>
      <Frame g={g} k={k} p={p} sizes={sizes} quality={feature ? 85 : 80} className={`${pre}-frame`} {...f} />
    </figure>
  );
}

// Football : le nom du sport en lettres géantes, découpées sur la grille. On plonge dans le O jusqu'à la révéler.
function Dive({ word }) {
  const half = Math.ceil(word.length / 2);
  const a = word.slice(0, half);
  const k = Math.max(0, a.indexOf("O"));
  return (
    <div className="fg-dive" aria-hidden="true">
      <p className="fg-word">
        <span className="fg-l">{a.slice(0, k)}<span className="fg-o">{a[k]}<i className="fg-base" /></span>{a.slice(k + 1)}</span>
        <span className="fg-l">{word.slice(half)}</span>
      </p>
    </div>
  );
}

// Football (grille), basket (rangées qui glissent), football américain (mosaïque)
const PRE = { grid: "fg", rows: "ro", mosaic: "mo" };

function Cells({ g, kind, cols, ...f }) {
  const pre = PRE[kind];
  return (
    <div className={pre}>
      {kind === "grid" && <Dive word={g.sport.toUpperCase()} />}
      <div className={`${pre}-grid`} style={g.cols !== cols ? { "--cols": g.cols } : undefined}>
        {g.items.map((x, k) => <Tile key={x.p.src} g={g} k={k} x={x} pre={pre} {...f} />)}
      </div>
    </div>
  );
}

// Handball : galerie latérale, chaque photo à sa largeur naturelle pour une même hauteur
function Side({ g, ...f }) {
  return (
    <div className="sg">
      <div className="sg-stage">
        <div className="sg-window">
          <ul className="sg-track">
            {g.items.map(({ p, s }, k) => (
              <li className={`sg-item${s > 1 ? " is-wide" : ""}`} key={p.src} style={s > 1 ? { "--r": ratio(p) } : undefined}>
                <figure>
                  <Frame g={g} k={k} p={p} sizes={s > 1 ? SIZES.sideWide : SIZES.side} className="sg-frame" {...f} />
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function Portfolio({ hero: HERO, chapters: CHAPTERS }) {
  const root = useRef(null);
  const navRef = useRef(null);
  const menuRef = useRef(null);
  const lenisRef = useRef(null);
  const reduceRef = useRef(false);
  const frames = useRef(new Map());
  const [slide, setSlide] = useState(0);
  const [cstatus, setCstatus] = useState("idle");
  const [active, setActive] = useState(null);
  const [menu, setMenu] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [cols, setCols] = useState(4);

  useEffect(() => {
    const xl = window.matchMedia(XL);
    const phone = window.matchMedia(PHONE);
    const set = () => setCols(xl.matches ? 5 : phone.matches ? 2 : 4);
    set();
    xl.addEventListener("change", set);
    phone.addEventListener("change", set);
    return () => { xl.removeEventListener("change", set); phone.removeEventListener("change", set); };
  }, []);

  // Galeries rangées pour le nombre de colonnes de l'écran
  const galleries = useMemo(() => CHAPTERS.map((ch) => galleryOf(ch, cols)), [CHAPTERS, cols]);

  const register = useCallback((id, k) => (el) => {
    if (el) frames.current.set(`${id}:${k}`, el);
    else frames.current.delete(`${id}:${k}`);
  }, []);

  // Hero : fondu enchaîné, en pause quand l'onglet est caché
  useEffect(() => {
    let id = null;
    const start = () => { if (!id) id = setInterval(() => setSlide((s) => (s + 1) % HERO.length), HERO_INTERVAL); };
    const stop = () => { clearInterval(id); id = null; };
    const vis = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", vis);
    return () => { stop(); document.removeEventListener("visibilitychange", vis); };
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reduceRef.current = reduce;
    const wide = window.matchMedia(WIDE).matches;
    let lenis = null;
    const tick = (t) => lenis && lenis.raf(t * 1000);
    if (!reduce) {
      lenis = new Lenis({ lerp: 0.12 });
      lenisRef.current = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }
    const nav = navRef.current;

    // Fondus des ouvertures de chapitre, en pause quand l'onglet est caché
    const cyclers = [];
    const onVisibility = () => cyclers.forEach((c) => c.sync());
    document.addEventListener("visibilitychange", onVisibility);
    const watch = (open) => {
      const c = cycler(open);
      cyclers.push(c);
      ScrollTrigger.create({ trigger: open, start: "top bottom", end: "bottom top", onToggle: (self) => c.seen(self.isActive) });
      return c;
    };

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);

      // ---------- Bandeau : discret en descendant, revient en remontant, chapitre en cours souligné ----------
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          const past = self.scroll() > window.innerHeight * 0.6;
          nav.classList.toggle("is-solid", past);
          nav.classList.toggle("is-hidden", past && self.direction === 1);
        },
      });
      [...CHAPTERS.map((c) => c.id), "contact"].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        ScrollTrigger.create({ trigger: el, start: "top 55%", end: "bottom 55%", onToggle: (self) => self.isActive && setActive(id) });
      });
      ScrollTrigger.create({ trigger: q(".p-hero")[0], start: "top top", end: "bottom 55%", onToggle: (self) => self.isActive && setActive(null) });

      // Mouvement réduit : pas de déplacement, seulement des apparitions en fondu (les ouvertures, déjà ouvertes, gardent leurs fondus)
      if (reduce) {
        q(".ch-open").forEach((open) => watch(open).open(true));
        ScrollTrigger.batch(q(".fg-item, .ro-item, .mo-item, .sg-item, .ch-text"), {
          start: "top 92%", once: true,
          onEnter: (batch) => gsap.fromTo(batch, { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.05, ease: "power1.out" }),
        });
        return;
      }

      // ---------- Hero qui recule ----------
      const hero = q(".p-hero")[0];
      gsap.to(q(".p-hero__media"), { yPercent: 8, scale: 1.06, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
      gsap.to(q(".p-hero__dim"), { opacity: 0.45, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
      gsap.to(q(".p-hero__text"), { yPercent: -30, opacity: 0, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "70% top", scrub: true } });

      // ---------- Chapitres, dans l'ordre de la page : chaque déclencheur est calculé après ceux du dessus ----------
      CHAPTERS.forEach((ch) => {
        const section = document.getElementById(ch.id);
        const open = section.querySelector(".ch-open");
        const win = open.querySelector(".ch-win");
        const fill = open.querySelector(".ch-win .pf-fill");
        const fx = Number(open.dataset.fx);
        const fy = Number(open.dataset.fy);
        const slides = watch(open);

        // La fenêtre s'ouvre depuis le geste jusqu'au plein écran. La découpe est calculée ici à chaque image :
        // laissée à l'interpolation de GSAP, elle perdait un côté ou se déformait selon l'arrondi des valeurs.
        let start = startWindow(fx, fy);
        const state = { p: 0 };
        const paint = () => { win.style.clipPath = insetAt(start, state.p); };
        paint();
        if (wide) {
          // Grand écran : la fenêtre suit le défilement ; grande ouverte (fin de l'ouverture), les photos se succèdent
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: open, start: "top top", end: "bottom bottom", scrub: true,
              onUpdate: (self) => slides.open(self.progress > 0.8),
              onRefresh: (self) => { start = startWindow(fx, fy); paint(); slides.open(self.progress > 0.8); },
            },
            defaults: { ease: "none" },
          });
          tl.to(state, { p: 1, duration: 1, onUpdate: paint }, 0)
            .fromTo(fill, { scale: 1.25 }, { scale: 1, duration: 1, immediateRender: true }, 0)
            .to(open.querySelector(".ch-scrim"), { opacity: 1, duration: 0.4 }, 0.6)
            .to({}, { duration: 0.2 });
        } else {
          // Téléphone et tablette : au doigt, l'élan ferait passer l'ouverture en un éclair. Elle se joue donc
          // d'elle-même, en un temps fixe, dès que la fenêtre est à l'écran, et se referme si l'on remonte.
          gsap.set(fill, { scale: 1.25 });
          const tl = gsap.timeline({ paused: true, onComplete: () => slides.open(true) });
          tl.to(state, { p: 1, duration: 1.3, ease: "power3.inOut", onUpdate: paint }, 0)
            .to(fill, { scale: 1, duration: 1.6, ease: "expo.out" }, 0)
            .to(open.querySelector(".ch-scrim"), { opacity: 1, duration: 0.6, ease: "power1.out" }, 0.7);
          ScrollTrigger.create({
            trigger: open, start: "top 40%",
            onEnter: () => tl.play(), onLeaveBack: () => { slides.open(false); tl.reverse(); },
            onRefresh: () => { start = startWindow(fx, fy); paint(); },
          });
        }
        gsap.from(open.querySelectorAll(".ch-title, .ch-meta"), {
          yPercent: 30, opacity: 0, duration: 1, stagger: 0.08, ease: "expo.out",
          scrollTrigger: { trigger: open, start: "top 70%" },
        });

        // Football : on plonge dans le O du mot géant, découpé sur la grille, jusqu'à la révéler entière
        if (ch.kind === "grid") {
          const fg = section.querySelector(".fg");
          const grid = fg.querySelector(".fg-grid");
          const dive = fg.querySelector(".fg-dive");
          const diving = dive && getComputedStyle(dive).display !== "none";

          // Les photos du premier écran sont déjà visibles dans les lettres ; les suivantes montent dans leur cadre
          const gridTop = grid.getBoundingClientRect().top;
          const later = [...grid.querySelectorAll(".fg-item")].filter((el) => !diving || el.getBoundingClientRect().top - gridTop > window.innerHeight * 0.55);
          ScrollTrigger.batch(later, {
            start: "top 92%", once: true,
            onEnter: (batch) => {
              gsap.fromTo(batch.map((b) => b.querySelector(".fg-frame")), { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, stagger: 0.08, ease: "expo.out" });
              gsap.fromTo(batch.map((b) => b.querySelector(".pf-fill")), { scale: 1.2 }, { scale: 1, duration: 1.5, stagger: 0.08, ease: "expo.out" });
            },
          });

          if (diving) {
            const o = dive.querySelector(".fg-o");
            const base = dive.querySelector(".fg-base");
            const word = dive.querySelector(".fg-word");
            let geo = null;
            // Le mot doit tomber sur des photos : s'il chevauche l'espace entre deux rangées, il se cale sur la plus proche
            const place = (box) => {
              word.style.transform = "";
              const w = word.getBoundingClientRect();
              const rows = [];
              grid.querySelectorAll(".fg-frame").forEach((f) => {
                const r = f.getBoundingClientRect();
                if (r.top < box.bottom && !rows.some((x) => Math.abs(x.top - r.top) < 2)) rows.push({ top: r.top, bottom: r.bottom });
              });
              if (!rows.length || rows.some((r) => w.top >= r.top && w.bottom <= r.bottom)) return;
              const mid = (w.top + w.bottom) / 2;
              const fit = rows.filter((r) => r.bottom - r.top >= w.height);
              const near = (fit.length ? fit : rows).reduce((a, r) => (Math.abs((r.top + r.bottom) / 2 - mid) < Math.abs((a.top + a.bottom) / 2 - mid) ? r : a));
              word.style.transform = `translateY(${Math.round((near.top + near.bottom) / 2 - mid)}px)`;
            };
            // Point visé : le milieu du trait gauche du O. Il gagne le centre de l'écran pendant que le mot grandit.
            const measure = () => {
              dive.style.transform = "none";
              place(dive.getBoundingClientRect());
              const box = dive.getBoundingClientRect();
              const fs = parseFloat(getComputedStyle(o).fontSize);
              const px = o.getBoundingClientRect().left - box.left + O_STROKE.x * fs;
              const py = base.getBoundingClientRect().top - box.top - O_STROKE.y * fs;
              geo = { px, py, cx: box.width / 2, cy: box.height / 2, s: (Math.max(box.width, box.height) / (O_STROKE.w * fs)) * 1.6 };
            };
            // Zoom exponentiel : une vitesse de plongée constante à l'œil
            const st = { t: 0 };
            const paint = () => {
              const s = Math.pow(geo.s, st.t);
              const m = st.t * st.t * (3 - 2 * st.t); // le point gagne le centre au rythme du zoom, sans glisser d'abord
              const qx = geo.px + (geo.cx - geo.px) * m;
              const qy = geo.py + (geo.cy - geo.py) * m;
              dive.style.transform = `translate3d(${(qx - s * geo.px).toFixed(2)}px, ${(qy - s * geo.py).toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
              dive.style.opacity = st.t > 0.9 ? ((1 - st.t) / 0.1).toFixed(3) : "";
              dive.style.visibility = st.t > 0.995 ? "hidden" : "";
            };
            measure();
            paint();
            gsap.set(grid, { transformOrigin: "50% 0%" });
            if (wide) {
              // Grand écran : les photos glissent dans les lettres à l'arrivée, puis la scène est tenue le temps de la plongée
              gsap.fromTo(grid, { y: () => window.innerHeight * 0.16 }, {
                y: 0, ease: "none",
                scrollTrigger: { trigger: fg, start: "top bottom", end: "top top", scrub: true, invalidateOnRefresh: true },
              });
              gsap.timeline({
                scrollTrigger: {
                  trigger: fg, start: "top top", end: () => `+=${Math.round(window.innerHeight * 1.3)}`,
                  pin: true, scrub: true, invalidateOnRefresh: true,
                  onRefresh: () => { measure(); paint(); },
                },
              })
                .to(st, { t: 1, duration: 1, ease: "none", onUpdate: paint }, 0)
                .fromTo(grid, { scale: 1.08 }, { scale: 1, duration: 1, ease: "none" }, 0);
            } else {
              // Au doigt : la plongée se joue d'elle-même quand le mot occupe l'écran, et revient si l'on remonte
              const tl = gsap.timeline({ paused: true })
                .to(st, { t: 1, duration: 1.4, ease: "power1.in", onUpdate: paint }, 0)
                .fromTo(grid, { scale: 1.08 }, { scale: 1, duration: 1.4, ease: "power2.out" }, 0);
              ScrollTrigger.create({
                trigger: fg, start: "top 12%",
                onEnter: () => tl.play(), onLeaveBack: () => tl.reverse(),
                onRefresh: () => { measure(); paint(); },
              });
            }
          }
        }

        // Handball : la verticale devient horizontale, la galerie défile plus vite que la page pour rester courte
        if (ch.kind === "side" && wide) {
          const sg = section.querySelector(".sg");
          const track = sg.querySelector(".sg-track");
          sg.classList.add("is-pinned");
          const dx = () => Math.max(0, track.scrollWidth - window.innerWidth);
          const size = () => { sg.style.height = `${Math.round(window.innerHeight + dx() * 0.6)}px`; };
          size();
          gsap.to(track, {
            x: () => -dx(), ease: "none",
            scrollTrigger: { trigger: sg, start: "top top", end: "bottom bottom", scrub: true, invalidateOnRefresh: true, onRefreshInit: size },
          });
        }

        // Handball au doigt : les photos entrent en cascade depuis la droite
        if (ch.kind === "side" && !wide) {
          const items = section.querySelectorAll(".sg-item");
          ScrollTrigger.create({
            trigger: section.querySelector(".sg"), start: "top 80%", once: true,
            onEnter: () => gsap.fromTo(items, { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: 1, stagger: 0.08, ease: "expo.out" }),
          });
        }

        // Basket : les rangées glissent depuis les côtés, en alternance. Les rangées sont reconstituées d'après
        // la position des photos, pour suivre le nombre de colonnes de l'écran.
        if (ch.kind === "rows") {
          const grid = section.querySelector(".ro-grid");
          const rows = [];
          [...grid.querySelectorAll(".ro-item")].filter((el) => el.offsetParent !== null).forEach((el) => {
            const last = rows[rows.length - 1];
            if (last && Math.abs(last.top - el.offsetTop) < 4) last.items.push(el);
            else rows.push({ top: el.offsetTop, items: [el] });
          });
          rows.forEach(({ items }, r) => {
            const d = r % 2 === 0 ? -1 : 1;
            if (wide) {
              gsap.fromTo(items, { x: () => d * 0.38 * grid.clientWidth }, {
                x: 0, ease: "none",
                scrollTrigger: { trigger: items[0], start: "top bottom", end: "top 40%", scrub: true, invalidateOnRefresh: true },
              });
            } else {
              ScrollTrigger.create({
                trigger: items[0], start: "top 88%", once: true,
                onEnter: () => gsap.fromTo(items, { x: () => d * 0.3 * grid.clientWidth, opacity: 0 }, { x: 0, opacity: 1, duration: 1, ease: "expo.out" }),
              });
            }
          });
        }

        // Football américain : la mosaïque s'ouvre depuis le centre de chaque cadre
        if (ch.kind === "mosaic") {
          ScrollTrigger.batch(section.querySelectorAll(".mo-item"), {
            start: "top 90%", once: true,
            onEnter: (batch) => {
              gsap.fromTo(batch.map((b) => b.querySelector(".mo-frame")), { clipPath: "inset(50% 50% 50% 50%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, stagger: 0.09, ease: "expo.out" });
              gsap.fromTo(batch.map((b) => b.querySelector(".pf-fill")), { scale: 1.3 }, { scale: 1, duration: 1.6, stagger: 0.09, ease: "expo.out" });
            },
          });
        }
      });

      // ---------- Contact : visible tant qu'il n'est pas atteint, puis arrive en cascade ----------
      ScrollTrigger.create({
        trigger: q(".kc")[0], start: "top 85%", once: true,
        onEnter: () => gsap.fromTo(q(".kc-intro > *, .kc-form > *"), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.06, ease: "expo.out" }),
      });
    }, root);

    // Tous les déclencheurs existent : un calcul d'ensemble, puis un second quand la police est chargée
    ScrollTrigger.refresh();
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      cyclers.forEach((c) => c.stop());
      document.removeEventListener("visibilitychange", onVisibility);
      ctx.revert();
      if (lenis) { gsap.ticker.remove(tick); lenis.destroy(); }
      lenisRef.current = null;
    };
  }, [cols]); // eslint-disable-line react-hooks/exhaustive-deps

  const lock = (on) => {
    const l = lenisRef.current;
    if (l) (on ? l.stop() : l.start());
    document.documentElement.classList.toggle("pf-locked", on);
  };

  const go = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (lenisRef.current) lenisRef.current.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView();
  };

  // ---------- Visionneuse ----------
  const openViewer = useCallback((g, k, el, sizes) => {
    lock(true);
    setViewer({
      list: g.items.map((x) => x.p), index: k, sport: g.sport, sizes, source: el,
      sourceFor: (j) => frames.current.get(`${g.id}:${j}`),
      reduce: reduceRef.current,
    });
  }, []);
  const closeViewer = useCallback((k) => {
    setViewer((v) => {
      const el = v && v.sourceFor(k);
      requestAnimationFrame(() => el && el.focus({ preventScroll: true }));
      return null;
    });
    lock(false);
  }, []);

  // ---------- Menu du téléphone ----------
  useEffect(() => {
    if (!menu) return;
    const m = menuRef.current;
    const reduce = reduceRef.current;
    lock(true);
    const tl = gsap.timeline();
    if (reduce) tl.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    else {
      tl.fromTo(m, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.6, ease: "power3.inOut" })
        .fromTo(m.querySelectorAll(".pf-menu__link > span"), { yPercent: 110 }, { yPercent: 0, duration: 0.8, stagger: 0.06, ease: "expo.out" }, 0.25);
    }
    m.querySelector("button")?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === "Escape") setMenu(false);
      if (e.key === "Tab") {
        const f = [...m.querySelectorAll("button")];
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); tl.kill(); lock(false); };
  }, [menu]);

  const menuGo = (id) => {
    setMenu(false);
    requestAnimationFrame(() => go(id));
  };

  const submitContact = async (e) => {
    e.preventDefault();
    setCstatus("sending");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fd.get("name"), email: fd.get("email"), message: fd.get("message") }),
      });
      setCstatus(res.ok ? "ok" : "error");
    } catch { setCstatus("error"); }
  };

  const LINKS = [...CHAPTERS.map((c) => ({ id: c.id, label: c.name, full: c.full ?? c.name })), { id: "contact", label: "Contact", full: "Contact" }];

  return (
    <div className="proto pf" ref={root}>
      <nav className="p-nav pf-nav" ref={navRef} aria-label="Sections">
        <button className="p-nav__brand" onClick={() => go("top")}>MATT.JNO</button>
        <div className="p-nav__links pf-links">
          {LINKS.map((l) => (
            <button key={l.id} onClick={() => go(l.id)} aria-current={active === l.id ? "true" : undefined}>{l.label}</button>
          ))}
        </div>
        <button className="pf-menu-btn" aria-expanded={menu} aria-controls="pf-menu" onClick={() => setMenu(true)}>Menu</button>
      </nav>

      {menu && (
        <div className="pf-menu" id="pf-menu" ref={menuRef} role="dialog" aria-modal="true" aria-label="Menu">
          <div className="pf-menu__top">
            <span className="p-nav__brand">MATT.JNO</span>
            <button onClick={() => setMenu(false)}>Fermer</button>
          </div>
          <ul className="pf-menu__list">
            {LINKS.map((l) => (
              <li key={l.id}>
                <button className="pf-menu__link" onClick={() => menuGo(l.id)} aria-current={active === l.id ? "true" : undefined}>
                  <span>{l.full}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <main>
        <header className="p-hero pf-hero" id="top">
          <div className="p-hero__media">
            {HERO.map((p, i) => (
              <div key={p.src} className={`p-hero__slide${i === slide ? " is-active" : ""}`}>
                <div className="p-hero__img p-fill" style={{ transformOrigin: `${p.fx ?? 50}% ${p.fy ?? 50}%` }}>
                  <Pic p={p} sizes="100vw" priority={i === 0} quality={82} focal alt="Photographie de sport par MATT.JNO" />
                </div>
              </div>
            ))}
            <div className="p-hero__scrim" />
            <div className="pf-hero__top" />
          </div>
          <div className="p-hero__dim" />
          <div className="p-hero__text">
            <h1 className="p-hero__title">
              <span className="p-mask"><span style={{ "--i": 0 }}>Matt</span></span>
              <span className="p-mask"><span style={{ "--i": 1 }}>Jno</span></span>
            </h1>
            <p className="p-hero__sub">Sports Photographer</p>
          </div>
        </header>

        {CHAPTERS.map((ch, i) => {
          const g = galleries[i];
          return (
            <section key={ch.id} id={ch.id} aria-labelledby={`${ch.id}-h`}>
              <Opener ch={ch} count={ch.slides.length + g.items.length} />
              {ch.kind === "side"
                ? <Side g={g} onOpen={openViewer} register={register} />
                : <Cells g={g} kind={ch.kind} cols={cols} onOpen={openViewer} register={register} />}
            </section>
          );
        })}

        <section className="kc" id="contact" aria-labelledby="k-h">
          <div className="kc-top">
            <div className="kc-intro">
              <h2 className="p-head" id="k-h">Contact</h2>
              <p>Un match, une campagne, une saison à couvrir ? Écrivez-moi.</p>
              <a className="kc-insta" href={INSTAGRAM} target="_blank" rel="noopener noreferrer">@matt.jno</a>
            </div>
            <form className="kc-form" onSubmit={submitContact} data-ui>
              <label className="kc-field">Nom<input name="name" required autoComplete="name" /></label>
              <label className="kc-field">Email<input name="email" type="email" required autoComplete="email" /></label>
              <label className="kc-field">Message<textarea name="message" rows={3} required /></label>
              <div>
                <button className="kc-btn" type="submit" disabled={cstatus === "sending"}>
                  {cstatus === "sending" ? "Envoi…" : cstatus === "ok" ? "Message envoyé" : "Envoyer le message"}
                </button>
              </div>
              {cstatus === "error" && <p className="kc-field">L'envoi a échoué. Réessayez ou écrivez sur Instagram.</p>}
            </form>
          </div>
        </section>
      </main>

      <footer className="kc-foot">
        <span>© 2026 MATT.JNO, photographe de sport, Paris</span>
        <nav aria-label="Pied de page">
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram</a>
          <button onClick={() => go("top")}>Haut de page</button>
        </nav>
      </footer>

      {viewer && <Viewer open={viewer} onClose={closeViewer} />}
    </div>
  );
}
