"""Vignettes 1200 px des photos listées dans tools/vignettes.json, pour les contrôles visuels locaux."""
import io, json, os, urllib.parse, urllib.request
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ix = json.load(open(os.path.join(ROOT, "tools/out/index.json")))
out = os.path.join(ROOT, "tools/out/vignettes"); os.makedirs(out, exist_ok=True)
for i in json.load(open(os.path.join(ROOT, "tools/vignettes.json"))):
    url = urllib.parse.quote(ix[i]["src"], safe=":/")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 Chrome/124 Safari/537.36"})
    im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=120).read())).convert("RGB")
    im.thumbnail((1200, 1200), Image.LANCZOS)
    im.save(os.path.join(out, f"{i}.jpg"), quality=74, optimize=True, progressive=True)
