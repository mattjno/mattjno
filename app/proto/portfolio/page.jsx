"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "@fontsource-variable/instrument-sans";
import "@fontsource/instrument-serif/400-italic.css";
import { HERO, FOOT, HAND, BASKET, US } from "./photos";
import "../proto.css";
import "./portfolio.css";

const INSTAGRAM = "https://instagram.com/matt.jno";
const HERO_INTERVAL = 5500;
const LOCAL = process.env.NEXT_PUBLIC_LOCAL_IMG === "1";

// Chaque chapitre : sa photo d'ouverture, sa série et sa transition
const CHAPTERS = [
  { id: "football", name: "Football", open: FOOT[0], series: FOOT.slice(1), kind: "grid" },
  { id: "handball", name: "Handball", open: HAND[0], series: HAND.slice(1), kind: "side" },
  { id: "basket", name: "Basket", open: BASKET[0], series: BASKET.slice(1), kind: "columns" },
  { id: "football-americain", name: "Football US", full: "Football américain", open: US[0], series: US.slice(1), kind: "zoom" },
];

const clubs = (list) => [...new Set(list.map((p) => p.match))];

function Pic({ p, sizes, priority = false, quality = 80, alt }) {
  const src = LOCAL ? `/_local/v/${p.i}.jpg` : p.src;
  return <Image src={src} alt={alt ?? p.match} fill sizes={sizes} priority={priority} quality={quality} unoptimized={LOCAL} />;
}

function Opener({ ch }) {
  const all = [ch.open, ...ch.series];
  return (
    <div className="ch-open">
      <div className="ch-stage">
        <div className="ch-win"><div className="pf-fill"><Pic p={ch.open} sizes="100vw" quality={82} /></div></div>
        <div className="ch-scrim" />
        <div className="ch-text">
          <h2 className="ch-title" id={`${ch.id}-h`}>{ch.full ?? ch.name}</h2>
          <p className="ch-meta"><strong>{all.length} photos</strong>{clubs(all).join(", ")}</p>
        </div>
      </div>
    </div>
  );
}

