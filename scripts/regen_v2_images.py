#!/usr/bin/env python3
"""Regenerate v2 art (new map + animals + props + eggs + pets) once the
Grok image API key is re-enabled.

Run:
    XAI_API_KEY=xai-... python3 scripts/regen_v2_images.py

Skips files that already exist so it's safe to re-run after partial success.
"""
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

API_KEY = os.environ.get("XAI_API_KEY")
if not API_KEY:
    sys.stderr.write("XAI_API_KEY env var required\n")
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets" / "images"
ENDPOINT = "https://api.x.ai/v1/images/generations"

# (relative-path, prompt) — kawaii pastel style, transparent background where it
# makes sense, square aspect for pets/eggs, wide aspect for the map.
JOBS = [
    # ---------- New 8-landmark map (replaces v1 6-landmark image) ----------
    # SQUARE aspect (1:1) so it crops nicely on both portrait phones and
    # landscape tablets when displayed full-bleed via object-fit: cover.
    # Hotspots overlay these EXACT grid positions:
    #   row1 y≈22%: 青塘園(17,22), 田園幼稚園(50,22), 托兒所(83,22)
    #   row2 y≈52%: 動物園(30,52), 羊世界(70,52)
    #   row3 y≈80%: 海邊(17,80), 恐龍山(50,80), 辦公室(83,80)
    (
        "map/map_main.png",
        "Top-down kawaii cartoon map illustration, soft pastel colors (pink, mint, sky-blue, cream), "
        "thick black outline storybook style, SQUARE 1:1 aspect ratio, suitable for toddlers. "
        "The map shows EIGHT landmarks arranged in a 3-2-3 grid (3 top, 2 middle, 3 bottom): "
        "TOP-LEFT=a turquoise pond with lily pads (青塘園); TOP-CENTER=a bright kindergarten with red roof and yellow walls (田園幼稚園); TOP-RIGHT=a small daycare building with blue roof and a heart sign (托兒所). "
        "MIDDLE-LEFT=a zoo entrance with arch and tropical trees and a panda peeking (動物園); MIDDLE-RIGHT=a green meadow with white wooden fence, fluffy sheep, and a tiny pastel toy train (羊世界). "
        "BOTTOM-LEFT=a sunny beach with umbrella and gentle sea waves (海邊); BOTTOM-CENTER=a green dinosaur mountain with a happy smiling T-Rex (恐龍山); BOTTOM-RIGHT=a tall office building with lit windows (辦公室). "
        "Each landmark sits within a soft circular clearing so a glowing hotspot ring will look natural overlaid on it. "
        "Connect landmarks with curvy pastel pathways. NO TEXT, NO LABELS, NO LETTERS anywhere (the game overlays its own labels). "
        "Bright cheerful daytime sky, soft clouds, child-friendly storybook art.",
    ),
    # ---------- New location backgrounds ----------
    (
        "locations/bg_zoo.png",
        "Cute kawaii zoo entrance background, pastel colors, big arched gateway with leaves, palm trees on the sides, soft clouds, no people, no text. Suitable as a game background scene for toddlers."
    ),
    (
        "locations/bg_sheepworld.png",
        "Cute kawaii sheep meadow scene, rolling green hills, white wooden fence, a tiny pastel toy train track in the distance, fluffy clouds, sunshine, no text. Suitable as a game background scene for toddlers."
    ),
    # ---------- New animals ----------
    ("animals/animal_panda.png",     "Adorable kawaii cartoon baby panda sitting and smiling, soft round body, big shiny eyes, pastel-friendly outline, transparent background, sticker style, suitable for toddlers."),
    ("animals/animal_giraffe.png",   "Adorable kawaii cartoon baby giraffe standing, long soft neck, pastel yellow and brown spots, big sparkly eyes, sticker style, transparent background, suitable for toddlers."),
    ("animals/animal_crocodile.png", "Cute friendly kawaii cartoon crocodile lying down with mouth open showing one cavity tooth (one tooth slightly black), big sparkly eyes, soft green pastel color, sticker style, transparent background, NOT scary, toddler-friendly."),
    ("animals/animal_sheep.png",     "Adorable kawaii cartoon baby sheep, fluffy white wool, pink cheeks, big shiny eyes, pastel pink hooves, sticker style, transparent background, suitable for toddlers."),
    ("animals/animal_capybara.png",  "Adorable kawaii cartoon baby capybara sitting, soft brown body, big sleepy smile, big shiny eyes, sticker style, transparent background, suitable for toddlers."),
    # ---------- New props ----------
    ("props/item_bamboo.png",      "Cute kawaii bamboo stick illustration, fresh green, with small leaves, sticker style, transparent background, simple shape suitable for dragging in a toddler game."),
    ("props/item_carrot.png",      "Cute kawaii orange carrot with green leafy top, glossy and friendly, sticker style, transparent background, suitable for toddlers."),
    ("props/item_pliers.png",      "Cute cartoon dental pliers, friendly toy-like appearance, pastel pink handle, silver tip, sticker style, transparent background, NOT scary, suitable for toddlers."),
    ("props/item_grass.png",       "Cute kawaii bunch of green hay/grass tied together, pastel green, sticker style, transparent background, suitable for toddlers."),
    ("props/item_coin.png",        "Cute kawaii golden coin with a smiley face, shiny pastel gold, sticker style, transparent background, suitable for toddlers."),
    ("props/item_animalfeed.png",  "Cute kawaii small bag of animal feed pellets, pastel brown bag with a heart label, some pellets visible, sticker style, transparent background, suitable for toddlers."),
    # ---------- Eggs (8 species) — speckled pastel kawaii ----------
    ("pets/egg_duck.png",  "Adorable kawaii pastel-yellow speckled egg with tiny duck-pattern markings, glossy, sitting in a soft cradle of light, sticker style, transparent background, suitable for toddlers."),
    ("pets/egg_dino.png",  "Adorable kawaii pastel-green speckled egg with tiny dinosaur-scale pattern, glossy, sitting in a soft cradle of light, sticker style, transparent background, suitable for toddlers."),
    ("pets/egg_panda.png", "Adorable kawaii white-and-black speckled egg with tiny panda spot pattern, glossy, sitting in a soft cradle of light, sticker style, transparent background, suitable for toddlers."),
    ("pets/egg_sheep.png", "Adorable kawaii fluffy-textured pastel-pink egg with cloud-pattern wool dots, glossy, sticker style, transparent background, suitable for toddlers."),
    ("pets/egg_bear.png",  "Adorable kawaii pastel-caramel speckled egg with tiny bear-paw pattern, glossy, sticker style, transparent background, suitable for toddlers."),
    ("pets/egg_bunny.png", "Adorable kawaii pastel-pink speckled egg with tiny bunny-ear pattern, glossy, sticker style, transparent background, suitable for toddlers."),
    ("pets/egg_crab.png",  "Adorable kawaii pastel-coral speckled egg with tiny crab-claw pattern, glossy, sticker style, transparent background, suitable for toddlers."),
    ("pets/egg_bird.png",  "Adorable kawaii pastel-lavender speckled egg with tiny feather pattern, glossy, sticker style, transparent background, suitable for toddlers."),
    # ---------- Hatched pets (8 species) — front-facing 3/4 angle for nice 3D rotation ----------
    ("pets/pet_duck.png",  "Adorable kawaii baby duckling, pastel yellow, tiny orange beak, big shiny eyes, slight 3/4 angle, fluffy, sticker style, transparent background, suitable for toddlers."),
    ("pets/pet_dino.png",  "Adorable kawaii baby dinosaur, pastel mint green, big sparkly eyes, tiny rounded spikes, slight 3/4 angle, sticker style, transparent background, NOT scary, toddler-friendly."),
    ("pets/pet_panda.png", "Adorable kawaii baby panda, soft white and black, big shiny eyes, pink cheeks, slight 3/4 angle, sticker style, transparent background, suitable for toddlers."),
    ("pets/pet_sheep.png", "Adorable kawaii baby sheep, fluffy white wool body, pastel pink face, big shiny eyes, slight 3/4 angle, sticker style, transparent background, suitable for toddlers."),
    ("pets/pet_bear.png",  "Adorable kawaii baby teddy bear, pastel caramel, big shiny eyes, pink cheeks, slight 3/4 angle, sticker style, transparent background, suitable for toddlers."),
    ("pets/pet_bunny.png", "Adorable kawaii baby bunny, pastel pink, long soft ears, big shiny eyes, slight 3/4 angle, sticker style, transparent background, suitable for toddlers."),
    ("pets/pet_crab.png",  "Adorable kawaii baby crab, pastel coral, friendly round body, big shiny eyes, tiny smiling claws, slight 3/4 angle, sticker style, transparent background, NOT scary."),
    ("pets/pet_bird.png",  "Adorable kawaii baby cuckoo bird, pastel lavender, fluffy plumage, big shiny eyes, slight 3/4 angle, sticker style, transparent background, suitable for toddlers."),
    # ---------- New UI icons ----------
    ("ui/ui_nest.png",   "Cute kawaii bird nest with two small pastel speckled eggs inside, soft brown twigs, sticker style, transparent background, app icon style."),
    ("ui/icon_water.png","Cute kawaii water spray bottle, pastel blue, smiling face, sticker style, transparent background, simple toddler-friendly app icon."),
    ("ui/icon_sun.png",  "Cute kawaii smiling sun, pastel yellow with rosy cheeks, soft rays, sticker style, transparent background, simple toddler-friendly app icon."),
    # ---------- New candies ----------
    ("candies/candy_pink.png", "Cute kawaii round candy pastel pink with a sparkle highlight, glossy wrapper twists on each side, sticker style, transparent background."),
    ("candies/candy_teal.png", "Cute kawaii round candy pastel teal/mint with a sparkle highlight, glossy wrapper twists on each side, sticker style, transparent background."),
]


def gen_one(rel: str, prompt: str) -> str:
    out = ASSETS / rel
    if out.exists():
        return "skip"
    out.parent.mkdir(parents=True, exist_ok=True)
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
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.loads(r.read())
    except urllib.error.HTTPError as e:
        return f"http {e.code}: {e.read()[:160].decode('utf-8','replace')}"
    except Exception as e:  # noqa: BLE001
        return f"err {e}"
    items = data.get("data") or []
    if not items or "b64_json" not in items[0]:
        return "no-data"
    out.write_bytes(base64.b64decode(items[0]["b64_json"]))
    return f"ok {out.stat().st_size}b"


def main():
    ok = skip = fail = 0
    for rel, prompt in JOBS:
        status = gen_one(rel, prompt)
        flag = "+" if status.startswith("ok") else ("=" if status == "skip" else "x")
        print(f"  {flag} {rel:38s}  {status}")
        if status.startswith("ok"):
            ok += 1
        elif status == "skip":
            skip += 1
        else:
            fail += 1
        time.sleep(1.0)  # be polite to the API
    print(f"\nDone. ok={ok}  skip={skip}  fail={fail}")


if __name__ == "__main__":
    main()
