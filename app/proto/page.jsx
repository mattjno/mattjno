"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { HERO, PANELS, GRID } from "./photos";
import "./proto.css";

const INSTAGRAM = "https://instagram.com/matt.jno";
const EASE = "expo.out";
const HERO_INTERVAL = 5500;

const fmtDate = (d) => d.split("-").reverse().join(".");

export default function Proto() {
  const root = useRef(null);
  const lenisRef = useRef(null);
  const [slide, setSlide] = useState(0);
  const [type, setType] = useState("sans");
  const [cstatus, setCstatus] = useState("idle");

  // Diaporama du hero
  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % HERO.length), HERO_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // Défilement fluide + animations
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis = null;
    const tick = (t) => lenis && lenis.raf(t * 1000);

    if (!reduce) {
      lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
      lenisRef.current = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);

      // 1. Intro : MATT.JNO se trace, se remplit, puis le rideau se lève
      const intro = gsap.timeline({ paused: true });
      const heroLines = q(".p-hero .p-mask > span");
      gsap.set(heroLines, { yPercent: 110 });
      gsap.set(q(".p-nav, .p-hero__count, .p-hero__sub"), { autoAlpha: 0 });

      if (reduce) {
        gsap.set(q(".p-intro"), { display: "none" });
        gsap.set(heroLines, { yPercent: 0 });
        gsap.set(q(".p-nav, .p-hero__count, .p-hero__sub"), { autoAlpha: 1 });
      } else {
        lenis.stop();
        intro
          .to(q(".p-intro text"), { strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut" })
          .to(q(".p-intro text"), { fillOpacity: 1, duration: 0.5, ease: "power1.out" }, "-=0.25")
          .to(q(".p-intro text"), { strokeOpacity: 0, duration: 0.3 }, "<")
          .to(q(".p-intro"), { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "expo.inOut" }, "+=0.35")
          .from(q(".p-hero__media"), { scale: 1.15, duration: 1.6, ease: EASE }, "<")
          .to(heroLines, { yPercent: 0, duration: 1.2, stagger: 0.1, ease: EASE }, "-=0.55")
          .to(q(".p-hero__sub, .p-hero__count"), { autoAlpha: 1, duration: 0.8 }, "-=0.8")
          .to(q(".p-nav"), { autoAlpha: 1, duration: 0.8 }, "<")
          .add(() => {
            gsap.set(q(".p-intro"), { display: "none" });
            lenis.start();
          });

        // On attend la police pour que le tracé soit juste
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

      // 2. Hero : l'image recule et s'assombrit au scroll, le titre monte
      gsap.to(q(".p-hero__media"), {
        yPercent: 18, ease: "none",
        scrollTrigger: { trigger: q(".p-hero")[0], start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(q(".p-hero__dim"), {
        opacity: 0.6, ease: "none",
        scrollTrigger: { trigger: q(".p-hero")[0], start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(q(".p-hero__text, .p-hero__count"), {
        y: -80, opacity: 0, ease: "none",
        scrollTrigger: { trigger: q(".p-hero")[0], start: "top top", end: "60% top", scrub: true },
      });

      // 3. Panneaux empilés : chaque panneau recule quand le suivant le recouvre
      const panels = q(".p-panel");
      panels.forEach((panel, i) => {
        const next = panels[i + 1];
        const cap = panel.querySelectorAll(".p-panel__cap > *");
        gsap.from(cap, {
          y: 24, opacity: 0, duration: 1, stagger: 0.08, ease: EASE,
          scrollTrigger: { trigger: panel, start: "top 40%", toggleActions: "play none none reverse" },
        });
        if (!next) return;
        const tl = gsap.timeline({
          scrollTrigger: { trigger: next, start: "top bottom", end: "top top", scrub: true },
        });
        tl.to(panel.querySelector(".p-panel__inner"), { scale: 0.9, ease: "none" }, 0)
          .to(panel.querySelector(".p-panel__shade"), { opacity: 0.7, ease: "none" }, 0);
      });

      // 4. Titres de section révélés ligne par ligne
      q(".p-head").forEach((head) => {
        gsap.from(head.querySelectorAll(".p-mask > span"), {
          yPercent: 110, duration: 1.2, stagger: 0.08, ease: EASE,
          scrollTrigger: { trigger: head, start: "top 85%" },
        });
        gsap.from(head.querySelectorAll(".p-label"), {
          opacity: 0, duration: 1, delay: 0.3,
          scrollTrigger: { trigger: head, start: "top 85%" },
        });
      });

      // 5. Grille : les photos se dévoilent par le bas, rangée par rangée
      if (!reduce) {
        ScrollTrigger.batch(q(".p-item"), {
          start: "top 90%",
          once: true,
          onEnter: (batch) => {
            gsap.to(batch, { clipPath: "inset(0% 0 0 0)", duration: 1.3, stagger: 0.1, ease: EASE });
            gsap.from(batch.map((b) => b.querySelector(".p-item__img")), {
              scale: 1.25, duration: 1.6, stagger: 0.1, ease: EASE,
              clearProps: "transform",
            });
          },
        });
      }

      // 6. Contact
      gsap.from(q(".p-contact__grid > *"), {
        y: 40, opacity: 0, duration: 1.1, stagger: 0.12, ease: EASE,
        scrollTrigger: { trigger: q(".p-contact__grid")[0], start: "top 85%" },
      });

      // 7. Signature finale : les lettres montent une à une
      gsap.from(q(".p-footer__mark span"), {
        yPercent: 100, duration: 1.2, stagger: 0.05, ease: EASE,
        scrollTrigger: { trigger: q(".p-footer")[0], start: "top 90%" },
      });
    }, root);

    return () => {
      ctx.revert();
      if (lenis) {
        gsap.ticker.remove(tick);
        lenis.destroy();
      }
      lenisRef.current = null;
    };
  }, []);

  // Le changement de typo modifie la hauteur des titres
  useEffect(() => { ScrollTrigger.refresh(); }, [type]);

  const go = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (lenisRef.current) lenisRef.current.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView();
  };

  const replay = () => {
    window.scrollTo(0, 0);
    window.location.reload();
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
    } catch {
      setCstatus("error");
    }
  };

  return (
    <div className="proto" ref={root} data-type={type}>
      {/* Intro */}
      <div className="p-intro" aria-hidden="true">
        <svg viewBox="0 -34 190 44">
          <text x="0" y="0" fontSize="44">MATT.JNO</text>
        </svg>
      </div>

      {/* Navigation */}
      <nav className="p-nav">
        <button className="p-nav__brand" onClick={() => go("top")} style={{ background: "none", border: 0, color: "inherit", cursor: "pointer", padding: 0 }}>
          MATT.JNO
        </button>
        <div className="p-nav__links">
          <button onClick={() => go("portfolio")}>Portfolio</button>
          <button onClick={() => go("contact")}>Contact</button>
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram</a>
        </div>
      </nav>

      {/* Hero */}
      <header className="p-hero" id="top">
        <div className="p-hero__media">
          {HERO.map((p, i) => (
            <div key={p.src} className={`p-hero__slide${i === slide ? " is-active" : ""}`}>
              <div className="p-hero__img">
                <Image src={p.src} alt={`${p.match}, ${p.sport}`} fill sizes="100vw" priority={i === 0} quality={80} />
              </div>
            </div>
          ))}
          <div className="p-hero__shade" />
        </div>
        <div className="p-hero__dim" />
        <div className="p-hero__text">
          <h1 className="p-hero__title">
            <span className="p-mask"><span>Matt</span></span>
            <span className="p-mask"><span>Jno</span></span>
          </h1>
          <p className="p-label p-hero__sub">Sports Photographer</p>
        </div>
        <div className="p-label p-hero__count">
          {String(slide + 1).padStart(2, "0")} / {String(HERO.length).padStart(2, "0")}
        </div>
      </header>

      {/* Panneaux empilés */}
      <section className="p-stack" aria-label="Sélection">
        {PANELS.map((p) => (
          <div className="p-panel" key={p.src}>
            <div className="p-panel__inner">
              <Image src={p.src} alt={`${p.match}, ${p.sport}`} fill sizes="100vw" quality={80} />
              <div className="p-panel__shade" />
            </div>
            <div className="p-panel__cap">
              <span className="p-label">{p.sport}</span>
              <span className="p-label">{p.match}</span>
              <span className="p-label">{fmtDate(p.date)}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Portfolio */}
      <section className="p-section" id="portfolio">
        <div className="p-head">
          <h2 className="p-title"><span className="p-mask"><span>Portfolio</span></span></h2>
          <span className="p-label">({String(GRID.length).padStart(2, "0")})</span>
        </div>
        <div className="p-grid">
          {GRID.map((p) => (
            <figure className="p-item" key={p.src} style={{ margin: 0 }}>
              <div className="p-item__img">
                <Image src={p.src} alt={`${p.match}, ${p.sport}`} fill sizes="(min-width: 900px) 33vw, 50vw" quality={78} />
              </div>
              <figcaption className="p-item__cap">
                <span>{p.match}</span>
                <span>{p.date.slice(0, 4)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="p-section" id="contact">
        <div className="p-head">
          <h2 className="p-title"><span className="p-mask"><span>Contact</span></span></h2>
        </div>
        <div className="p-contact__grid">
          <form className="p-form" onSubmit={submitContact}>
            <label className="p-field">
              <span className="p-label">Nom</span>
              <input name="name" required autoComplete="name" />
            </label>
            <label className="p-field">
              <span className="p-label">Email</span>
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label className="p-field">
              <span className="p-label">Message</span>
              <textarea name="message" rows={4} required />
            </label>
            <button className="p-btn" type="submit" disabled={cstatus === "sending"}>
              {cstatus === "sending" ? "Envoi…" : cstatus === "ok" ? "Message envoyé" : "Envoyer"}
            </button>
            {cstatus === "error" && <p className="p-label">Erreur, réessayez.</p>}
          </form>
          <div className="p-insta">
            <span className="p-label">Instagram</span>
            <a className="p-insta__link" href={INSTAGRAM} target="_blank" rel="noopener noreferrer">
              @matt.jno <span className="p-insta__arrow">↗</span>
            </a>
          </div>
        </div>
      </section>

      {/* Pied de page */}
      <footer className="p-footer">
        <div className="p-footer__mark" aria-label="MATT.JNO">
          {"MATT.JNO".split("").map((c, i) => <span key={i} aria-hidden="true">{c}</span>)}
        </div>
        <div className="p-footer__bar">
          <span className="p-label">© 2026 MATT.JNO</span>
          <button className="p-label" onClick={() => go("top")} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>Haut de page ↑</button>
        </div>
      </footer>

      {/* Outils du prototype */}
      <div className="p-tools" role="toolbar" aria-label="Options du prototype">
        <span>Titres</span>
        <button aria-pressed={type === "sans"} onClick={() => setType("sans")}>Sans</button>
        <button aria-pressed={type === "serif"} onClick={() => setType("serif")}>Serif</button>
        <button onClick={replay}>↺ Intro</button>
      </div>
    </div>
  );
}
