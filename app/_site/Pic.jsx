// Photo du site : next/image en plein cadre. En local (NEXT_PUBLIC_LOCAL_IMG=1), les copies de contrôle de public/_local/v.

import Image from "next/image";

export const LOCAL = process.env.NEXT_PUBLIC_LOCAL_IMG === "1";

export default function Pic({ p, sizes, priority = false, quality = 80, alt = "", focal = false, loading }) {
  const src = LOCAL && p.i != null ? `/_local/v/${p.i}.jpg` : p.src;
  const style = focal && p.fx != null ? { objectPosition: `${p.fx}% ${p.fy}%` } : undefined;
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} loading={loading} quality={quality} unoptimized={LOCAL} style={style} draggable={false} />;
}
