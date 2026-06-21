// Génère public/site.json en listant les dossiers de matchs dans le bucket Cloudflare R2.
// Chaque dossier racine = un match. Les images du dossier sont listées directement
// (tu uploades déjà des versions web légères). Un éventuel meta.json dans le dossier
// peut préciser { "sport", "home", "away", "date" }. Sport par défaut : "Football".
//
// Variables d'environnement requises :
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//   NEXT_PUBLIC_PHOTO_BASE  (ex. https://pub-xxxx.r2.dev/  ou  https://photos.mattjno.fr/)

import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { imageSize } from "image-size";
import { writeFileSync, mkdirSync } from "fs";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET;
let PUBLIC_BASE = process.env.NEXT_PUBLIC_PHOTO_BASE || "";
if (PUBLIC_BASE && !PUBLIC_BASE.endsWith("/")) PUBLIC_BASE += "/";

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET || !BUCKET)
  throw new Error("Variables manquantes : R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET");
if (!PUBLIC_BASE) throw new Error("Variable manquante : NEXT_PUBLIC_PHOTO_BASE");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET },
});

const IMG = /\.(jpe?g|png|webp)$/i;

async function listAll() {
  const keys = [];
  let token;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token, MaxKeys: 1000 }));
    (r.Contents || []).forEach((o) => keys.push(o.Key));
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function getBuffer(key, range) {
  const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key, ...(range ? { Range: range } : {}) }));
  return Buffer.from(await r.Body.transformToByteArray());
}

async function mapLimit(arr, limit, fn) {
  const out = new Array(arr.length);
  let i = 0;
  async function worker() {
    while (i < arr.length) {
      const idx = i++;
      out[idx] = await fn(arr[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, arr.length) }, worker));
  return out;
}

function prettyTeam(s) {
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")   // CreteilIstres -> Creteil Istres
    .replace(/([A-Za-z])(\d)/g, "$1 $2")    // Paris13 -> Paris 13
    .replace(/[-_]+/g, " ")
    .trim();
}

function parseFolder(id) {
  const m = /^(\d{4}-\d{2}-\d{2})[-_ ]?(.*)$/.exec(id);
  const date = m ? m[1] : "";
  const rest = m ? m[2] : id;
  let home = "", away = "";
  const vs = rest.split(/vs/i);
  if (vs.length >= 2) {
    home = prettyTeam(vs[0]);
    away = prettyTeam(vs.slice(1).join("vs"));
  } else {
    home = prettyTeam(rest);
  }
  return { date, home, away };
}

console.log("📁 Listing du bucket R2…");
const keys = await listAll();

const folders = {};
for (const k of keys) {
  const idx = k.indexOf("/");
  if (idx < 0) continue;                 // objet à la racine, ignoré
  const folder = k.slice(0, idx);
  const name = k.slice(idx + 1);
  if (!name) continue;
  (folders[folder] ||= []).push({ key: k, name });
}

const albums = [];
let selection = [];

for (const [folder, files] of Object.entries(folders)) {
  const metaFile = files.find((f) => f.name.toLowerCase() === "meta.json");
  let meta = {};
  if (metaFile) {
    try { meta = JSON.parse((await getBuffer(metaFile.key)).toString("utf-8")); } catch (e) { console.warn(`  ⚠️ meta.json illisible (${folder})`); }
  }

  const imgs = files.filter((f) => IMG.test(f.name) && !/(^|\/)cover\./i.test(f.name));
  if (imgs.length === 0) continue;

  console.log(`📸 ${folder} — ${imgs.length} photos`);

  const photos = await mapLimit(imgs, 8, async (f) => {
    let w = 3, h = 2;
    try {
      const dim = imageSize(await getBuffer(f.key, "bytes=0-131071"));
      if (dim.width && dim.height) { w = dim.width; h = dim.height; }
    } catch (e) { /* dimensions par défaut */ }
    return { name: f.name, w, h, src: PUBLIC_BASE + f.key };
  });

  if (folder.toLowerCase() === "bestof") {
    selection = photos.map((x) => ({ src: x.src, w: x.w, h: x.h }));
    continue;
  }

  const p = parseFolder(folder);
  albums.push({
    id: folder,
    sport: meta.sport || "Football",
    home: meta.home || p.home || folder,
    away: meta.away || p.away || "",
    date: meta.date || p.date || "",
    count: photos.length,
    photos,
  });
}

// Plus récent en premier
albums.sort((a, b) => (b.date || b.id).localeCompare(a.date || a.id));

mkdirSync("public", { recursive: true });
writeFileSync("public/site.json", JSON.stringify({ updated: new Date().toISOString(), albums, selection }) + "\n");

const total = albums.reduce((n, a) => n + a.count, 0);
console.log(`\n✅ public/site.json — ${albums.length} albums, ${total} photos, sélection ${selection.length}`);
