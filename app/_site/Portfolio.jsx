"use client";

// Version A : la v3 corrigée et resserrée. Un chapitre par sport, une fenêtre qui s'ouvre depuis le geste,
// une grille par sport, une visionneuse plein écran. Les photos ne sont jamais modifiées : seuls leurs cadres bougent.

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "@fontsource-variable/instrument-sans";
import Viewer from "./Viewer";
import "./site.css";

const INSTAGRAM = "https://instagram.com/matt.jno";
const HERO_INTERVAL = 5500;
const LOCAL = process.env.NEXT_PUBLIC_LOCAL_IMG === "1";
// Grands écrans où les scènes tenues ont la place de jouer (la tablette en portrait suit le téléphone)
const WIDE = "(min-width: 1024px) and (min-height: 560px)";

const SIZES = {
  grid: "(min-width: 760px) 24vw, 48vw",
  side: "(min-width: 1024px) 31vw, (min-width: 760px) 46vw, 74vw",
  rows: "(min-width: 760px) 24vw, 48vw",
  feature: "(min-width: 760px) 50vw, 100vw",
};

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

function Opener({ ch }) {
  const all = [ch.open, ...ch.series];
  return (
    <div className="ch-open" style={{ "--hold": ch.hold }} data-fx={ch.open.fx ?? 50} data-fy={ch.open.fy ?? 50}>
      <div className="ch-stage">
        <div className="ch-win">
          <div className="pf-fill" style={{ transformOrigin: `${ch.open.fx ?? 50}% ${ch.open.fy ?? 50}%` }}>
            <Pic p={ch.open} sizes="100vw" quality={82} focal alt={`${ch.full ?? ch.name}, photo d'ouverture`} />
          </div>
        </div>
        <div className="ch-scrim" />
        <div className="ch-text">
          <h2 className="ch-title" id={`${ch.id}-h`}>{ch.full ?? ch.name}</h2>
          <p className="ch-meta"><strong>{all.length} photos</strong></p>
        </div>
      </div>
    </div>
  );
}

// Vignette cliquable : ouvre la visionneuse
function Frame({ ch, k, p, sizes, className, onOpen, register, quality = 80 }) {
  return (
    <button
      type="button"
      className={`${className} hv pf-btn`}
      ref={register(ch.id, k)}
      onClick={(e) => onOpen(ch, k, e.currentTarget, sizes)}
      aria-label={`Agrandir la photo ${k + 1} sur ${ch.series.length}, ${ch.full ?? ch.name}`}
    >
      <span className="pf-fill"><Pic p={p} sizes={sizes} quality={quality} /></span>
    </button>
  );
}

function Grid({ ch, ...f }) {
  return (
    <div className="fg">
      <div className="fg-grid">
        {ch.series.map((p, k) => (
          <figure className="fg-item" key={p.src}>
            <Frame ch={ch} k={k} p={p} sizes={SIZES.grid} className="fg-frame" {...f} />
          </figure>
        ))}
      </div>
    </div>
  );
}

