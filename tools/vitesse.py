"""Outil de prototype « vitesse ».

Sans tools/picks.json rempli : fabrique des planches contact de toutes les photos (tools/out/).
Avec des choix : pour chaque photo, détoure le joueur et produit les calques de l'effet
(fond net, fond en flou de mouvement, joueur détouré, halo) dans public/proto/vitesse/.
"""
import io, json, os, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = json.load(open(os.path.join(ROOT, "public/site.json")))
PHOTOS = [dict(p, album=a["id"]) for a in SITE["albums"] for p in a["photos"]]
OUT = os.path.join(ROOT, "tools/out")
PUB = os.path.join(ROOT, "public/proto/vitesse")


def fetch(src):
    url = src.replace(" ", "%20")
    with urllib.request.urlopen(url, timeout=120) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGB")


def sheets():
    os.makedirs(OUT, exist_ok=True)
    th = 260
    def thumb(i):
        try:
            im = fetch(PHOTOS[i]["src"])
            im.thumbnail((th * 2, th))
            return i, im
        except Exception as e:  # noqa
            print("échec", i, e)
            return i, None
    with ThreadPoolExecutor(8) as ex:
        thumbs = dict(ex.map(thumb, range(len(PHOTOS))))
    per = 24
    font = ImageFont.load_default(size=22)
    for s in range(0, len(PHOTOS), per):
        idx = list(range(s, min(s + per, len(PHOTOS))))
        cols, cw, ch = 6, th * 0.8 + 140, th + 30
        rows = (len(idx) + cols - 1) // cols
        sheet = Image.new("RGB", (int(cols * (th * 2 * 0.62)), rows * ch), "white")
        cw = sheet.width // cols
        for k, i in enumerate(idx):
            im = thumbs.get(i)
            x, y = (k % cols) * cw, (k // cols) * ch
            if im:
                im = im.copy(); im.thumbnail((cw - 8, th))
                sheet.paste(im, (x + 4, y + 4))
            ImageDraw.Draw(sheet).text((x + 6, y + th + 4), f"#{i}", fill="black", font=font)
        sheet.save(os.path.join(OUT, f"planche-{s // per:02d}.jpg"), quality=72)
    json.dump([{"i": i, "src": p["src"], "w": p["w"], "h": p["h"], "album": p["album"]} for i, p in enumerate(PHOTOS)],
              open(os.path.join(OUT, "index.json"), "w"), ensure_ascii=False, indent=0)


def motion_blur(img, length, angle=0):
    import cv2, numpy as np
    a = np.array(img)
    k = np.zeros((length, length), np.float32)
    k[length // 2, :] = 1.0
    if angle:
        M = cv2.getRotationMatrix2D((length / 2 - 0.5, length / 2 - 0.5), angle, 1)
        k = cv2.warpAffine(k, M, (length, length))
    k /= k.sum()
    return Image.fromarray(cv2.filter2D(a, -1, k, borderType=cv2.BORDER_REFLECT))


def layers(picks):
    from rembg import new_session, remove
    session = new_session("isnet-general-use")
    os.makedirs(PUB, exist_ok=True)
    meta = []
    for n, pk in enumerate(picks):
        p = PHOTOS[pk["i"]]
        im = fetch(p["src"])
        long_side = 2000
        im.thumbnail((long_side, long_side), Image.LANCZOS)
        cut = remove(im, session=session, post_process_mask=True)  # RGBA
        alpha = cut.split()[-1]
        d = os.path.join(PUB, str(n + 1))
        os.makedirs(d, exist_ok=True)
        im.save(os.path.join(d, "fond.jpg"), quality=84, optimize=True, progressive=True)
        length = max(15, int(im.width * pk.get("force", 0.07)) | 1)
        motion_blur(im, length, pk.get("angle", 0)).save(os.path.join(d, "fond-vitesse.jpg"), quality=82, optimize=True, progressive=True)
        cut.save(os.path.join(d, "joueur.webp"), quality=88, method=6)
        glow = Image.new("RGBA", im.size, (0, 0, 0, 0))
        glow.paste(im, (0, 0), alpha)
        glow = glow.filter(ImageFilter.GaussianBlur(radius=max(6, im.width // 140)))
        glow.save(os.path.join(d, "halo.webp"), quality=80, method=6)
        alpha.save(os.path.join(OUT, f"masque-{n + 1}.png"))
        meta.append({"n": n + 1, "w": im.width, "h": im.height, "album": p["album"], "name": p["name"],
                     "coverage": round(sum(alpha.point(lambda v: 1 if v > 128 else 0).getdata()) / (im.width * im.height), 3)})
        print("ok", n + 1, meta[-1])
    json.dump(meta, open(os.path.join(PUB, "meta.json"), "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    picks = json.load(open(os.path.join(ROOT, "tools/picks.json")))
    if picks:
        os.makedirs(OUT, exist_ok=True)
        layers(picks)
    else:
        sheets()
