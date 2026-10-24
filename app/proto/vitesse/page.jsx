"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "@fontsource-variable/instrument-sans";
import "./vitesse.css";

// Calques préparés par tools/vitesse.py (détourage automatique, flou de mouvement, halo)
const SHOTS = [
  { n: 1, w: 1120, h: 1400, dir: -1, match: "Créteil – Istres", sport: "Football", date: "30 janvier 2026" },
  { n: 2, w: 1600, h: 2000, dir: 1, match: "US Ivry – Pau Billière", sport: "Handball", date: "31 mai 2026", who: "Tavares" },
  { n: 3, w: 1600, h: 2000, dir: -1, match: "Paris Musketeers – Frankfurt Galaxy", sport: "Football américain", date: "5 juillet 2026" },
  { n: 4, w: 1600, h: 2000, dir: 0, match: "Orléans – Challans", sport: "Basket", date: "26 avril 2026" },
];

const STEPS = [
  { t: "L'image nette.", s: "Le geste figé, au déclenchement." },
  { t: "Le joueur détouré.", s: "Il passe au premier plan, seul." },
  { t: "Le fond lancé.", s: "Flou de mouvement, contour en mode Écran." },
];

function Frame({ shot, priority = false }) {
  const base = `/proto/vitesse/${shot.n}`;
  const alt = `${shot.match}, ${shot.sport.toLowerCase()}`;
  return (
    <figure className="v-frame" style={{ "--ar": `${shot.w} / ${shot.h}`, "--arn": shot.w / shot.h }} data-dir={shot.dir}>
      <div className="v-layer v-fond"><Image src={`${base}/fond.jpg`} alt={alt} fill sizes="(min-width: 900px) 45vw, 100vw" priority={priority} quality={82} /></div>
      <div className="v-layer v-speed" aria-hidden="true"><Image src={`${base}/fond-vitesse.jpg`} alt="" fill sizes="(min-width: 900px) 45vw, 100vw" quality={80} /></div>
      <div className="v-layer v-dim" aria-hidden="true" />
      <div className="v-layer v-halo" aria-hidden="true"><Image src={`${base}/halo.webp`} alt="" fill sizes="(min-width: 900px) 45vw, 100vw" quality={80} /></div>
      <div className="v-layer v-joueur" aria-hidden="true"><Image src={`${base}/joueur.webp`} alt="" fill sizes="(min-width: 900px) 45vw, 100vw" quality={85} /></div>
    </figure>
  );
}

