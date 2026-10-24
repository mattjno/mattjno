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
  { id: "basket", name: "Basket", open: BASKET[0], series: BASKET.slice(1), kind: "pile" },
  { id: "football-americain", name: "Football US", full: "Football américain", open: US[0], series: US.slice(1), kind: "mosaic" },
];

const MOVES = [
  { id: "pile", label: "Pile" },
  { id: "rows", label: "Rangées" },
  { id: "mosaic", label: "Mosaïque" },
];
const DEFAULT_KINDS = { basket: "pile", "football-americain": "mosaic" };

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

function Pile({ ch }) {
  const items = ch.series.slice(0, 12);
  return (
    <div className="pi">
      <div className="pi-stage">
        <div className="pi-grid">
          {items.map((p, k) => (
            <figure className="pi-item" key={p.src} style={{ zIndex: items.length - k }}>
              <div className="pi-frame hv"><div className="pf-fill"><Pic p={p} sizes="(min-width: 760px) 18vw, 48vw" /></div></div>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}

function Rows({ ch }) {
  const rows = [];
  for (let k = 0; k < ch.series.length; k += 4) rows.push(ch.series.slice(k, k + 4));
  return (
    <div className="ro">
      {rows.map((row, r) => (
        <div className="ro-row" key={r} data-dir={r % 2 === 0 ? -1 : 1}>
          {row.map((p) => (
            <figure className="ro-item" key={p.src}>
              <div className="ro-frame hv"><div className="pf-fill"><Pic p={p} sizes="(min-width: 760px) 24vw, 48vw" /></div></div>
              <figcaption className="cap"><span>{p.match}</span><span>{p.date}</span></figcaption>
            </figure>
          ))}
        </div>
      ))}
    </div>
  );
}

function Mosaic({ ch }) {
  const items = ch.series.slice(0, 9);
  return (
    <div className="mo">
      <div className="mo-grid">
        {items.map((p, k) => (
          <figure className={`mo-item${k === 0 ? " mo-feature" : ""}`} key={p.src}>
            <div className="mo-frame hv"><div className="pf-fill"><Pic p={p} sizes={k === 0 ? "(min-width: 760px) 50vw, 100vw" : "(min-width: 760px) 24vw, 48vw"} quality={k === 0 ? 85 : 78} /></div></div>
            <figcaption className="cap"><span>{p.match}</span><span>{p.date}</span></figcaption>
          </figure>
        ))}
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
  const [kinds, setKinds] = useState(null);

  // Mouvements de basket et de football américain choisis dans la barre du prototype (?basket=…&us=…)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const ok = (v) => MOVES.some((m) => m.id === v);
    setKinds({
      basket: ok(sp.get("basket")) ? sp.get("basket") : DEFAULT_KINDS.basket,
      "football-americain": ok(sp.get("us")) ? sp.get("us") : DEFAULT_KINDS["football-americain"],
    });
  }, []);
  const kindOf = (ch) => (kinds && kinds[ch.id]) || DEFAULT_KINDS[ch.id] || ch.kind;
  const choose = (key, val) => {
    const sp = new URLSearchParams(window.location.search);
    sp.set(key, val);
    window.location.search = sp.toString();
  };

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
    if (!kinds) return;
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

      // ---------- La pile qui s'étale ----------
      q(".pi").forEach((pi) => {
        if (!wide) return;
        const grid = pi.querySelector(".pi-grid");
        const items = [...pi.querySelectorAll(".pi-item")];
        const tl = gsap.timeline({ scrollTrigger: { trigger: pi, start: "top top", end: "bottom bottom", scrub: true, invalidateOnRefresh: true }, defaults: { ease: "none" } });
        tl.to({}, { duration: 0.12 });
        items.forEach((it, k) => {
          const rot = ((k * 37) % 17) - 8;
          tl.fromTo(it, {
            x: () => grid.clientWidth / 2 - (it.offsetLeft + it.offsetWidth / 2),
            y: () => grid.clientHeight / 2 - (it.offsetTop + it.offsetHeight / 2),
            rotation: rot, scale: 1.15,
          }, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.5 }, 0.12 + k * 0.035);
        });
        tl.to({}, { duration: 0.15 });
      });

      // ---------- Les rangées qui glissent ----------
      q(".ro-row").forEach((row) => {
        const dir = Number(row.dataset.dir);
        gsap.fromTo(row, { xPercent: dir * (wide ? 38 : 20) }, {
          xPercent: 0, ease: "none",
          scrollTrigger: { trigger: row, start: "top bottom", end: "top 40%", scrub: true },
        });
      });

      // ---------- La mosaïque ----------
      q(".mo").forEach((mo) => {
        ScrollTrigger.batch(mo.querySelectorAll(".mo-item"), {
          start: "top 90%", once: true,
          onEnter: (batch) => {
            gsap.fromTo(batch.map((b) => b.querySelector(".mo-frame")), { clipPath: "inset(50% 50% 50% 50%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, stagger: 0.09, ease: "expo.out" });
            gsap.fromTo(batch.map((b) => b.querySelector(".pf-fill")), { scale: 1.3 }, { scale: 1, duration: 1.6, stagger: 0.09, ease: "expo.out" });
            gsap.fromTo(batch.map((b) => b.querySelector(".cap")), { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 0.4, stagger: 0.09 });
          },
        });
      });

      // ---------- Contact ----------
      gsap.from(q(".kc-intro > *, .kc-form > *"), { y: 24, opacity: 0, duration: 0.8, stagger: 0.06, ease: "expo.out", scrollTrigger: { trigger: q(".kc")[0], start: "top 75%", onRefresh: settleIfUnreachable } });
      gsap.from(q(".kc .k__handle > span"), { yPercent: 100, duration: 1.1, stagger: 0.04, ease: "expo.out", scrollTrigger: { trigger: q(".kc .k__handle")[0], start: "top 95%", onRefresh: settleIfUnreachable } });
    }, root);

    return () => {
      ctx.revert();
      if (lenis) { gsap.ticker.remove(tick); lenis.destroy(); }
      lenisRef.current = null;
    };
  }, [kinds]);

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
            {kindOf(ch) === "grid" && <Grid ch={ch} />}
            {kindOf(ch) === "side" && <Side ch={ch} />}
            {kindOf(ch) === "pile" && <Pile ch={ch} />}
            {kindOf(ch) === "rows" && <Rows ch={ch} />}
            {kindOf(ch) === "mosaic" && <Mosaic ch={ch} />}
          </section>
        ))}

        <section className="kc" id="contact" aria-labelledby="k-h">
          <div className="kc-top">
            <div className="kc-intro">
              <h2 className="p-head p-switch" id="k-h">Contact</h2>
              <p>Un match, une campagne, une saison à couvrir ? Écrivez-moi.</p>
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
          <a className="k__handle" href={INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram @matt.jno">
            {"@matt.jno".split("").map((c, i) => <span key={i} aria-hidden="true"><span>{c}</span></span>)}
          </a>
        </section>
      </main>

      <footer className="kc-foot">
        <span>© 2026 MATT.JNO, photographe de sport, Paris</span>
        <nav aria-label="Pied de page">
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram</a>
          <button onClick={() => go("top")}>Haut de page</button>
        </nav>
      </footer>

      <div className="p-tools" role="toolbar" aria-label="Options du prototype">
        <span>Titres</span>
        <button aria-pressed={type === "sans"} onClick={() => setType("sans")}>Sans</button>
        <button aria-pressed={type === "serif"} onClick={() => setType("serif")}>Serif</button>
        <button onClick={() => { try { sessionStorage.removeItem("mj-intro"); } catch {} window.scrollTo(0, 0); window.location.reload(); }}>Rejouer l'intro</button>
      </div>
      <div className="p-tools p-tools--moves" role="toolbar" aria-label="Mouvements à comparer">
        {[["basket", "Basket", "basket"], ["us", "Foot US", "football-americain"]].map(([key, label, id]) => (
          <div className="p-tools__group" key={key}>
            <span>{label}</span>
            {MOVES.map((m) => (
              <button key={m.id} aria-pressed={kindOf({ id }) === m.id} onClick={() => choose(key, m.id)}>{m.label}</button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