function Side({ ch, ...f }) {
  return (
    <div className="sg">
      <div className="sg-stage">
        <div className="sg-window">
          <ul className="sg-track">
            {ch.series.map((p, k) => (
              <li className="sg-item" key={p.src}>
                <figure>
                  <Frame ch={ch} k={k} p={p} sizes={SIZES.side} className="sg-frame" {...f} />
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Rows({ ch, ...f }) {
  const rows = [];
  for (let k = 0; k < ch.series.length; k += 4) rows.push(ch.series.slice(k, k + 4).map((p, j) => ({ p, k: k + j })));
  return (
    <div className="ro">
      {rows.map((row, r) => (
        <div className="ro-row" key={r} data-dir={r % 2 === 0 ? -1 : 1}>
          {row.map(({ p, k }) => (
            <figure className="ro-item" key={p.src}>
              <Frame ch={ch} k={k} p={p} sizes={SIZES.rows} className="ro-frame" {...f} />
            </figure>
          ))}
        </div>
      ))}
    </div>
  );
}

function Mosaic({ ch, ...f }) {
  return (
    <div className="mo">
      <div className="mo-grid">
        {ch.series.map((p, k) => (
          <figure className={`mo-item${k === 0 ? " mo-feature" : ""}`} key={p.src}>
            <Frame ch={ch} k={k} p={p} sizes={k === 0 ? SIZES.feature : SIZES.grid} quality={k === 0 ? 85 : 80} className="mo-frame" {...f} />
          </figure>
        ))}
      </div>
    </div>
  );
}

const GALLERY = { grid: Grid, side: Side, rows: Rows, mosaic: Mosaic };

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

      if (reduce) return;

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

        // La fenêtre s'ouvre depuis le geste jusqu'au plein écran. La découpe est calculée ici à chaque image :
        // laissée à l'interpolation de GSAP, elle perdait un côté ou se déformait selon l'arrondi des valeurs.
        let start = startWindow(fx, fy);
        const state = { p: 0 };
        const paint = () => { win.style.clipPath = insetAt(start, state.p); };
        paint();
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: open, start: "top top", end: "bottom bottom", scrub: true,
            onRefresh: () => { start = startWindow(fx, fy); paint(); },
          },
          defaults: { ease: "none" },
        });
        tl.to(state, { p: 1, duration: 1, onUpdate: paint }, 0)
          .fromTo(fill, { scale: 1.25 }, { scale: 1, duration: 1, immediateRender: true }, 0)
          .to(open.querySelector(".ch-scrim"), { opacity: 1, duration: 0.4 }, 0.6)
          .to({}, { duration: 0.2 });
        gsap.from(open.querySelectorAll(".ch-title, .ch-meta"), {
          yPercent: 30, opacity: 0, duration: 1, stagger: 0.08, ease: "expo.out",
          scrollTrigger: { trigger: open, start: "top 70%" },
        });

        // Football : la grille se dévoile rangée par rangée, colonnes décalées
        if (ch.kind === "grid") {
          const fg = section.querySelector(".fg");
          ScrollTrigger.batch(fg.querySelectorAll(".fg-item"), {
            start: "top 92%", once: true,
            onEnter: (batch) => {
              gsap.fromTo(batch.map((b) => b.querySelector(".fg-frame")), { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, stagger: 0.08, ease: "expo.out" });
              gsap.fromTo(batch.map((b) => b.querySelector(".pf-fill")), { scale: 1.2 }, { scale: 1, duration: 1.5, stagger: 0.08, ease: "expo.out" });
              gsap.fromTo(batch.map((b) => b.querySelector(".cap")), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.3, stagger: 0.08, ease: "expo.out" });
            },
          });
          if (wide) {
            fg.querySelectorAll(".fg-item").forEach((item, k) => {
              if (k % 2 === 0) return;
              gsap.fromTo(item, { y: 0 }, { y: -60, ease: "none", scrollTrigger: { trigger: fg, start: "top bottom", end: "bottom top", scrub: true } });
            });
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

        // Basket : les rangées glissent depuis les côtés, en alternance
        if (ch.kind === "rows") {
          section.querySelectorAll(".ro-row").forEach((row) => {
            const d = Number(row.dataset.dir);
            gsap.fromTo(row, { xPercent: d * (wide ? 38 : 20) }, {
              xPercent: 0, ease: "none",
              scrollTrigger: { trigger: row, start: "top bottom", end: "top 40%", scrub: true },
            });
          });
        }

        // Football américain : la mosaïque s'ouvre depuis le centre de chaque cadre
        if (ch.kind === "mosaic") {
          ScrollTrigger.batch(section.querySelectorAll(".mo-item"), {
            start: "top 90%", once: true,
            onEnter: (batch) => {
              gsap.fromTo(batch.map((b) => b.querySelector(".mo-frame")), { clipPath: "inset(50% 50% 50% 50%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, stagger: 0.09, ease: "expo.out" });
              gsap.fromTo(batch.map((b) => b.querySelector(".pf-fill")), { scale: 1.3 }, { scale: 1, duration: 1.6, stagger: 0.09, ease: "expo.out" });
              gsap.fromTo(batch.map((b) => b.querySelector(".cap")), { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 0.4, stagger: 0.09 });
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
      ctx.revert();
      if (lenis) { gsap.ticker.remove(tick); lenis.destroy(); }
      lenisRef.current = null;
    };
  }, []);

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
  const openViewer = useCallback((ch, k, el, sizes) => {
    lock(true);
    setViewer({
      list: ch.series, index: k, sport: ch.full ?? ch.name, sizes, source: el,
      sourceFor: (j) => frames.current.get(`${ch.id}:${j}`),
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

        {CHAPTERS.map((ch) => {
          const G = GALLERY[ch.kind];
          return (
            <section key={ch.id} id={ch.id} aria-labelledby={`${ch.id}-h`}>
              <Opener ch={ch} />
              <G ch={ch} onOpen={openViewer} register={register} />
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