function Grid({ ch }) {
  return (
    <div className="fg">
      <div className="fg-grid">
        {ch.series.map((p) => (
          <figure className="fg-item" key={p.src}>
            <div className="fg-frame hv"><div className="pf-fill"><Pic p={p} sizes="(min-width: 760px) 24vw, 48vw" /></div></div>
            <figcaption className="cap"><span>{p.match}</span><span>{p.date}</span></figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function Side({ ch }) {
  return (
    <div className="sg">
      <div className="sg-stage">
        <div className="sg-window">
          <ul className="sg-track">
            {ch.series.map((p) => (
              <li className="sg-item" key={p.src}>
                <div className="sg-frame hv"><div className="pf-fill"><Pic p={p} sizes="(min-width: 760px) 24vw, 44vw" /></div></div>
                <p className="cap"><span>{p.match}</span><span>{p.date}</span></p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Columns({ ch }) {
  const cols = [[], [], [], []];
  ch.series.forEach((p, i) => cols[i % 4].push(p));
  return (
    <div className="co">
      <div className="co-stage">
        {cols.map((col, c) => (
          <div className={`co-col${c % 2 === 1 ? " co-col--down" : ""}`} key={c}>
            {col.map((p) => (
              <figure className="co-item" key={p.src}>
                <div className="co-frame hv"><div className="pf-fill"><Pic p={p} sizes="(min-width: 760px) 24vw, 48vw" /></div></div>
                <figcaption className="cap"><span>{p.match}</span><span>{p.date}</span></figcaption>
              </figure>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Zoom({ ch }) {
  const cells = ch.series.slice(0, 8);
  const FOCUS = 5;
  const center = cells[FOCUS];
  return (
    <div className="zg">
      <div className="zg-stage">
        <div className="zg-grid">
          {cells.map((p, i) => (
            <div className={`zg-cell hv${i === FOCUS ? " zg-cell--center" : ""}`} key={p.src}>
              <div className="pf-fill"><Pic p={p} sizes={i === FOCUS ? "(min-width: 760px) 70vw, 100vw" : "25vw"} quality={i === FOCUS ? 85 : 75} /></div>
            </div>
          ))}
        </div>
        <p className="zg-cap"><strong>{center.match}</strong><span>{center.date}</span></p>
      </div>
    </div>
  );
}

export default function Portfolio() {
  const root = useRef(null);
  const navRef = useRef(null);
  const lenisRef = useRef(null);
  const [slide, setSlide] = useState(0);
  const [type, setType] = useState("sans");
  const [cstatus, setCstatus] = useState("idle");

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
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wide = window.matchMedia("(min-width: 760px)").matches;
    let lenis = null;
    const tick = (t) => lenis && lenis.raf(t * 1000);
    if (!reduce) {
      lenis = new Lenis({ lerp: 0.12 });
      lenisRef.current = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }
    const settleIfUnreachable = (self) => {
      if (self.animation && self.start >= ScrollTrigger.maxScroll(window) - 2) self.animation.progress(1);
    };

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);

      // ---------- Intro (une fois par visite) ----------
      const heroLines = q(".p-hero .p-mask > span");
      let seen = false;
      try { seen = sessionStorage.getItem("mj-intro") === "1"; sessionStorage.setItem("mj-intro", "1"); } catch {}
      if (reduce || seen) {
        gsap.set(q(".p-intro"), { display: "none" });
      } else {
        gsap.set(heroLines, { yPercent: 110 });
        gsap.set(q(".p-nav, .p-hero__sub"), { autoAlpha: 0 });
        lenis.stop();
        const intro = gsap.timeline({ paused: true });
        intro
          .to(q(".p-intro text"), { strokeDashoffset: 0, duration: 1.5, ease: "power2.inOut" })
          .to(q(".p-intro text"), { fillOpacity: 1, duration: 0.45, ease: "power1.out" }, "-=0.25")
          .to(q(".p-intro text"), { strokeOpacity: 0, duration: 0.3 }, "<")
          .to(q(".p-intro"), { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "expo.inOut" }, "+=0.3")
          .from(q(".p-hero__media"), { scale: 1.15, duration: 1.6, ease: "expo.out" }, "<")
          .to(heroLines, { yPercent: 0, duration: 1.1, stagger: 0.09, ease: "expo.out" }, "-=0.55")
          .to(q(".p-hero__sub, .p-nav"), { autoAlpha: 1, duration: 0.7 }, "-=0.7")
          .add(() => { gsap.set(q(".p-intro"), { display: "none" }); lenis.start(); });
        document.fonts.ready.then(() => {
          const t = q(".p-intro text")[0];
          const svg = q(".p-intro svg")[0];
          if (t && svg) {
            const b = t.getBBox();
            svg.setAttribute("viewBox", `${b.x - 2} ${b.y - 2} ${b.width + 4} ${b.height + 4}`);
          }
          intro.play();
        });
      }
      if (reduce) return;

      // ---------- Hero qui recule ----------
      const hero = q(".p-hero")[0];
      gsap.to(q(".p-hero__media"), { yPercent: 8, scale: 1.06, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
      gsap.to(q(".p-hero__dim"), { opacity: 0.45, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
      gsap.to(q(".p-hero__text"), { yPercent: -30, opacity: 0, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "70% top", scrub: true } });

      // ---------- Ouvertures de chapitre : la fenêtre s'ouvre sur tout l'écran ----------
      q(".ch-open").forEach((open) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: open, start: "top top", end: "bottom bottom", scrub: true }, defaults: { ease: "none" } });
        tl.to(open.querySelector(".ch-win"), { clipPath: "inset(0% 0% 0% 0%)", duration: 1 }, 0)
          .to(open.querySelector(".ch-win .pf-fill"), { scale: 1, duration: 1 }, 0)
          .to(open.querySelector(".ch-scrim"), { opacity: 1, duration: 0.4 }, 0.5)
          .to({}, { duration: 0.35 });
        gsap.from(open.querySelectorAll(".ch-title, .ch-meta"), {
          yPercent: 30, opacity: 0, duration: 1, stagger: 0.08, ease: "expo.out",
          scrollTrigger: { trigger: open, start: "top 70%" },
        });
      });

      // ---------- Football : la grille se dévoile rangée par rangée, colonnes décalées ----------
      const fg = q(".fg")[0];
      if (fg) {
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
            const col = k % 4;
            const amp = [0, -60, 0, -60][col];
            if (!amp) return;
            gsap.fromTo(item, { y: 0 }, { y: amp, ease: "none", scrollTrigger: { trigger: fg, start: "top bottom", end: "bottom top", scrub: true } });
          });
        }
      }

      // ---------- Handball : la verticale devient horizontale ----------
      const sg = q(".sg")[0];
      const track = q(".sg-track")[0];
      if (wide && sg && track) {
        sg.classList.add("is-pinned");
        const dx = () => track.scrollWidth - window.innerWidth;
        sg.style.height = `${window.innerHeight + dx()}px`;
        const move = gsap.to(track, {
          x: () => -dx(), ease: "none",
          scrollTrigger: {
            trigger: sg, start: "top top", end: "bottom bottom", scrub: true, invalidateOnRefresh: true,
            onRefreshInit: () => { sg.style.height = `${window.innerHeight + dx()}px`; },
          },
        });
        q(".sg-frame .pf-fill").forEach((img) => {
          gsap.fromTo(img, { xPercent: 5 }, {
            xPercent: -5, ease: "none",
            scrollTrigger: { trigger: img.closest(".sg-item"), containerAnimation: move, start: "left right", end: "right left", scrub: true },
          });
        });
      }

      // ---------- Basket : colonnes à contre-sens ----------
      const co = q(".co")[0];
      if (co && wide) {
        const cols = co.querySelectorAll(".co-col");
        const travel = (col) => Math.max(0, col.scrollHeight - window.innerHeight + 80);
        cols.forEach((col, c) => {
          const down = c % 2 === 1;
          gsap.fromTo(col, { y: () => (down ? -travel(col) : 40) }, {
            y: () => (down ? 40 : -travel(col)), ease: "none",
            scrollTrigger: { trigger: co, start: "top top", end: "bottom bottom", scrub: true, invalidateOnRefresh: true },
          });
        });
      }

      // ---------- Football américain : la grille plonge dans la photo centrale ----------
      const zg = q(".zg")[0];
      if (zg) {
        const grid = zg.querySelector(".zg-grid");
        const cell = zg.querySelector(".zg-cell--center");
        const stage = zg.querySelector(".zg-stage");
        const target = () => Math.min((window.innerHeight * 0.84) / cell.offsetHeight, (window.innerWidth * 0.92) / cell.offsetWidth);
        const origin = () => `${cell.offsetLeft + cell.offsetWidth / 2}px ${cell.offsetTop + cell.offsetHeight / 2}px`;
        const dx = () => stage.clientWidth / 2 - (grid.offsetLeft + cell.offsetLeft + cell.offsetWidth / 2);
        const dy = () => stage.clientHeight / 2 - (grid.offsetTop + cell.offsetTop + cell.offsetHeight / 2);
        gsap.set(grid, { transformOrigin: origin });
        const tl = gsap.timeline({ scrollTrigger: { trigger: zg, start: "top top", end: "bottom bottom", scrub: true, invalidateOnRefresh: true, onRefreshInit: () => gsap.set(grid, { transformOrigin: origin() }) }, defaults: { ease: "none" } });
        tl.to({}, { duration: 0.15 })
          .to(grid, { scale: target, x: dx, y: dy, duration: 0.7 })
          .to(zg.querySelectorAll(".zg-cell:not(.zg-cell--center)"), { opacity: 0, duration: 0.3 }, 0.5)
          .to(zg.querySelector(".zg-cap"), { opacity: 1, duration: 0.15 }, 0.75)
          .to({}, { duration: 0.15 });
      }

      // ---------- Contact ----------
      ScrollTrigger.create({
        trigger: q(".k")[0], start: "top 40px", end: "bottom 40px",
        onToggle: (s) => navRef.current && navRef.current.classList.toggle("is-paper", s.isActive),
      });
      gsap.from(q(".k__intro > *, .k__form > *"), { y: 24, opacity: 0, duration: 0.8, stagger: 0.06, ease: "expo.out", scrollTrigger: { trigger: q(".k")[0], start: "top 70%", onRefresh: settleIfUnreachable } });
      gsap.from(q(".k__handle > span"), { yPercent: 100, duration: 1.1, stagger: 0.04, ease: "expo.out", scrollTrigger: { trigger: q(".k__handle")[0], start: "top 95%", onRefresh: settleIfUnreachable } });
      gsap.from(q(".f__mark span"), { yPercent: 100, duration: 1.1, stagger: 0.05, ease: "expo.out", scrollTrigger: { trigger: q(".f")[0], start: "top 90%", onRefresh: settleIfUnreachable } });
    }, root);

    return () => {
      ctx.revert();
      if (lenis) { gsap.ticker.remove(tick); lenis.destroy(); }
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => { ScrollTrigger.refresh(); }, [type]);

  const go = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (lenisRef.current) lenisRef.current.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView();
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

  return (
    <div className="proto" ref={root} data-type={type}>
      <div className="p-intro" aria-hidden="true">
        <svg viewBox="0 -34 190 44"><text x="0" y="0" fontSize="44">MATT.JNO</text></svg>
      </div>

      <nav className="p-nav" ref={navRef}>
        <button className="p-nav__brand" onClick={() => go("top")}>MATT.JNO</button>
        <div className="p-nav__links">
          {CHAPTERS.map((ch) => (
            <button key={ch.id} className={ch.id === "football" || ch.id === "basket" ? "" : "p-hide-s"} onClick={() => go(ch.id)}>{ch.name}</button>
          ))}
          <button onClick={() => go("contact")}>Contact</button>
        </div>
      </nav>

      <main>
        <header className="p-hero" id="top">
          <div className="p-hero__media">
            {HERO.map((p, i) => (
              <div key={p.src} className={`p-hero__slide${i === slide ? " is-active" : ""}`}>
                <div className="p-hero__img p-fill"><Pic p={p} sizes="100vw" priority={i === 0} quality={82} /></div>
              </div>
            ))}
            <div className="p-hero__scrim" />
          </div>
          <div className="p-hero__dim" />
          <div className="p-hero__text">
            <h1 className="p-hero__title">
              <span className="p-mask"><span>Matt</span></span>
              <span className="p-mask"><span>Jno</span></span>
            </h1>
            <p className="p-hero__sub">Sports Photographer</p>
          </div>
        </header>

        {CHAPTERS.map((ch) => (
          <section key={ch.id} id={ch.id} aria-labelledby={`${ch.id}-h`}>
            <Opener ch={ch} />
            {ch.kind === "grid" && <Grid ch={ch} />}
            {ch.kind === "side" && <Side ch={ch} />}
            {ch.kind === "columns" && <Columns ch={ch} />}
            {ch.kind === "zoom" && <Zoom ch={ch} />}
          </section>
        ))}

        <section className="k" id="contact" aria-labelledby="k-h">
          <div className="k__top">
            <div className="k__intro">
              <h2 className="p-head p-switch" id="k-h">Contact</h2>
              <p>Un match, une campagne, une saison à couvrir ? Écrivez-moi.</p>
            </div>
            <form className="k__form" onSubmit={submitContact} data-ui>
              <label className="k__field">Nom<input name="name" required autoComplete="name" /></label>
              <label className="k__field">Email<input name="email" type="email" required autoComplete="email" /></label>
              <label className="k__field">Message<textarea name="message" rows={3} required /></label>
              <div>
                <button className="k__btn" type="submit" disabled={cstatus === "sending"}>
                  {cstatus === "sending" ? "Envoi…" : cstatus === "ok" ? "Message envoyé" : "Envoyer le message"}
                </button>
              </div>
              {cstatus === "error" && <p className="k__field">L'envoi a échoué. Réessayez ou écrivez sur Instagram.</p>}
            </form>
          </div>
          <div>
            <a className="k__handle" href={INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram @matt.jno">
              {"@matt.jno".split("").map((c, i) => <span key={i} aria-hidden="true"><span>{c}</span></span>)}
            </a>
            <div className="k__bottom">
              <span>Basé à Paris</span>
              <span>Football, handball, basket, football américain</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="f">
        <div className="f__mark" aria-label="MATT.JNO">
          {"MATT.JNO".split("").map((c, i) => <span key={i} aria-hidden="true">{c}</span>)}
        </div>
        <div className="f__row">
          <span>© 2026 MATT.JNO, photographe de sport</span>
          <nav aria-label="Pied de page">
            <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram</a>
            <button onClick={() => go("contact")}>Contact</button>
            <button onClick={() => go("top")}>Haut de page</button>
          </nav>
        </div>
      </footer>

      <div className="p-tools" role="toolbar" aria-label="Options du prototype">
        <span>Titres</span>
        <button aria-pressed={type === "sans"} onClick={() => setType("sans")}>Sans</button>
        <button aria-pressed={type === "serif"} onClick={() => setType("serif")}>Serif</button>
        <button onClick={() => { try { sessionStorage.removeItem("mj-intro"); } catch {} window.scrollTo(0, 0); window.location.reload(); }}>Rejouer l'intro</button>
      </div>
    </div>
  );
}
