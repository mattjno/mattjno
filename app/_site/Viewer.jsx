"use client";

// Visionneuse plein écran. La photo grandit depuis sa vignette jusqu'au plein écran, entière, sans recadrage.
// Les photos ne sont jamais modifiées : seul leur cadre se déplace.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";

const LOCAL = process.env.NEXT_PUBLIC_LOCAL_IMG === "1";
const srcOf = (p) => (LOCAL && p.i != null ? `/_local/v/${p.i}.jpg` : p.src);

// Plus grand cadre au format de la photo qui tient dans l'écran, sous la barre du haut et au-dessus de la légende
function fit(p, vw, vh) {
  const narrow = vw < 760;
  const padX = narrow ? 16 : Math.max(24, Math.round(vw * 0.05));
  const top = narrow ? 60 : 76;
  const bottom = narrow ? 72 : 80;
  const aw = vw - 2 * padX;
  const ah = Math.max(160, vh - top - bottom);
  const r = p.w / p.h;
  let w = aw;
  let h = w / r;
  if (h > ah) { h = ah; w = h * r; }
  return { left: Math.round((vw - w) / 2), top: Math.round(top + (ah - h) / 2), width: Math.round(w), height: Math.round(h) };
}

export default function Viewer({ open, onClose }) {
  const { list, sport, sizes, reduce } = open;
  const n = list.length;
  const [k, setK] = useState(open.index);
  const [view, setView] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [loaded, setLoaded] = useState({});
  const root = useRef(null);
  const bg = useRef(null);
  const box = useRef(null);
  const ui = useRef(null);
  const closeBtn = useRef(null);
  const closing = useRef(false);
  const dir = useRef(1);
  const first = useRef(true);
  const swipe = useRef(null);
  const swiped = useRef(false);

  const p = list[k];
  const rect = fit(p, view.w, view.h);

  // Arrivée : la photo part de sa vignette et prend sa place, le fond noircit, la légende suit
  useLayoutEffect(() => {
    const src = open.source;
    const ctx = gsap.context(() => {
      gsap.fromTo(bg.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.out" });
      const a = src && src.getBoundingClientRect();
      if (a && a.width > 0 && !reduce) {
        const b = box.current.getBoundingClientRect();
        gsap.fromTo(
          box.current,
          { x: a.left - b.left, y: a.top - b.top, scaleX: a.width / b.width, scaleY: a.height / b.height, transformOrigin: "0 0" },
          { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.75, ease: "power3.inOut" }
        );
      } else {
        gsap.fromTo(box.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      }
      gsap.fromTo(ui.current.children, { opacity: 0, y: reduce ? 0 : 12 }, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out", stagger: 0.05, delay: reduce ? 0 : 0.4 });
    }, root);
    closeBtn.current?.focus({ preventScroll: true });
    return () => ctx.revert();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Changement de photo : la nouvelle entre par le côté d'où l'on vient
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduce) { gsap.fromTo(box.current, { opacity: 0 }, { opacity: 1, duration: 0.25, overwrite: true }); return; }
    gsap.fromTo(box.current, { x: 56 * dir.current, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, ease: "expo.out", overwrite: true });
  }, [k, reduce]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const src = open.sourceFor(k);
    const r = src && src.getBoundingClientRect();
    const visible = r && r.width > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
    const tl = gsap.timeline({ onComplete: () => onClose(k) });
    if (visible && !reduce) {
      gsap.set(box.current, { x: 0, opacity: 1 });
      const b = box.current.getBoundingClientRect();
      tl.to(ui.current, { opacity: 0, duration: 0.2 }, 0)
        .to(box.current, { x: r.left - b.left, y: r.top - b.top, scaleX: r.width / b.width, scaleY: r.height / b.height, transformOrigin: "0 0", duration: 0.6, ease: "power3.inOut" }, 0)
        .to(bg.current, { opacity: 0, duration: 0.4, ease: "power1.in" }, 0.2);
    } else {
      tl.to(root.current, { opacity: 0, duration: 0.3, ease: "power1.in" });
    }
  }, [k, open, onClose, reduce]);

  const go = useCallback((d) => {
    if (n < 2 || closing.current) return;
    dir.current = d;
    setK((v) => (v + d + n) % n);
  }, [n]);

  // Clavier : flèches, Échap, et le focus reste dans la visionneuse
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === "Tab") {
        const f = [...root.current.querySelectorAll("button")];
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    const onResize = () => setView({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize); };
  }, [close, go]);

  // Au doigt : glisser à gauche ou à droite pour changer, vers le bas pour fermer
  const onDown = (e) => { if (e.pointerType !== "mouse") swipe.current = { x: e.clientX, y: e.clientY }; };
  const onUp = (e) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { swiped.current = true; go(dx < 0 ? 1 : -1); }
    else if (dy > 90) { swiped.current = true; close(); }
  };
  const onBoxClick = () => {
    if (swiped.current) { swiped.current = false; return; }
    go(1);
  };

  const hiSizes = `${rect.width}px`;
  const near = n > 1 ? [...new Set([(k + 1) % n, (k - 1 + n) % n])].filter((j) => j !== k) : [];

  return (
    <div className="vw" ref={root} role="dialog" aria-modal="true" aria-label={`Photo agrandie, ${sport}`}>
      <div className="vw-bg" ref={bg} onClick={close} />
      <div
        className="vw-box"
        ref={box}
        style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        onClick={onBoxClick}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => { swipe.current = null; }}
      >
        <Image key={`lo-${p.src}`} className="vw-img" src={srcOf(p)} alt="" fill sizes={sizes} quality={80} unoptimized={LOCAL} draggable={false} />
        <Image
          key={`hi-${p.src}`}
          className={`vw-img vw-hi${loaded[p.src] ? " is-in" : ""}`}
          src={srcOf(p)}
          alt={`${sport}, photo ${k + 1} sur ${n}`}
          fill
          sizes={hiSizes}
          quality={88}
          priority
          unoptimized={LOCAL}
          draggable={false}
          onLoad={() => setLoaded((v) => ({ ...v, [p.src]: true }))}
        />
      </div>
      <div className="vw-pre" aria-hidden="true">
        {near.map((j) => (
          <div key={list[j].src} className="vw-pre__item">
            <Image src={srcOf(list[j])} alt="" fill sizes={hiSizes} quality={88} loading="eager" unoptimized={LOCAL} />
          </div>
        ))}
      </div>
      <div className="vw-ui" ref={ui}>
        <button className="vw-close" ref={closeBtn} type="button" onClick={close}>Fermer</button>
        {n > 1 && (
          <div className="vw-nav">
            <button type="button" onClick={() => go(-1)}>Précédente</button>
            <span className="vw-count" aria-live="polite">{k + 1} sur {n}</span>
            <button type="button" onClick={() => go(1)}>Suivante</button>
          </div>
        )}
      </div>
    </div>
  );
}
