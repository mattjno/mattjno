// Route de test temporaire : vérifie que les clés R2 de Vercel permettent de lister le bucket.
// À supprimer une fois la lecture directe de R2 en place.
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export async function GET() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  const present = {
    R2_ACCOUNT_ID: !!R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: !!R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: !!R2_SECRET_ACCESS_KEY,
    R2_BUCKET: !!R2_BUCKET,
  };
  if (Object.values(present).some((v) => !v)) {
    return Response.json({ ok: false, step: "env", present }, { status: 500 });
  }
  try {
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });
    const r = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, MaxKeys: 1000 }));
    const keys = (r.Contents || []).map((o) => o.Key);
    const folders = [...new Set(keys.filter((k) => k.includes("/")).map((k) => k.split("/")[0]))];
    return Response.json({
      ok: true,
      bucket: R2_BUCKET,
      objectsListed: keys.length,
      truncated: !!r.IsTruncated,
      folders,
      sample: keys.slice(0, 5),
    });
  } catch (e) {
    return Response.json({ ok: false, step: "r2", error: e.name, message: e.message }, { status: 500 });
  }
}
