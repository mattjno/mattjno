// Côté serveur : lit les photos du site dans R2. Un dossier par rubrique : hero/, football/, handball/,
// basketball/, football-americain/. Matthieu dépose ses exports sans les renommer ; le site lit lui-même leurs
// dimensions. Dans un dossier sport : les 4 paysages les plus récents (hors panoramiques) ouvrent le chapitre en
// fondu ; tout le reste (portraits, autres paysages, panoramiques) forme la galerie, du plus récent au plus ancien.
// Un dossier vide ou incomplet garde la sélection d'origine (photos.js). Dossier hero/ vide : l'accueil tire au
// hasard des paysages des dossiers sport.
// Point d'action facultatif dans le nom du fichier : « ...@60-40.jpg » (60 % depuis la gauche, 40 % depuis le haut).

import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { imageSize } from "image-size";
import { HERO, FOOT, HAND, BASKET, US, EXTRA } from "./photos";
import { span } from "./pack";

const BASE = (process.env.NEXT_PUBLIC_PHOTO_BASE || "https://pub-9350dce8a12e41c091a228ca7b1d7d48.r2.dev/").replace(/\/?$/, "/");
const IMG = /\.(jpe?g|png|webp)$/i;
const FOCAL = /@(\d{1,3})-(\d{1,3})(?=\.[a-z0-9]+$)/i;

// Paysages en ouverture de chapitre
const SLIDES = 4;

// cells : cases de galerie au plus (la mise en page coupe ensuite à des rangées complètes selon l'écran) ;
// min : cases nécessaires pour quitter la sélection d'origine
const SPORTS = [
  { id: "football", name: "Football", kind: "grid", hold: 0.9, fallback: FOOT, cells: 24, min: 4 },
  { id: "basket", folders: ["basketball", "basket"], name: "Basket", kind: "rows", hold: 0.6, fallback: BASKET, cells: 16, min: 4 },
  { id: "football-americain", name: "Football US", full: "Football américain", kind: "mosaic", hold: 0.6, fallback: US, cells: 16, min: 5 },
  { id: "handball", name: "Handball", kind: "side", hold: 0.6, fallback: HAND, cells: 12, min: 3 },
];

const strip = ({ src, w, h, i, fx, fy }) => ({ src, w, h, ...(i != null ? { i } : {}), ...(fx != null ? { fx, fy } : {}) });

// Sélection d'origine : ouverture + paysages d'appoint, galerie + paysages insérés à leur place
function fallbackChapter({ fallback, min, folders, ...s }) {
  const extra = EXTRA[s.id] || {};
  const series = fallback.slice(1);
  (extra.series || []).forEach(([k, p]) => series.splice(k, 0, p));
  return { ...s, slides: [fallback[0], ...(extra.slides || [])].map(strip), series: series.map(strip) };
}

function fallbackSite() {
  return { hero: HERO.map(strip), chapters: SPORTS.map(fallbackChapter), source: "selection" };
}

function client() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  return {
    bucket: R2_BUCKET,
    s3: new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    }),
  };
}

// Dimensions déjà lues, gardées tant que le serveur reste chaud (clé + ETag : un fichier remplacé est relu)
const sizes = new Map();

async function readSize({ s3, bucket }, o) {
  const id = `${o.Key}|${o.ETag}`;
  if (sizes.has(id)) return sizes.get(id);
  for (const bytes of [131072, 1048576, 8388608]) {
    try {
      const r = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: o.Key, Range: `bytes=0-${bytes - 1}` }));
      const d = imageSize(Buffer.from(await r.Body.transformToByteArray()));
      const turned = d.orientation >= 5 && d.orientation <= 8;
      const out = { w: turned ? d.height : d.width, h: turned ? d.width : d.height };
      sizes.set(id, out);
      return out;
    } catch (e) {
      if (o.Size && bytes >= o.Size) break;
    }
  }
  return null;
}

async function mapLimit(list, limit, fn) {
  const out = new Array(list.length);
  let next = 0;
  const worker = async () => { while (next < list.length) { const k = next++; out[k] = await fn(list[k]); } };
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
  return out;
}

