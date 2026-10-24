// Côté serveur : lit les photos du site dans R2. Un dossier par rubrique : hero/, football/, handball/,
// basket/, football-americain/. Matthieu dépose ses exports sans les renommer ; le site lit lui-même leurs
// dimensions. Paysage le plus récent d'un sport : ouverture du chapitre. Portraits : la grille, du plus récent
// au plus ancien. Un dossier vide ou incomplet garde la sélection d'origine (photos.js).
// Point d'action facultatif dans le nom du fichier : « ...@60-40.jpg » (60 % depuis la gauche, 40 % depuis le haut).

import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { imageSize } from "image-size";
import { HERO, FOOT, HAND, BASKET, US } from "./photos";

const BASE = (process.env.NEXT_PUBLIC_PHOTO_BASE || "https://pub-9350dce8a12e41c091a228ca7b1d7d48.r2.dev/").replace(/\/?$/, "/");
const IMG = /\.(jpe?g|png|webp)$/i;
const FOCAL = /@(\d{1,3})-(\d{1,3})(?=\.[a-z0-9]+$)/i;

// fit(n) : nombre de photos retenues pour remplir des rangées complètes ; min : seuil pour quitter la sélection d'origine
const SPORTS = [
  { id: "football", name: "Football", kind: "grid", hold: 0.9, fallback: FOOT, min: 4, fit: (n) => Math.min(24, Math.floor(n / 4) * 4) },
  { id: "handball", name: "Handball", kind: "side", hold: 0.6, fallback: HAND, min: 3, fit: (n) => Math.min(12, n) },
  { id: "basket", name: "Basket", kind: "rows", hold: 0.6, fallback: BASKET, min: 4, fit: (n) => Math.min(16, Math.floor(n / 4) * 4) },
  { id: "football-americain", name: "Football US", full: "Football américain", kind: "mosaic", hold: 0.6, fallback: US, min: 5, fit: (n) => Math.min(13, 1 + Math.floor((n - 1) / 4) * 4) },
];

const strip = ({ src, w, h, i, fx, fy }) => ({ src, w, h, ...(i != null ? { i } : {}), ...(fx != null ? { fx, fy } : {}) });

function fallbackSite() {
  return {
    hero: HERO.map(strip),
    chapters: SPORTS.map(({ fallback, min, fit, ...s }) => ({ ...s, open: strip(fallback[0]), series: fallback.slice(1).map(strip) })),
    source: "selection",
  };
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
      ...(m ? { fx: Math.min(100, +m[1]), fy: Math.min(100, +m[2]) } : {}),
    };
  });
  return photos.filter(Boolean);
}

const landscape = (p) => p.w > p.h * 1.1;
const portrait = (p) => p.h > p.w * 1.1;

export async function getSite() {
  const site = fallbackSite();
  const c = client();
  if (!c) return site;
  try {
    const [hero, ...sports] = await Promise.all(["hero", ...SPORTS.map((s) => s.id)].map((p) => folder(c, p)));
    const used = [];
    const heroL = hero.filter(landscape);
    if (heroL.length) { site.hero = heroL; used.push(`hero ${heroL.length}`); }
    site.chapters = SPORTS.map(({ fallback, min, fit, ...s }, k) => {
      const photos = sports[k];
      const open = photos.find(landscape);
      const portraits = photos.filter(portrait);
      if (open && portraits.length >= min) {
        used.push(`${s.id} ${1 + fit(portraits.length)}`);
        return { ...s, open, series: portraits.slice(0, fit(portraits.length)) };
      }
      return site.chapters[k];
    });
    site.source = used.length ? `r2 (${used.join(", ")})` : "selection";
  } catch (e) {
    console.error("R2 : lecture impossible, sélection d'origine affichée.", e?.name, e?.message);
  }
  console.log(`Photos du site : ${site.source}`);
  return site;
}
