#!/usr/bin/env python3
"""v2.4 — Generate one background (paths/sky only, no landmarks) plus 8
transparent-background landmark stickers, so the map can be rendered as
"landmark-as-element": each location is its own DOM card, click target =
the painted card itself, no fragile percentage hit-testing.

Run:
    python3 scripts/regen_v24_landmarks.py

Reads the API key from $XAI_API_KEY or ~/.secrets/xai_key. Skips files
that already exist (delete to regen). Stickers are saved as PNGs with
near-white pixels chroma-keyed to alpha=0 so they overlay cleanly.
"""
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# ---------- Setup ----------
API_KEY = os.environ.get("XAI_API_KEY")
if not API_KEY:
    keyfile = Path.home() / ".secrets" / "xai_key"
    if keyfile.is_file():
        API_KEY = keyfile.read_text().strip()
if not API_KEY:
    sys.stderr.write("XAI_API_KEY env var or ~/.secrets/xai_key required\n")
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets" / "images"
ENDPOINT = "https://api.x.ai/v1/images/generations"
LOG_FILE = ROOT / "generation_log.json"

# Common style language so landmarks share visual DNA.
STYLE = (
    "cute kawaii children's storybook illustration, thick clean black outline, "
    "soft pastel colors (pink, mint, sky-blue, cream, lavender), gentle shading, "
    "rounded chibi shapes, friendly smiling face, plain solid white background, "
    "centered single subject isolated like a die-cut sticker, no text, no border, "
    "no shadow on background, square aspect"
)

JOBS = [
    # ---------- Background: paths/sky only, NO landmarks ----------
    # Goes underneath all 8 landmark cards. We want negative space where
    # landmarks will sit, so the prompt insists on no buildings/animals.
    (
        "map/map_bg_v24.png",
        "Top-down kawaii cartoon map background, soft pastel pink-to-blue gradient sky, "
        "fluffy white clouds, a bright soft rainbow arc across the upper portion, "
        "winding colorful candy-like paths in pastel green / pink / lavender curving "
        "across a light pastel green grassy ground, a few small flowers and bushes "
        "scattered as decoration, NO buildings, NO houses, NO schools, NO animals, "
        "NO playground equipment, NO landmarks, NO labels, NO text, just empty "
        "scenic background ready for stickers to be placed on top, "
        "thick clean outlines, children's book illustration style, wide 16:9 aspect ratio",
    ),

    # ---------- 8 landmark stickers ----------
    (
        "landmarks/lm_qingtang.png",
        f"{STYLE}. Subject: a small round pond surrounded by green grass and two cute trees, "
        "three tiny yellow rubber-duck-like ducklings swimming on blue water, "
        "rainbow flower decoration on grass edge",
    ),
    (
        "landmarks/lm_kindergarten.png",
        f"{STYLE}. Subject: a cute pastel yellow cartoon school building with red sloped roof, "
        "blue front door with heart window, two big square windows showing classrooms, "
        "small bushes and a flag on the roof, friendly storybook style",
    ),
    (
        "landmarks/lm_nursery.png",
        f"{STYLE}. Subject: a cute pastel pink toddler nursery building with rounded roof, "
        "a small playground beside it featuring a tiny slide and swing set, "
        "scattered colorful star and flower decorations on the ground",
    ),
    (
        "landmarks/lm_zoo.png",
        f"{STYLE}. Subject: a cute zoo entrance gate arch with a smiling cartoon lion face above, "
        "panda and giraffe heads peeking out from behind, a small ZOO sign, "
        "balloons, friendly inviting style (the ZOO text on the sign is decorative shape only)",
    ),
    (
        "landmarks/lm_sheepworld.png",
        f"{STYLE}. Subject: two fluffy white kawaii sheep standing on a small green grassy hill, "
        "tiny wooden fence behind, one tiny pink flower, blue sky tiny cloud above the hill",
    ),
    (
        "landmarks/lm_beach.png",
        f"{STYLE}. Subject: a tiny tropical beach scene, golden sandy shore with gentle blue waves, "
        "one little sandcastle with a flag, a colorful beach ball, a smiling sun in upper corner, "
        "a single palm tree on the side",
    ),
    (
        "landmarks/lm_dinomountain.png",
        f"{STYLE}. Subject: a smiling friendly red cartoon T-Rex dinosaur sitting on top of a "
        "brown dirt mound mountain, the mound itself has a happy cartoon face with rosy cheeks, "
        "small green grass tufts on either side",
    ),
    (
        "landmarks/lm_office.png",
        f"{STYLE}. Subject: a cute pastel purple cartoon office building with multiple square "
        "windows showing tiny desks and computers, glass entrance door, a small flagpole on top, "
        "friendly storybook architectural style",
    ),
]


