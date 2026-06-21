"use client";

import { useEffect, useRef, useState } from "react";

/* ----------------------------------------------------------------------------
   MATT.JNO — page unique « Match Day »
   Lit /site.json (généré par scripts/generate-manifests.mjs depuis R2).
   - Sélection : grand visuel cinématique en fondu enchaîné (re-mélangé à chaque visite)
   - Matchs    : filtre par sport + galeries mosaïque, lightbox
---------------------------------------------------------------------------- */

const BG = "#ece8e0", INK = "#13110f", SOFT = "#7c756a", FAINT = "rgba(19,17,15,0.15)", PANEL = "#e1dccf";
const DISPLAY = "'Anton', Impact, sans-serif";
const SANS = "'Archivo', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const GAP = "12px", COLW = "248px";
const TR = "opacity .9s cubic-bezier(.2,.7,.2,1), transform .9s cubic-bezier(.2,.7,.2,1)";

function fmtDate(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || "");
  return m ? `${m[3]}.${m[2]}.${m[1]}` : (d || "");
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

export default function Home() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("Tous");
  const [heroIdx, setHeroIdx] = useState(0);
  const [lb, setLb] = useState(null);
  const [narrow, setNarrow] = useState(false);
  const [cstatus, setCstatus] = useState("");
  const revealed = useRef(new Set());

  // Données
  useEffect(() => {
    fetch("/site.json")
      .then((r) => r.json())
      .then((j) => {
        const albums = j.albums || [];
        const pool = albums.reduce((acc, a) => acc.concat(a.photos || []), []);
        const fallback = pool.map((p) => ({ src: p.src, w: p.w, h: p.h }));
        const selection = (j.selection && j.selection.length ? j.selection : shuffle(fallback)).slice(0, 18);
        setData({ albums, selection: shuffle(selection).slice(0, 18) });
      })
      .catch(() => setData({ albums: [], selection: [] }));
  }, []);

  // Largeur écran
  useEffect(() => {
    const f = () => setNarrow(window.innerWidth < 760);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  // Diaporama auto de la sélection
  useEffect(() => {
    if (!data || data.selection.length < 2) return;
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % data.selection.length), 4200);
    return () => clearInterval(id);
  }, [data]);

  // Apparition au scroll
  useEffect(() => {
    if (!data) return;
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (e.isIntersecting) {
          const k = e.target.dataset.key;
          if (k) revealed.current.add(k);
          e.target.style.opacity = "1";
          e.target.style.transform = "none";
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -5% 0px" });
    document.querySelectorAll("[data-key]").forEach((el) => { if (!revealed.current.has(el.dataset.key)) io.observe(el); });
    return () => io.disconnect();
  }, [data, filter, narrow]);

  // Clavier lightbox
  useEffect(() => {
    if (!lb) return;
    const f = (e) => {
      if (e.key === "Escape") setLb(null);
      else if (e.key === "ArrowRight") setLb((l) => l && { ...l, idx: (l.idx + 1) % l.list.length });
      else if (e.key === "ArrowLeft") setLb((l) => l && { ...l, idx: (l.idx - 1 + l.list.length) % l.list.length });
    };
    document.addEventListener("keydown", f);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", f); document.body.style.overflow = ""; };
  }, [lb]);

  const albums = (data && data.albums) || [];
  const selection = (data && data.selection) || [];
  const photoCount = albums.reduce((n, a) => n + (a.count || a.photos.length), 0);

  const present = Array.from(new Set(albums.map((a) => a.sport)));
  const sportList = ["Tous"].concat(Array.from(new Set(present.concat(["Football", "Basket", "Handball"]))));
  const filtered = filter === "Tous" ? albums : albums.filter((a) => a.sport === filter);

  const reveal = (key) => ({
    opacity: revealed.current.has(key) ? 1 : 0,
    transform: revealed.current.has(key) ? "none" : "translateY(20px)",
    transition: TR,
  });

  const hi = selection.length ? heroIdx % selection.length : 0;
  const openLb = (list, idx) => setLb({ list, idx });
  const onImgError = (e) => { e.currentTarget.style.visibility = "hidden"; };
  const onImgLoad = (e) => { e.currentTarget.style.opacity = "1"; };

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
    <div id="top" style={{ minHeight: "100vh", background: BG, color: INK, fontFamily: SANS }}>

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px clamp(20px,4vw,60px)", background: "rgba(236,232,224,0.82)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: `1px solid ${FAINT}` }}>
        <a href="#top" style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, letterSpacing: "0.26em", textTransform: "uppercase", color: INK, textDecoration: "none" }}>MATT.JNO</a>
        <nav style={{ display: "flex", gap: "clamp(18px,3vw,38px)" }}>
          {[["#selection", "Sélection"], ["#matchs", "Matchs"], ["#contact", "Contact"]].map(([href, label]) => (
            <a key={href} href={href} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: SOFT, textDecoration: "none" }}>{label}</a>
          ))}
        </nav>
      </header>

      {/* Hero */}
      <section style={{ padding: "clamp(48px,9vw,120px) clamp(20px,4vw,60px) clamp(26px,4vw,52px)" }}>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", color: SOFT, marginBottom: "clamp(16px,3vw,28px)" }}>Photographe de sport</div>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(74px,15vw,248px)", lineHeight: 0.82, textTransform: "uppercase", margin: 0, color: INK }}>Matt Jno</h1>
        <div style={{ display: "flex", gap: "clamp(18px,4vw,60px)", flexWrap: "wrap", alignItems: "baseline", marginTop: "clamp(20px,3vw,38px)" }}>
          <p style={{ fontFamily: SANS, fontSize: "clamp(15px,1.4vw,19px)", lineHeight: 1.5, color: INK, maxWidth: "46ch", margin: 0, flex: "1 1 320px" }}>
            Photographe de football : l'émotion, le duel et le geste décisif, saisis au plus près du terrain.
          </p>
          <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: SOFT, whiteSpace: "nowrap" }}>{albums.length} matchs · {photoCount} photos</div>
        </div>
      </section>

      {/* Sélection — diaporama cinématique */}
      <section id="selection" style={{ scrollMarginTop: 78, paddingTop: "clamp(28px,5vw,64px)" }}>
        <div data-key="sel-h" style={reveal("sel-h")}>
          <div onClick={() => selection.length && openLb(selection, hi)} role="button" aria-label="Voir la sélection"
            style={{ position: "relative", width: "100%", height: "clamp(420px,56vh,600px)", overflow: "hidden", background: PANEL, cursor: "pointer" }}>
            {selection.map((p, j) => (
              <img key={j} src={p.src} alt="MATT.JNO — sélection" loading="lazy" onError={onImgError}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: j === hi ? 1 : 0, transition: "opacity 1.5s ease", willChange: "opacity", animation: j === hi ? "kb 7s ease-out forwards" : "none" }} />
            ))}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.38), rgba(0,0,0,0) 42%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: "clamp(16px,2.5vw,30px)", left: "clamp(18px,3vw,44px)", fontFamily: DISPLAY, textTransform: "uppercase", fontSize: "clamp(30px,4.5vw,68px)", lineHeight: 1, letterSpacing: "-0.01em", color: "#fff", pointerEvents: "none" }}>Sélection</div>
            <div style={{ position: "absolute", bottom: "clamp(16px,2.5vw,28px)", right: "clamp(18px,3vw,44px)", fontFamily: MONO, fontSize: 12, letterSpacing: "0.18em", color: "#fff", opacity: 0.85, pointerEvents: "none" }}>
              {selection.length ? `${String(hi + 1).padStart(2, "0")} / ${String(selection.length).padStart(2, "0")}` : ""}
            </div>
          </div>
        </div>
      </section>

      {/* Matchs */}
      <div id="matchs" style={{ scrollMarginTop: 78, paddingTop: "clamp(40px,7vw,96px)" }}>
        <div data-key="filter-h" style={reveal("filter-h")}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap", padding: "0 clamp(20px,4vw,60px) clamp(14px,2vw,22px)", marginBottom: "clamp(22px,3vw,38px)", borderBottom: `1px solid ${FAINT}` }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: SOFT, marginBottom: 10 }}>Saison 2026</div>
              <h2 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(40px,7.5vw,108px)", lineHeight: 0.85, textTransform: "uppercase", margin: 0, color: INK }}>Matchs</h2>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {sportList.map((name) => {
                const active = filter === name;
                return (
                  <button key={name} onClick={() => setFilter(name)}
                    style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", padding: "8px 15px", borderRadius: 999, cursor: "pointer", transition: "all .2s ease", border: `1px solid ${active ? INK : FAINT}`, background: active ? INK : "transparent", color: active ? BG : SOFT }}>
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {data && filtered.length === 0 && (
          <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", color: SOFT, padding: "clamp(40px,8vw,90px) clamp(20px,4vw,60px)" }}>
            Aucun album pour ce sport — bientôt.
          </div>
        )}

        {filtered.map((m, mi) => {
          const lbList = m.photos.map((p) => ({ src: p.src }));
          const title = m.away ? `${m.home} — ${m.away}` : m.home;
          return (
            <section key={m.id} style={{ marginBottom: "clamp(50px,8vw,120px)" }}>
              <div data-key={`mh-${m.id}`} style={reveal(`mh-${m.id}`)}>
                <div style={{ padding: "0 clamp(20px,4vw,60px)" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "clamp(14px,2.5vw,40px)" }}>
                    <span style={{ fontFamily: DISPLAY, fontSize: "clamp(60px,12vw,176px)", lineHeight: 0.72, color: INK, opacity: 0.9 }}>{String(mi + 1).padStart(2, "0")}</span>
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: "clamp(4px,1vw,12px)" }}>
                      <div style={{ display: "inline-block", fontFamily: MONO, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: BG, background: INK, padding: "4px 11px", borderRadius: 2, marginBottom: 12 }}>{m.sport}</div>
                      <h3 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(32px,6vw,96px)", lineHeight: 0.86, textTransform: "uppercase", letterSpacing: "-0.005em", margin: 0, color: INK }}>{title}</h3>
                      <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: SOFT, marginTop: 12 }}>{fmtDate(m.date)}</div>
                    </div>
                  </div>
                  <div style={{ height: 2, background: INK, marginTop: 16 }} />
                </div>
              </div>

              <div style={{ columns: COLW, columnGap: GAP, padding: "clamp(22px,3vw,38px) clamp(20px,4vw,60px) 0" }}>
                {m.photos.map((p, j) => (
                  <div key={j} data-key={`${m.id}-${j}`} onClick={() => openLb(lbList, j)} role="button" tabIndex={0} aria-label="Voir la photo"
                    style={{ breakInside: "avoid", marginBottom: GAP, background: PANEL, overflow: "hidden", cursor: "pointer", position: "relative", borderRadius: 1, aspectRatio: `${p.w} / ${p.h}`, transition: TR, ...reveal(`${m.id}-${j}`) }}>
                    <img src={p.src} alt={`MATT.JNO — ${title}`} loading="lazy" onLoad={onImgLoad} onError={onImgError}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0, transition: "opacity .7s ease, transform 1.2s cubic-bezier(.2,.7,.2,1)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.045)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "none")} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Contact */}
      <footer id="contact" style={{ padding: "clamp(60px,9vw,128px) clamp(20px,4vw,60px) clamp(40px,6vw,70px)", borderTop: `1px solid ${FAINT}`, marginTop: "clamp(40px,7vw,90px)" }}>
        <div style={{ maxWidth: 1000 }}>
          <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: SOFT, marginBottom: 10 }}>Contact</div>
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(40px,7.5vw,104px)", lineHeight: 0.85, textTransform: "uppercase", margin: "0 0 clamp(26px,4vw,46px)", color: INK }}>Travaillons ensemble.</h2>
          {cstatus === "ok" ? (
            <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", color: SOFT }}>Message envoyé ✓ — merci, réponse rapide.</div>
          ) : (
            <form onSubmit={submitContact} style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "clamp(20px,3vw,34px)", maxWidth: 680 }}>
              <div>
                <label style={labelStyle}>Nom</label>
                <input name="name" required placeholder="Votre nom" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input name="email" type="email" required placeholder="votre@email.com" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Message</label>
                <input name="message" required placeholder="Une question, un projet, une collaboration" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <button type="submit" disabled={cstatus === "sending"} style={{ background: INK, color: BG, border: "none", fontFamily: MONO, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", padding: "14px 32px", cursor: "pointer", borderRadius: 1, opacity: cstatus === "sending" ? 0.5 : 1 }}>
                  {cstatus === "sending" ? "Envoi…" : "Envoyer"}
                </button>
                {cstatus === "error" && <span style={{ marginLeft: 16, fontFamily: MONO, fontSize: 11, color: "#b4462f" }}>Erreur, réessaie.</span>}
              </div>
            </form>
          )}
          <div style={{ marginTop: "clamp(50px,8vw,90px)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: SOFT }}>© MATT.JNO — 2026</span>
            <a href="#top" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: SOFT, textDecoration: "none" }}>Haut de page ↑</a>
          </div>
        </div>
      </footer>

      {/* Lightbox */}
      {lb && (
        <div onClick={() => setLb(null)} style={{ position: "fixed", inset: 0, background: "rgba(12,11,10,0.95)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn .2s ease" }}>
          <img src={lb.list[lb.idx].src} alt="MATT.JNO" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "92vw", maxHeight: "88vh", objectFit: "contain", animation: "lbIn .25s ease", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }} />
          <button onClick={(e) => { e.stopPropagation(); setLb((l) => ({ ...l, idx: (l.idx - 1 + l.list.length) % l.list.length })); }} aria-label="Précédente" style={navBtn("left")}>‹</button>
          <button onClick={(e) => { e.stopPropagation(); setLb((l) => ({ ...l, idx: (l.idx + 1) % l.list.length })); }} aria-label="Suivante" style={navBtn("right")}>›</button>
          <button onClick={() => setLb(null)} aria-label="Fermer" style={{ position: "fixed", top: 18, right: 22, background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", opacity: 0.7 }}>✕</button>
          <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", color: "#fff", opacity: 0.7 }}>{lb.idx + 1} / {lb.list.length}</div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: "block", fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: SOFT, marginBottom: 6 };
const inputStyle = { width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${FAINT}`, color: INK, fontFamily: SANS, fontSize: 15, padding: "12px 0", outline: "none" };
function navBtn(side) {
  return { position: "fixed", top: "50%", [side]: 14, transform: "translateY(-50%)", background: "none", border: "none", color: "#fff", fontSize: 46, lineHeight: 1, cursor: "pointer", opacity: 0.55, padding: 18 };
}