async function folder(c, prefix) {
  const objects = [];
  let token;
  do {
    const r = await c.s3.send(new ListObjectsV2Command({ Bucket: c.bucket, Prefix: `${prefix}/`, ContinuationToken: token }));
    (r.Contents || []).forEach((o) => { if (IMG.test(o.Key) && o.Size > 0) objects.push(o); });
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  objects.sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified));
  const photos = await mapLimit(objects, 8, async (o) => {
    const d = await readSize(c, o);
    if (!d) return null;
    const m = o.Key.match(FOCAL);
    return {
      src: BASE + o.Key.split("/").map(encodeURIComponent).join("/"),
      w: d.w,
      h: d.h,
      t: new Date(o.LastModified).getTime(),
      ...(m ? { fx: Math.min(100, +m[1]), fy: Math.min(100, +m[2]) } : {}),
    };
  });
  return photos.filter(Boolean);
}

const landscape = (p) => p.w > p.h * 1.1;

// Hero de l'accueil quand le dossier hero/ est vide : des paysages des sports tirés au hasard
const HERO_COUNT = 6;
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Un paysage plein écran : pas de panoramique (trop rogné), au moins 3 000 px de large s'il y en a assez.
// La photo qui ouvre chaque chapitre est écartée, pour ne pas la voir deux fois en haut de page.
// Les sports alternent, dans un ordre tiré au hasard : l'accueil montre plusieurs sports.
function randomHero(sports, chapters) {
  const openers = new Set(chapters.map((ch) => ch.slides[0]?.src));
  const fit = (min) => sports.map((photos) => photos.filter((p) => landscape(p) && p.w / p.h < 2 && p.w >= min && !openers.has(p.src)));
  const sharp = fit(3000);
  const pools = shuffle((sharp.flat().length >= 3 ? sharp : fit(0)).map((p) => shuffle([...p]))).filter((p) => p.length);
  const pick = [];
  while (pick.length < HERO_COUNT && pools.some((p) => p.length)) {
    for (const p of pools) if (p.length && pick.length < HERO_COUNT) pick.push(p.shift());
  }
  return pick;
}

export async function getSite() {
  const site = fallbackSite();
  const c = client();
  if (!c) return site;
  try {
    // Dossier R2 de chaque sport : son id, sauf mention contraire (le basket est rangé dans basketball/)
    const read = async (names) => (await Promise.all(names.map((n) => folder(c, n)))).flat().sort((a, b) => b.t - a.t);
    const [hero, ...sports] = await Promise.all([["hero"], ...SPORTS.map((s) => s.folders || [s.id])].map(read));
    const used = [];
    const heroL = hero.filter(landscape);
    if (heroL.length) { site.hero = heroL.map(strip); used.push(`hero ${heroL.length}`); }
    site.chapters = SPORTS.map(({ fallback, min, folders, ...s }, k) => {
      const photos = sports[k];
      const wide = photos.filter(landscape);
      const standard = wide.filter((p) => p.w / p.h < 2);
      const slides = (standard.length ? standard : wide).slice(0, SLIDES);
      const series = photos.filter((p) => !slides.includes(p) && span(p) > 0);
      const cells = series.reduce((n, p) => n + span(p), 0);
      if (slides.length && cells >= min) {
        used.push(`${s.id} ${slides.length} + ${series.length}`);
        return { ...s, slides: slides.map(strip), series: series.slice(0, s.cells + 8).map(strip) };
      }
      return site.chapters[k];
    });
    // hero/ vide : paysages des sports au hasard, nouveau tirage à chaque régénération de la page (5 min au plus)
    if (!heroL.length) {
      const pick = randomHero(sports, site.chapters);
      if (pick.length) { site.hero = pick.map(strip); used.push(`hero au hasard ${pick.length}`); }
    }
    site.source = used.length ? `r2 (${used.join(", ")})` : "selection";
  } catch (e) {
    console.error("R2 : lecture impossible, sélection d'origine affichée.", e?.name, e?.message);
  }
  console.log(`Photos du site : ${site.source}`);
  return site;
}