export default function Vitesse() {
  const root = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const lenis = new Lenis({ lerp: 0.12 });
    const tick = (t) => lenis.raf(t * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);

      // Ouverture
      gsap.from(q(".v-intro h1, .v-intro p, .v-intro .v-btn"), { y: 28, opacity: 0, duration: 0.9, stagger: 0.08, ease: "expo.out" });

      // L'effet « vitesse » sur un cadre, sous forme de timeline réutilisable
      const speed = (frame, tl, at, dur) => {
        const dir = Number(frame.dataset.dir);
        const L = (s) => frame.querySelector(s);
        tl.to(L(".v-speed"), { opacity: 1, ease: "none", duration: dur }, at)
          .to([L(".v-fond"), L(".v-speed")], { xPercent: dir * 3, yPercent: dir === 0 ? -3 : 0, ease: "none", duration: dur }, at)
          .to(L(".v-halo"), { opacity: 0.9, ease: "none", duration: dur * 0.8 }, at + dur * 0.2)
          .to(L(".v-joueur"), { scale: 1.035, xPercent: -dir * 0.8, ease: "none", duration: dur }, at);
      };

      // Scène 1 : la recette en trois temps
      const recipe = q(".v-scene--recipe")[0];
      if (recipe) {
        const frame = recipe.querySelector(".v-frame");
        const steps = recipe.querySelectorAll(".v-step");
        const tl = gsap.timeline({ scrollTrigger: { trigger: recipe, start: "top top", end: "bottom bottom", scrub: true } });
        tl.to({}, { duration: 0.15 })
          // temps 2 : le fond s'éteint, le joueur reste allumé
          .to(steps[0], { autoAlpha: 0, y: -12, duration: 0.06 }, 0.2)
          .fromTo(steps[1], { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.24)
          .to(frame.querySelector(".v-dim"), { opacity: 0.78, ease: "none", duration: 0.14 }, 0.22)
          .to(frame.querySelector(".v-joueur"), { scale: 1.02, ease: "none", duration: 0.14 }, 0.22)
          // temps 3 : le fond revient, lancé
          .to(steps[1], { autoAlpha: 0, y: -12, duration: 0.06 }, 0.52)
          .fromTo(steps[2], { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.56)
          .to(frame.querySelector(".v-dim"), { opacity: 0, ease: "none", duration: 0.12 }, 0.54);
        speed(frame, tl, 0.56, 0.3);
        tl.to({}, { duration: 0.14 });
      }

      // Scènes suivantes : l'effet se déclenche au scroll, puis la légende monte
      q(".v-scene--run").forEach((scene) => {
        const frame = scene.querySelector(".v-frame");
        const tl = gsap.timeline({ scrollTrigger: { trigger: scene, start: "top top", end: "bottom bottom", scrub: true } });
        tl.to({}, { duration: 0.1 });
        speed(frame, tl, 0.1, 0.6);
        tl.to({}, { duration: 0.3 });
        gsap.from(scene.querySelectorAll(".v-cap > *, .v-side > *"), {
          y: 20, opacity: 0, duration: 0.8, stagger: 0.07, ease: "expo.out",
          scrollTrigger: { trigger: scene, start: "top 60%" },
        });
      });

      // Relief à la souris : le joueur et le fond ne bougent pas ensemble
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        q(".v-frame").forEach((frame) => {
          const pj = gsap.quickTo(frame.querySelector(".v-joueur"), "x", { duration: 0.6, ease: "power3.out" });
          const pjy = gsap.quickTo(frame.querySelector(".v-joueur"), "y", { duration: 0.6, ease: "power3.out" });
          const bg = [frame.querySelector(".v-fond"), frame.querySelector(".v-speed")];
          const pb = gsap.quickTo(bg, "x", { duration: 0.8, ease: "power3.out" });
          const pby = gsap.quickTo(bg, "y", { duration: 0.8, ease: "power3.out" });
          frame.addEventListener("pointermove", (e) => {
            const r = frame.getBoundingClientRect();
            const nx = (e.clientX - r.left) / r.width - 0.5;
            const ny = (e.clientY - r.top) / r.height - 0.5;
            pj(nx * 14); pjy(ny * 10); pb(nx * -8); pby(ny * -6);
          });
          frame.addEventListener("pointerleave", () => { pj(0); pjy(0); pb(0); pby(0); });
        });
      }

      gsap.from(q(".v-end > *"), { y: 24, opacity: 0, duration: 0.8, stagger: 0.07, ease: "expo.out", scrollTrigger: { trigger: q(".v-end")[0], start: "top 85%" } });
    }, root);

    return () => { ctx.revert(); gsap.ticker.remove(tick); lenis.destroy(); };
  }, []);

  const [first, ...rest] = SHOTS;

  return (
    <div className="v" ref={root}>
      <nav className="v-nav" aria-label="Navigation">
        <b>MATT.JNO</b>
        <Link href="/proto">Retour au prototype</Link>
      </nav>

      <main>
        <header className="v-intro">
          <h1>La vitesse</h1>
          <p>Un geste net, un joueur détouré, un fond lancé en mouvement. Faites défiler pour voir la retouche se construire.</p>
          <a className="v-btn" href="#recette">Lancer la démonstration</a>
        </header>

        <section className="v-scene v-scene--recipe" id="recette" aria-labelledby="recette-h">
          <div className="v-stage">
            <div className="v-side">
              <h2 id="recette-h">La recette</h2>
              <p>{first.match}, {first.sport.toLowerCase()}, {first.date}.</p>
            </div>
            <Frame shot={first} priority />
            <div className="v-steps" aria-live="polite">
              {STEPS.map((s) => (
                <p className="v-step" key={s.t}>{s.t}<span>{s.s}</span></p>
              ))}
            </div>
          </div>
        </section>

        {rest.map((shot) => (
          <section className="v-scene v-scene--run" key={shot.n} aria-labelledby={`h-${shot.n}`}>
            <div className="v-stage">
              <div className="v-side">
                <h2 id={`h-${shot.n}`}>{shot.sport}</h2>
              </div>
              <Frame shot={shot} />
              <p className="v-cap"><strong>{shot.who ? `${shot.who}, ${shot.match}` : shot.match}</strong>{shot.date}</p>
            </div>
          </section>
        ))}

        <section className="v-end" aria-labelledby="fin-h">
          <h2 id="fin-h">Votre club, à cette vitesse</h2>
          <p>Matchs, joueurs, contenus pour vos réseaux. Écrivez-moi pour une accréditation.</p>
          <Link className="v-btn" href="/proto#contact">Demander une couverture</Link>
        </section>
      </main>
    </div>
  );
}
