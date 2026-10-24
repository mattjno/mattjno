// Passages d'un sport à l'autre, en test : à comparer sur la prévisualisation (barre en bas de l'écran, ou ?passage=…).
// Chaque passage joue un prélude sur l'écran tenu de l'ouverture du chapitre suivant, puis la photo s'ouvre depuis
// la forme où il s'arrête :
//   ballon     : le ballon du sport fait son geste (dribble, passe en spirale, tir), la photo apparaît dedans ;
//   terrain    : les lignes du terrain se tracent, la photo remplit le terrain ;
//   travelling : une bande de photos du sport traverse l'écran, celle du centre grandit.
// « fenetre » est l'ouverture seule, depuis le point d'action (version A). Le premier chapitre la garde toujours.
// Grand écran : tout suit le défilement. Au doigt : le prélude et l'ouverture se jouent d'eux-mêmes, en un temps fixe.

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export const PASSAGES = [
  { id: "fenetre", label: "Fenêtre" },
  { id: "ballon", label: "Ballon" },
  { id: "terrain", label: "Terrain" },
  { id: "travelling", label: "Travelling" },
];

const INK = "#f1f1ef";
const DARK = "#0b0b0b";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const span01 = (v, a, b) => clamp01((v - a) / (b - a));
const smooth = (v, a, b) => { const t = span01(v, a, b); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const pt = (r, a) => [r * Math.cos((a * Math.PI) / 180), r * Math.sin((a * Math.PI) / 180)].map((v) => +v.toFixed(2));

// ---------- Ballons, dessinés de -50 à 50 (dessin à 400 px, toujours réduit pour rester net) ----------
const LENS = "M-50 0C-32 -38 32 -38 50 0C32 38 -32 38 -50 0Z"; // ballon ovale : demi-hauteur 28,5
const LACES = ["M-15 0H15", "M-12 -4V4M-7 -4V4M-2 -4V4M3 -4V4M8 -4V4M13 -4V4"];

const BALLS = {
  // Basket : les deux méridiens et les deux coutures courbes
  basket: { seams: ["M0 -48V48", "M-48 0H48", "M-33 -35C-15 -14 -15 14 -33 35", "M33 -35C15 -14 15 14 33 35"] },
  // Football américain : les bandes près des pointes ; les lacets tournent avec la spirale
  "football-americain": { lens: true, seams: ["M-33 -19Q-27 0 -33 19", "M33 -19Q27 0 33 19"] },
  // Handball : trois longues coutures en tourbillon, d'un bord à l'autre
  handball: {
    seams: [0, 120, 240].map((a) => {
      const [x0, y0] = pt(50, a); const [x1, y1] = pt(16, a + 70); const [x2, y2] = pt(18, a + 110); const [x3, y3] = pt(50, a + 170);
      return `M${x0} ${y0}C${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`;
    }),
  },
};

export function BallArt({ id }) {
  const b = BALLS[id];
  const clip = `pb-${id}`;
  const body = (props) => (b.lens ? <path d={LENS} {...props} /> : <circle r="48" {...props} />);
  return (
    <svg viewBox="-50 -50 100 100">
      <defs><clipPath id={clip}>{body({})}</clipPath></defs>
      <g className="pb-body">
        {body({ fill: INK })}
        <g clipPath={`url(#${clip})`} fill="none" stroke={DARK} strokeWidth="2.2" strokeLinecap="round">
          {b.seams.map((d, i) => <path key={i} d={d} />)}
          {b.lens && <g className="pb-laces">{LACES.map((d, i) => <path key={i} d={d} />)}</g>}
        </g>
        {body({ fill: "none", stroke: INK, strokeWidth: 2.6 })}
      </g>
      {/* La photo apparaît dans le ballon : il n'en reste que les lignes, en clair, qui grandissent avec la fenêtre */}
      <g className="pb-ghost" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" style={{ opacity: 0 }}>
        {b.lens ? <ellipse rx="50" ry="28.5" /> : <circle r="48" />}
        <g clipPath={`url(#${clip})`}>
          {b.seams.map((d, i) => <path key={i} d={d} />)}
          {b.lens && LACES.map((d, i) => <path key={`l${i}`} d={d} />)}
        </g>
      </g>
    </svg>
  );
}

// ---------- Terrains vus d'en haut : basket et handball en mètres, football américain en yards ----------
// Chaque ligne : tracé, fenêtre de dessin [a, b] dans le prélude. side : moitié gauche, la droite en miroir.
// fade : la ligne apparaît en fondu au lieu de se tracer (marques en série, ligne pointillée).
const US_YARDS = Array.from({ length: 19 }, (_, i) => ({ d: `M${15 + 5 * i} 0V53.33`, a: 0.3 + i * 0.03, b: 0.42 + i * 0.03 }));
const US_HASH = Array.from({ length: 99 }, (_, i) => i + 11).filter((x) => x % 5)
  .map((x) => `M${x} 0.67V1.33M${x} 23.25V23.92M${x} 29.42V30.08M${x} 52V52.67`).join("");

const FIELDS = {
  basket: {
    w: 28, h: 15,
    lines: [
      { d: "M0 0H28V15H0Z", a: 0, b: 0.4 },
      { d: "M14 0V15", a: 0.2, b: 0.5 },
      { d: "M15.8 7.5A1.8 1.8 0 1 1 12.2 7.5A1.8 1.8 0 1 1 15.8 7.5", a: 0.35, b: 0.65 },
    ],
    side: [
      { d: "M0 0.9H2.99A6.75 6.75 0 0 1 2.99 14.1H0", a: 0.3, b: 0.75 },
      { d: "M0 5.05H5.8V9.95H0", a: 0.45, b: 0.8 },
      { d: "M5.8 5.7A1.8 1.8 0 0 1 5.8 9.3A1.8 1.8 0 0 1 5.8 5.7", a: 0.6, b: 0.9 },
      { d: "M1.575 6.25A1.25 1.25 0 0 1 1.575 8.75", a: 0.75, b: 0.95 },
      { d: "M1.2 6.6V8.4", a: 0.75, b: 0.95 },
      { d: "M1.8 7.5A0.225 0.225 0 1 1 1.35 7.5A0.225 0.225 0 1 1 1.8 7.5", a: 0.8, b: 1 },
    ],
  },
  "football-americain": {
    w: 120, h: 53.33,
    lines: [
      { d: "M0 0H120V53.33H0Z", a: 0, b: 0.35 },
      { d: "M10 0V53.33", a: 0.15, b: 0.45 },
      { d: "M110 0V53.33", a: 0.15, b: 0.45 },
      ...US_YARDS,
      { d: US_HASH, a: 0.7, b: 1, fade: true },
    ],
  },
  handball: {
    w: 40, h: 20,
    lines: [
      { d: "M0 0H40V20H0Z", a: 0, b: 0.4 },
      { d: "M20 0V20", a: 0.2, b: 0.5 },
    ],
    side: [
      { d: "M0 2.5A6 6 0 0 1 6 8.5V11.5A6 6 0 0 1 0 17.5", a: 0.35, b: 0.8 },
      { d: "M2.96 0A9 9 0 0 1 9 8.5V11.5A9 9 0 0 1 2.96 20", a: 0.6, b: 1, fade: true, dash: true },
      { d: "M0 8.5H-1V11.5H0", a: 0.65, b: 0.9 },
      { d: "M7 9.5V10.5", a: 0.75, b: 0.95 },
      { d: "M4 9.85V10.15", a: 0.8, b: 1 },
    ],
  },
};

function Line({ l }) {
  const win = `${l.a} ${l.b}`;
  return l.fade
    ? <path d={l.d} data-fade={win} strokeDasharray={l.dash ? "0.3 0.3" : undefined} />
    : <path d={l.d} data-draw={win} pathLength="1" />;
}

export function FieldArt({ id }) {
  const f = FIELDS[id];
  return (
    <svg viewBox={`0 0 ${f.w} ${f.h}`}>
      {f.lines.map((l, i) => <Line key={i} l={l} />)}
      {f.side && [0, 1].map((m) => (
        <g key={m} transform={m ? `translate(${f.w} 0) scale(-1 1)` : undefined}>
          {f.side.map((l, i) => <Line key={i} l={l} />)}
        </g>
      ))}
    </svg>
  );
}

// Un passage a-t-il de quoi se jouer pour ce sport ?
export const fits = (kind, id) => (kind === "ballon" ? !!BALLS[id] : kind === "terrain" ? !!FIELDS[id] : kind === "travelling");

// ---------- Gestes : position, taille et rotation du ballon pour g de 0 (départ) à 1 (posé au point d'action) ----------
const GESTURES = {
  // Le dribble : le ballon tombe d'en haut, rebondit de moins en moins haut en avançant, s'écrase un peu à chaque
  // contact (durée de chaque rebond proportionnelle à la racine de sa hauteur, comme une vraie chute), puis se pose.
  basket({ vw, vh, R, cx, cy }) {
    const x0 = cx - Math.max(0.5 * vw, 3 * R);
    const H1 = Math.min(0.3 * vh, Math.max(0.12 * vh, cy - 0.8 * R));
    const H = [cy + 1.6 * R, H1, H1 * 0.5, H1 * 0.22, H1 * 0.08];
    const segs = [Math.sqrt(H[0]), ...H.slice(1).map((h) => 2 * Math.sqrt(h)), 0.7 * Math.sqrt(H1)];
    const starts = segs.reduce((acc, s) => [...acc, acc[acc.length - 1] + s], [0]);
    const total = starts[starts.length - 1];
    return (g) => {
      const tt = g * total;
      let k = 0;
      while (k < segs.length - 1 && tt >= starts[k + 1]) k++;
      const s = (tt - starts[k]) / segs[k];
      const y = k === 0 ? cy - H[0] * (1 - s * s) : k < H.length ? cy - H[k] * 4 * s * (1 - s) : cy;
      // Écrasement au contact du sol, d'autant plus fort que la chute était haute
      let sq = 0;
      for (let j = 1; j <= H.length; j++) {
        const v = 1 - Math.abs(tt - starts[j]) / (0.03 * total);
        if (v > 0) sq = Math.max(sq, v * v * Math.min(1, Math.sqrt(H[j - 1] / H1)));
      }
      const sy = 1 - 0.22 * sq;
      const x = lerp(x0, cx, 1 - (1 - g) * (1 - g));
      return { x, y: y + R * (1 - sy), s: 1, sx: 1 + 0.16 * sq, sy, rot: ((x - x0) / R) * 46 };
    };
  },

  // La passe en spirale : lancée du bord gauche, au-dessus du titre, longue cloche, le nez suit la trajectoire et
  // se remet à l'horizontale à la réception ; le ballon grossit en venant vers nous, les lacets tournent.
  "football-americain"({ vw, vh, cx, cy, rx, ry, bottom }) {
    const P0 = [Math.min(cx - 0.7 * vw, -1.3 * rx), Math.min(bottom - 0.6 * ry, 0.5 * vh)];
    const P1 = [lerp(P0[0], cx, 0.55), -0.12 * vh];
    return (g) => {
      const t = 1 - Math.pow(1 - g, 1.3);
      const u = 1 - t;
      const x = u * u * P0[0] + 2 * u * t * P1[0] + t * t * cx;
      const y = u * u * P0[1] + 2 * u * t * P1[1] + t * t * cy;
      const dx = 2 * u * (P1[0] - P0[0]) + 2 * t * (cx - P1[0]);
      const dy = 2 * u * (P1[1] - P0[1]) + 2 * t * (cy - P1[1]);
      const rot = Math.atan2(dy, dx) * (180 / Math.PI) * (1 - smooth(g, 0.78, 1)) + Math.sin(g * 31) * 4 * (1 - g);
      return { x, y, s: lerp(0.55, 1, smooth(g, 0, 1)), rot, phi: g * Math.PI * 12 };
    };
  },

  // Le tir, vu du gardien : le bras arme en haut à droite, puis le ballon fonce sur nous (taille en perspective,
  // qui explose à la fin), en vrille, et vibre à l'impact.
  handball({ vw, vh, cx, cy }) {
    const hand = [Math.min(cx + 0.24 * vw, 0.86 * vw), Math.max(0.16 * vh, cy - 0.3 * vh)];
    const back = [hand[0] + 0.04 * vw, hand[1] + 0.05 * vh];
    const S0 = 0.13;
    return (g) => {
      if (g < 0.22) {
        const w = smooth(g, 0, 0.22);
        return { x: lerp(back[0], hand[0], w), y: lerp(back[1], hand[1], w), s: S0 * lerp(0.7, 1, w), rot: -40 * w };
      }
      const u = span01(g, 0.22, 0.8);
      const s = S0 / (S0 + (1 - S0) * (1 - u));
      const w = (s - S0) / (1 - S0);
      const v = span01(g, 0.8, 1);
      const shock = v > 0 ? Math.exp(-5 * v) * Math.sin(Math.PI * 3 * v) : 0;
      return {
        x: lerp(hand[0], cx, w) - Math.sin(Math.PI * w) * 0.05 * vw,
        y: lerp(hand[1], cy, w),
        s: s * (1 + 0.08 * shock),
        rot: -40 + u * 900 + v * 40,
      };
    };
  },
};

// ---------- Scènes : layout() à chaque recalcul, paint(q, p) à chaque image ----------
// q : avancement du prélude (0 à 1), p : ouverture de la fenêtre jusqu'au plein écran (0 à 1).

// Dimensions de l'écran tenu et zone libre au-dessus du titre (deux lignes pour « Football américain »)
function screen(stage) {
  const vw = stage.clientWidth;
  const vh = stage.clientHeight;
  const portrait = vw < vh;
  const text = stage.querySelector(".ch-text");
  const top = 0.12 * vh;
  const bottom = Math.min((portrait ? 0.62 : 0.68) * vh, (text ? text.offsetTop : vh) - 0.03 * vh);
  return { vw, vh, portrait, top, bottom, margin: Math.min(32, Math.max(16, vw * 0.022)) };
}

const inset = (r, vw, vh) => [(100 * r.y) / vh, (100 * (vw - r.x - r.w)) / vw, (100 * (vh - r.y - r.h)) / vh, (100 * r.x) / vw];
const insetAt = (s, p) => `inset(${s.map((v) => `${(v * (1 - p)).toFixed(3)}%`).join(" ")})`;

const SCENES = {
  ballon({ stage, win, open, sport }) {
    const el = stage.querySelector(".ch-ball");
    const body = el.querySelector(".pb-body");
    const ghost = el.querySelector(".pb-ghost");
    const laces = el.querySelector(".pb-laces");
    const lens = !!BALLS[sport].lens;
    const fx = Number(open.dataset.fx);
    const fy = Number(open.dataset.fy);
    let g;
    return {
      zoom: true,
      pre: { basket: 1.9, "football-americain": 1.7, handball: 1.5 }[sport],
      layout() {
        const { vw, vh, top, bottom, margin } = screen(stage);
        const R = Math.min(0.13 * Math.max(vw, vh), 0.21 * Math.min(vw, vh), (bottom - top) / (lens ? 2 * 1.35 * 0.57 : 2));
        const rx = lens ? R * 1.35 : R;
        const ry = lens ? rx * 0.57 : R;
        // Le ballon se pose sur le point d'action de la photo, sans toucher la zone du titre
        const cx = Math.min(Math.max((fx / 100) * vw, margin + rx), vw - margin - rx);
        const cy = Math.min(Math.max((fy / 100) * vh, top + ry), bottom - ry);
        const kmax = Math.max(...[[0, 0], [vw, 0], [0, vh], [vw, vh]].map(([x, y]) => Math.hypot((x - cx) / rx, (y - cy) / ry)));
        g = { R, rx, ry, cx, cy, kmax, unit: lens ? rx / 200 : R / 192, path: GESTURES[sport]({ vw, vh, R, rx, ry, cx, cy, top, bottom }) };
      },
      paint(q, p) {
        const b = g.path(span01(q, 0, 0.72));
        const r = smooth(q, 0.72, 0.95); // la photo prend la place du cuir
        const k = 1 + (g.kmax - 1) * p;
        const s = g.unit * b.s * k;
        el.style.opacity = q > 0 ? "1" : "0";
        el.style.transform = `translate3d(${(b.x - 200).toFixed(1)}px, ${(b.y - 200).toFixed(1)}px, 0) scale(${(s * (b.sx ?? 1)).toFixed(4)}, ${(s * (b.sy ?? 1)).toFixed(4)}) rotate(${(b.rot ?? 0).toFixed(1)}deg)`;
        body.style.opacity = (1 - r).toFixed(3);
        ghost.style.opacity = (r * (1 - span01(p, 0, 0.35))).toFixed(3);
        if (laces && b.phi != null) {
          const c = Math.cos(b.phi);
          laces.setAttribute("transform", `translate(0 ${(Math.sin(b.phi) * 15).toFixed(2)}) scale(1 ${Math.max(0.15, Math.abs(c)).toFixed(3)})`);
          laces.style.opacity = clamp01(c * 3).toFixed(3);
        }
        win.style.opacity = r.toFixed(3);
        const at = `at ${g.cx.toFixed(1)}px ${g.cy.toFixed(1)}px`;
        win.style.clipPath = p >= 1 ? "none" : lens
          ? `ellipse(${(g.rx * k).toFixed(1)}px ${(g.ry * k).toFixed(1)}px ${at})`
          : `circle(${(g.R * k).toFixed(1)}px ${at})`;
      },
    };
  },

  terrain({ stage, win, sport }) {
    const el = stage.querySelector(".ch-field");
    const f = FIELDS[sport];
    const draws = [...el.querySelectorAll("[data-draw]")].map((n) => [n, ...n.dataset.draw.split(" ").map(Number)]);
    const fades = [...el.querySelectorAll("[data-fade]")].map((n) => [n, ...n.dataset.fade.split(" ").map(Number)]);
    const A = f.w / f.h;
    let g;
    return {
      zoom: true,
      pre: 2,
      layout() {
        const { vw, vh, portrait, top, bottom } = screen(stage);
        // Paysage : le terrain à plat ; portrait (téléphone) : le terrain debout, tourné d'un quart de tour
        const room = 0.94 * (bottom - top);
        const W = portrait ? Math.min(room, 0.84 * vw * A) : Math.min(0.82 * vw, room * A);
        const H = W / A;
        const cy = (top + bottom) / 2;
        el.style.width = `${W}px`;
        el.style.height = `${H}px`;
        el.style.left = `${vw / 2 - W / 2}px`;
        el.style.top = `${cy - H / 2}px`;
        el.style.setProperty("--sw", ((Math.max(2, vw * 0.0018) * f.w) / W).toFixed(4)); // trait de 2 px au moins
        const sw = portrait ? H : W;
        const sh = portrait ? W : H;
        const rect = { x: vw / 2 - sw / 2, y: cy - sh / 2, w: sw, h: sh };
        g = { portrait, rect, ins: inset(rect, vw, vh), kmax: vw / sw, dy: vh / 2 - cy };
      },
      paint(q, p) {
        const d = span01(q, 0, 0.62);
        const r = smooth(q, 0.55, 0.85);
        draws.forEach(([n, a, b]) => { n.style.strokeDashoffset = (1 - span01(d, a, b)).toFixed(4); });
        // Marques en série et pointillés : serrées, elles brouilleraient la photo ; elles s'effacent quand elle arrive
        fades.forEach(([n, a, b]) => { n.style.opacity = (span01(d, a, b) * (1 - r)).toFixed(3); });
        // Vu des tribunes, le terrain se couche à plat en se dessinant
        const flat = 1 - Math.pow(1 - d, 3);
        const k = 1 + (g.kmax - 1) * p;
        el.style.transform = `translate3d(0, ${(g.dy * p).toFixed(1)}px, 0) perspective(1400px) rotateX(${(55 * (1 - flat)).toFixed(2)}deg) scale(${((0.88 + 0.12 * flat) * k).toFixed(4)})${g.portrait ? " rotate(90deg)" : ""}`;
        el.style.opacity = q > 0 ? ((1 - 0.35 * r) * (1 - span01(p, 0, 0.45))).toFixed(3) : "0";
        win.style.opacity = r.toFixed(3);
        win.style.clipPath = insetAt(g.ins, p);
      },
    };
  },

  travelling({ stage, win }) {
    const el = stage.querySelector(".ch-strip");
    const track = el.querySelector(".ch-strip__track");
    const target = track.querySelector(".is-target");
    let g;
    return {
      zoom: false, // la photo du centre doit rester identique à sa vignette : pas de recul
      pre: 1.5,
      layout() {
        const { vw, vh, portrait, top, bottom } = screen(stage);
        const H = Math.min((portrait ? 0.46 : 0.5) * vh, 0.94 * (bottom - top));
        const tW = (H * vw) / vh; // la photo du centre a le format de l'écran : elle grandit sans changer de cadrage
        const T0 = (top + bottom) / 2 - H / 2;
        el.style.setProperty("--h", `${H}px`);
        target.style.width = `${tW}px`;
        track.style.top = `${T0}px`;
        const oT = target.offsetLeft;
        const xEnd = vw / 2 - tW / 2 - oT;
        g = { vw, tW, T0, oT, xStart: vw * 1.02, xEnd, L0: xEnd + oT };
      },
      paint(q, p) {
        // La bande entre par la droite, vite, et ralentit jusqu'à poser sa photo au centre
        const x = lerp(g.xStart, g.xEnd, 1 - Math.pow(1 - span01(q, 0, 0.92), 2.6));
        track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
        // Puis la photo grandit jusqu'au plein écran ; la bande grandit avec elle et sort par les bords
        const W = g.tW + (g.vw - g.tW) * p;
        const k = W / g.tW;
        const L = g.L0 * (1 - p);
        const T = g.T0 * (1 - p);
        el.style.transform = p > 0 ? `translate3d(${(L - k * g.L0).toFixed(1)}px, ${(T - k * g.T0).toFixed(1)}px, 0) scale(${k.toFixed(4)})` : "none";
        el.style.opacity = q > 0 && p < 1 ? "1" : "0";
        win.style.transformOrigin = "0 0";
        win.style.transform = p >= 1 ? "none" : `translate3d(${(p > 0 ? L : x + g.oT).toFixed(1)}px, ${T.toFixed(1)}px, 0) scale(${(W / g.vw).toFixed(4)})`;
        win.style.clipPath = "none";
        win.style.opacity = q > 0 ? "1" : "0";
      },
    };
  },
};

// Joue un passage sur l'ouverture `open`. À appeler dans le gsap.context de la page, dans l'ordre des chapitres.
export function passage(kind, { open, sport, wide, slides }) {
  const stage = open.querySelector(".ch-stage");
  const win = open.querySelector(".ch-win");
  const fill = open.querySelector(".ch-win .pf-fill");
  const scrim = open.querySelector(".ch-scrim");
  const scene = SCENES[kind]({ stage, win, open, sport });
  const st = { q: 0, p: 0 };
  const paint = () => scene.paint(st.q, st.p);
  const refresh = () => { scene.layout(); paint(); };
  refresh();

  if (wide) {
    // Grand écran : prélude puis ouverture suivent le défilement ; grande ouverte, les photos se succèdent
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: open, start: "top top", end: "bottom bottom", scrub: true,
        onUpdate: (self) => slides.open(self.progress > 0.82),
        onRefresh: (self) => { refresh(); slides.open(self.progress > 0.82); },
      },
      defaults: { ease: "none" },
    });
    tl.to(st, { q: 1, duration: 1, onUpdate: paint }, 0)
      .to(st, { p: 1, duration: 1, onUpdate: paint }, 1);
    if (scene.zoom) tl.fromTo(fill, { scale: 1.25 }, { scale: 1, duration: 1, immediateRender: true }, 1);
    tl.to(scrim, { opacity: 1, duration: 0.4 }, 1.6).to({}, { duration: 0.2 });
    return;
  }

  // Au doigt : le prélude en temps réel (les gestes gardent leur vitesse), puis l'ouverture en 1,3 s.
  // Se joue dès que l'écran est presque entier, se rembobine deux fois plus vite si l'on remonte.
  const inner = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  inner.to(st, { q: 1, duration: 1, onUpdate: paint }, 0)
    .to(st, { p: 1, duration: 1, onUpdate: paint }, 1)
    .to(scrim, { opacity: 1, duration: 0.5 }, 1.5);
  if (scene.zoom) inner.fromTo(fill, { scale: 1.25 }, { scale: 1, duration: 1, immediateRender: true }, 1);
  const play = gsap.timeline({ paused: true, onComplete: () => slides.open(true) })
    .add(inner.tweenFromTo(0, 1, { duration: scene.pre, ease: "none" }))
    .add(inner.tweenFromTo(1, 2, { duration: 1.3, ease: "power3.inOut" }));
  ScrollTrigger.create({
    trigger: open, start: "top 20%",
    onEnter: () => play.timeScale(1).play(),
    onLeaveBack: () => { slides.open(false); play.timeScale(2).reverse(); },
    onRefresh: refresh,
  });
}