def post(prompt: str, max_retry: int = 3, backoff: float = 4.0) -> bytes:
    body = json.dumps({
        "model": "grok-imagine-image",
        "prompt": prompt,
        "n": 1,
        "response_format": "b64_json",
    }).encode()
    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    last_err = None
    for attempt in range(max_retry):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                payload = json.loads(resp.read())
                return base64.b64decode(payload["data"][0]["b64_json"])
        except urllib.error.HTTPError as e:
            txt = e.read().decode("utf-8", "replace")
            last_err = f"HTTP {e.code}: {txt[:200]}"
            if e.code in (429, 500, 502, 503, 504) and attempt + 1 < max_retry:
                time.sleep(backoff * (attempt + 1))
                continue
            break
        except Exception as e:  # noqa: BLE001
            last_err = repr(e)
            if attempt + 1 < max_retry:
                time.sleep(backoff)
                continue
            break
    raise RuntimeError(f"image generation failed after {max_retry} attempts: {last_err}")


def chroma_key_white(in_path: Path, out_path: Path, threshold: int = 232) -> None:
    """Make near-white pixels transparent. Tuned for sticker-on-white art:
    pixels whose min(R,G,B) >= threshold become alpha=0; pixels in a small
    fade band get partial alpha so antialiased outlines feather smoothly."""
    from PIL import Image
    im = Image.open(in_path).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            m = min(r, g, b)
            if m >= threshold:
                if m >= 250:
                    px[x, y] = (r, g, b, 0)
                else:
                    # feather band: 232..250 → alpha 0..255
                    alpha = int((250 - m) / (250 - threshold) * 255)
                    px[x, y] = (r, g, b, max(0, min(255, alpha)))
    im.save(out_path, "PNG")


def main() -> None:
    # The existing log is {"runs": [...]}; we append into a sibling "v24_runs"
    # list so we don't disturb the existing schema.
    log = {}
    if LOG_FILE.is_file():
        try:
            parsed = json.loads(LOG_FILE.read_text())
            if isinstance(parsed, dict):
                log = parsed
            elif isinstance(parsed, list):
                log = {"runs": parsed}
        except Exception:
            log = {}
    log.setdefault("v24_runs", [])

    for relpath, prompt in JOBS:
        out = ASSETS / relpath
        if out.exists():
            print(f"  skip (exists): {relpath}")
            continue
        out.parent.mkdir(parents=True, exist_ok=True)

        is_landmark = relpath.startswith("landmarks/")
        raw_bytes = post(prompt)

        if is_landmark:
            # Save as JPG temp, chroma-key, write PNG.
            tmp = out.with_suffix(".raw.png")
            tmp.write_bytes(raw_bytes)
            chroma_key_white(tmp, out)
            tmp.unlink(missing_ok=True)
        else:
            out.write_bytes(raw_bytes)

        size = out.stat().st_size
        print(f"  ok  ({size:>7} bytes): {relpath}")
        log["v24_runs"].append({
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "path": str(out.relative_to(ROOT)),
            "prompt": prompt[:140],
        })
        LOG_FILE.write_text(json.dumps(log, indent=2, ensure_ascii=False))
        time.sleep(1.5)  # be polite to the API


if __name__ == "__main__":
    main()
