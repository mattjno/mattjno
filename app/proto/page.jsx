"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "@fontsource-variable/instrument-sans";
import "@fontsource/instrument-serif/400-italic.css";
import { HERO, MATCHES, CURTAIN, ROW, INDEX } from "./photos";
import "./proto.css";

const INSTAGRAM = "https://instagram.com/matt.jno";
const HERO_INTERVAL = 5500;
const LOCAL = process.env.NEXT_PUBLIC_LOCAL_IMG === "1";
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const fmtDate = (d) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${day} ${MONTHS[m - 1]} ${y}`;
};
const vs = (p) => `${p.home} – ${p.away}`;

// Taille du titre déchiré : la plus longue équipe doit tenir dans sa moitié d'écran
const LONGEST = Math.max(...MATCHES.flatMap((m) => [m.home.length, m.away.length]));
const TITLE_SIZE = `${Math.min(11, 44 / (LONGEST * 0.62)).toFixed(2)}vw`;

function Pic({ p, sizes, alt, priority = false, quality = 78 }) {
  const src = LOCAL ? `/_local/${p.src.split("/").slice(-2).join("__").replace(/ /g, "_")}` : p.src;
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} quality={quality} unoptimized={LOCAL} />;
}

const STATEMENT =
  "Football, handball, basket, football américain. Je photographie le sport au bord du terrain, au plus près du geste.";

export default function Proto() {
  const root = useRef(null);
  const navRef = useRef(null);
  const lenisRef = useRef(null);
  const [slide, setSlide] = useState(0);
  const [type, setType] = useState("sans");
  const [active, setActive] = useState(0);
  const [count, setCount] = useState(1);
  const [cstatus, setCstatus] = useState("idle");

  // Diaporama du hero, en pause quand l'onglet est caché
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

    // Une apparition qui ne peut jamais se déclencher (bas de page trop court) est jouée d'office
    const settleIfUnreachable = (self) => {
      if (self.animation && self.start >= ScrollTrigger.maxScroll(window) - 2) self.animation.progress(1);
    };

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);

      // ---------- Intro : MATT.JNO se trace, puis le rideau se lève ----------
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

      if (reduce) return; // la page réduite est la page finie

      // ---------- Hero qui recule ----------
      const hero = q(".p-hero")[0];
      gsap.to(q(".p-hero__media"), { yPercent: 8, scale: 1.06, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
      gsap.to(q(".p-hero__dim"), { opacity: 0.45, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
      gsap.to(q(".p-hero__text"), { yPercent: -30, opacity: 0, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "70% top", scrub: true } });

      // ---------- Les matchs : le titre se déchire puis se recolle ----------
      q(".m-proj").forEach((proj, i) => {
        const st = { trigger: proj, start: "top bottom", end: "bottom top", scrub: true };
        const tl = gsap.timeline({ scrollTrigger: st, defaults: { ease: "none" } });
        tl.fromTo(proj.querySelector(".m-pane--l .m-img"), { yPercent: 12 }, { yPercent: -12 }, 0)
          .fromTo(proj.querySelector(".m-pane--r .m-img"), { yPercent: -12 }, { yPercent: 12 }, 0)
          .fromTo(proj.querySelector(".m-title__home"), { y: "22vh" }, { y: "-22vh" }, 0)
          .fromTo(proj.querySelector(".m-title__away"), { y: "-22vh" }, { y: "22vh" }, 0);
        gsap.from(proj.querySelector(".m-meta"), {
          opacity: 0, y: 16, duration: 0.8, ease: "expo.out",
          scrollTrigger: { trigger: proj, start: "top 15%", toggleActions: "play none none reverse" },
        });
        ScrollTrigger.create({ trigger: proj, start: "top center", end: "bottom center", onToggle: (s) => s.isActive && setCount(i + 1) });
      });
      gsap.from(q(".m-pin__inner > *"), {
        opacity: 0, y: 20, duration: 0.8, stagger: 0.08, ease: "expo.out",
        scrollTrigger: { trigger: q(".m")[0], start: "top 60%" },
      });

      // ---------- Déclaration : l'encre se remplit mot à mot ----------
      const words = q(".s__text .w");
      gsap.to(words, {
        opacity: 1, stagger: 0.04, ease: "none",
        scrollTrigger: { trigger: q(".s__text")[0], start: "top 80%", end: "bottom 45%", scrub: true },
      });
      gsap.from(q(".s__head .p-mask > span"), { yPercent: 110, duration: 1, ease: "expo.out", scrollTrigger: { trigger: q(".s")[0], start: "top 85%" } });

      // ---------- Rideau : chaque photo recule sous la suivante ----------
      const figs = q(".c-fig");
      figs.forEach((fig, i) => {
        gsap.from(fig.querySelector(".c-cap"), { y: 24, opacity: 0, duration: 0.9, ease: "expo.out", scrollTrigger: { trigger: fig, start: "top 35%", toggleActions: "play none none reverse" } });
        const next = figs[i + 1];
        if (!next) return;
        gsap.timeline({ scrollTrigger: { trigger: next, start: "top bottom", end: "top top", scrub: true }, defaults: { ease: "none" } })
          .to(fig.querySelector(".c-inner"), { scale: 0.92 }, 0)
          .to(fig.querySelector(".c-shade"), { opacity: 0.65 }, 0);
      });

      // ---------- Portfolio : la verticale devient horizontale ----------
      const g = q(".g")[0];
      const track = q(".g__track")[0];
      if (wide && g && track) {
        g.classList.add("is-pinned");
        const dx = () => track.scrollWidth - window.innerWidth;
        g.style.height = `${window.innerHeight + dx()}px`;
        const move = gsap.to(track, {
          x: () => -dx(), ease: "none",
          scrollTrigger: {
            trigger: g, start: "top top", end: "bottom bottom", scrub: true, invalidateOnRefresh: true,
            onRefreshInit: () => { g.style.height = `${window.innerHeight + dx()}px`; },
          },
        });
        // Chaque photo glisse dans son cadre, en sens inverse
        q(".g__img").forEach((img) => {
          gsap.fromTo(img, { xPercent: 5 }, {
            xPercent: -5, ease: "none",
            scrollTrigger: { trigger: img.closest(".g__item"), containerAnimation: move, start: "left right", end: "right left", scrub: true },
          });
        });
        gsap.from(q(".g__top > *"), { y: 24, opacity: 0, duration: 0.9, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: g, start: "top 70%" } });
      } else {
        gsap.from(q(".g__top > *, .g__item"), { y: 24, opacity: 0, duration: 0.9, stagger: 0.07, ease: "expo.out", scrollTrigger: { trigger: q(".g")[0], start: "top 80%" } });
      }

      // ---------- Tous les matchs : la ligne au centre de l'écran devient active ----------
      q(".l__row").forEach((row, i) => {
        ScrollTrigger.create({ trigger: row, start: "top 55%", end: "bottom 55%", onToggle: (s) => s.isActive && setActive(i) });
      });
      gsap.from(q(".l__body .p-head, .l__row"), { y: 20, opacity: 0, duration: 0.8, stagger: 0.05, ease: "expo.out", scrollTrigger: { trigger: q(".l")[0], start: "top 80%" } });
      gsap.from(q(".l__pic"), { clipPath: "inset(100% 0 0 0)", duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: q(".l")[0], start: "top 75%" } });

      // ---------- Contact : la navigation passe à l'encre noire ----------
      ScrollTrigger.create({
        trigger: q(".k")[0], start: "top 40px", end: "bottom 40px",
        onToggle: (s) => navRef.current && navRef.current.classList.toggle("is-paper", s.isActive),
      });
      gsap.from(q(".k__intro > *, .k__form > *"), { y: 24, opacity: 0, duration: 0.8, stagger: 0.06, ease: "expo.out", scrollTrigger: { trigger: q(".k")[0], start: "top 70%", onRefresh: settleIfUnreachable } });
      gsap.from(q(".k__handle > span"), { yPercent: 100, duration: 1.1, stagger: 0.04, ease: "expo.out", scrollTrigger: { trigger: q(".k__handle")[0], start: "top 95%", onRefresh: settleIfUnreachable } });

      // ---------- Signature finale ----------
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
    } catch {
      setCstatus("error");
    }
  };

  return (
    <div className="proto" ref={root} data-type={type}>
      <div className="p-intro" aria-hidden="true">
        <svg viewBox="0 -34 190 44"><text x="0" y="0" fontSize="44">MATT.JNO</text></svg>
      </div>

      <nav className="p-nav" ref={navRef}>
        <button className="p-nav__brand" onClick={() => go("top")}>MATT.JNO</button>
        <div className="p-nav__links">
          <button className="p-hide-s" onClick={() => go("matchs")}>Matchs</button>
          <button onClick={() => go("portfolio")}>Portfolio</button>
          <button onClick={() => go("contact")}>Contact</button>
          <a className="p-hide-s" href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram</a>
        </div>
      </nav>

      <main>
        {/* Hero (validé) */}
        <header className="p-hero" id="top">
          <div className="p-hero__media">
            {HERO.map((p, i) => (
              <div key={p.src} className={`p-hero__slide${i === slide ? " is-active" : ""}`}>
                <div className="p-hero__img p-fill">
                  <Pic p={p} alt={`${vs(p)}, ${p.sport}`} sizes="100vw" priority={i === 0} quality={80} />
                </div>
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

        {/* Les matchs : titre déchiré */}
        <section className="m" id="matchs" aria-labelledby="matchs-h">
          <div className="m-pin">
            <div className="m-pin__inner">
              <h2 className="p-head p-switch" id="matchs-h">Les matchs</h2>
              <p className="m-count">{count} sur {MATCHES.length}</p>
            </div>
          </div>
          {MATCHES.map((m) => (
            <article className="m-proj" key={m.home} style={{ "--fs": TITLE_SIZE }}>
              <div className="m-stage">
                <div className="m-pane m-pane--l">
                  <div className="m-img p-fill"><Pic p={m.left} alt={`${vs(m)}, ${m.sport}`} sizes="50vw" /></div>
                </div>
                <div className="m-pane m-pane--r">
                  <div className="m-img p-fill"><Pic p={m.right} alt={`${vs(m)}, ${m.sport}`} sizes="50vw" /></div>
                </div>
                <h3 className="m-title p-switch" aria-label={vs(m)}>
                  <span className="m-title__home" aria-hidden="true">{m.home}</span>
                  <span className="m-title__away" aria-hidden="true">{m.away}</span>
                </h3>
                <p className="m-meta">{m.sport}, {fmtDate(m.date)}</p>
              </div>
            </article>
          ))}
        </section>

        {/* Déclaration */}
        <section className="s" aria-labelledby="s-h">
          <h2 className="p-head p-switch s__head" id="s-h"><span className="p-mask"><span>Au bord du terrain</span></span></h2>
          <p className="s__text">
            {STATEMENT.split(" ").map((w, i) => <span className="w" key={i}>{w} </span>)}
          </p>
        </section>

        {/* Rideau */}
        <section aria-label="Trois images">
          {CURTAIN.map((p) => (
            <figure className="c-fig" key={p.src}>
              <div className="c-inner p-fill"><Pic p={p} alt={`${vs(p)}, ${p.sport}`} sizes="100vw" quality={80} /></div>
              <div className="c-shade" />
              <figcaption className="c-cap">{vs(p)}, {p.sport.toLowerCase()}, {fmtDate(p.date)}</figcaption>
            </figure>
          ))}
        </section>

        {/* Portfolio : galerie latérale */}
        <section className="g" id="portfolio" aria-labelledby="g-h">
          <div className="g__stage">
            <div className="g__top">
              <h2 className="p-head p-switch" id="g-h">Portfolio</h2>
              <p className="g__note">Une sélection, tous sports confondus.</p>
            </div>
            <div className="g__window">
            <ul className="g__track">
              {ROW.map((p) => (
                <li className="g__item" key={p.src}>
                  <div className="g__frame">
                    <div className="g__img p-fill"><Pic p={p} alt={`${vs(p)}, ${p.sport}`} sizes="(min-width: 900px) 30vw, 72vw" /></div>
                  </div>
                  <p className="g__cap"><span>{vs(p)}</span><span>{p.sport}, {p.date.slice(0, 4)}</span></p>
                </li>
              ))}
            </ul>
            </div>
          </div>
        </section>

        {/* Tous les matchs : la chose vivante */}
        <section className="l" aria-labelledby="l-h">
          <div className="l__pic">
            {INDEX.map((p, i) => (
              <div className={`p-fill${i === active ? " is-on" : ""}`} key={p.src} style={{ position: "absolute", inset: 0 }}>
                <Pic p={p} alt={i === active ? `${vs(p)}, ${p.sport}` : ""} sizes="(min-width: 900px) 40vw, 100vw" />
              </div>
            ))}
          </div>
          <div className="l__body">
            <h2 className="p-head p-switch" id="l-h">Tous les matchs</h2>
            <ul className="l__list">
              {INDEX.map((p, i) => (
                <li className={`l__row${i === active ? " is-on" : ""}`} key={p.src}>
                  <button onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onClick={() => setActive(i)} aria-expanded={i === active}>
                    <span className="l__name">{vs(p)}</span>
                    <span className="l__meta">{p.sport}</span>
                  </button>
                  <div className="l__desc"><div><p>{fmtDate(p.date)}. {p.count} photos sélectionnées.</p></div></div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Contact */}
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
              <span>Photos de matchs, de joueurs et d'équipes</span>
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
