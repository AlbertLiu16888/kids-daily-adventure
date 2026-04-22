#!/usr/bin/env python3
"""Generate all game images via Grok Imagine API."""
import os
import sys
import json
import base64
import time
import urllib.request
import urllib.error

API_KEY = os.environ.get("XAI_API_KEY")
if not API_KEY:
    sys.stderr.write("XAI_API_KEY env var required\n")
    sys.exit(2)
ENDPOINT = "https://api.x.ai/v1/images/generations"
MODEL = os.environ.get("XAI_IMAGE_MODEL") or "grok-imagine-image"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_ROOT = os.path.join(ROOT, "assets", "images")

STYLE = (
    "cute flat cartoon illustration, thick clean outlines, pastel color palette, "
    "soft pink and sky blue tones, kawaii style for toddlers age 2 to 4, rounded shapes, "
    "no scary elements, warm friendly atmosphere, simple readable shapes, high contrast"
)
NEG = "no text, no words, no letters, no scary faces, no realistic proportions"

def P(core, bg="plain white background", aspect="1:1"):
    return f"{core}. {STYLE}. Composition: {aspect}, {bg}. {NEG}."

SCENE_BG = "simple pastel gradient background, spacious composition, 16:9 wide"

IMAGES = [
    # Map
    ("map/map_main.png", P(
        "Top-down whimsical adventure map for toddlers showing six distinct location landmarks connected by a winding pastel path: "
        "a green pond park with ducks in top-left, a yellow kindergarten building in top-center, "
        "an orange nursery with playground in top-right, a blue sandy beach in bottom-left, "
        "a red-brown dinosaur mountain with a friendly cartoon T-rex in bottom-center, "
        "a purple office building in bottom-right. Sunny sky, fluffy clouds, rainbow arc across top",
        SCENE_BG, "16:9"
    )),
    # Location backgrounds
    ("locations/bg_qingtang.png", P(
        "A peaceful park lake scene, calm green water with lily pads, two friendly cartoon ducks and one white goose near the shore, "
        "orange koi fish swimming, a happy brown dog with floppy ears sitting on grass, willow tree on left, wooden bench, sunny sky",
        SCENE_BG, "16:9"
    )),
    ("locations/bg_kindergarten.png", P(
        "Interior of a sunny kindergarten classroom for toddlers, small wooden table with a bowl and spoon, a sink with mirror and toothbrush cup, "
        "a small pink bicycle with training wheels, colorful rug, big window with flower pot, pastel yellow walls",
        SCENE_BG, "16:9"
    )),
    ("locations/bg_nursery.png", P(
        "Interior of a toddler nursery room, small low table with baby bottle, a small sink with soap dispenser at toddler height, "
        "an open toy box with teddy bear and blocks nearby, soft pastel orange walls, round rug, plush animals on shelf",
        SCENE_BG, "16:9"
    )),
    ("locations/bg_beach.png", P(
        "Seaside scene, golden sandy beach in foreground, gentle turquoise sea waves in middle, clear blue sky, "
        "a small colorful sandcastle starter pile, a few seashells, a tiny red cartoon crab peeking from sand, palm tree on the right",
        SCENE_BG, "16:9"
    )),
    ("locations/bg_dinomountain.png", P(
        "A friendly green mountain with a winding stairs path to the top, a big smiling cartoon triceratops at the base, "
        "two small baby dinosaurs wandering on the slopes, a wooden cage, fluffy clouds around the peak, not scary",
        SCENE_BG, "16:9"
    )),
    ("locations/bg_office.png", P(
        "Interior of a cozy home office, a wooden desk with a laptop computer and keyboard, a large cuckoo clock on the wall, "
        "a cute yellow cartoon duck standing on the floor with a tiny leash, bookshelf, warm lamp light, pastel purple walls",
        SCENE_BG, "16:9"
    )),
    # Props
    ("props/item_bread.png",       P("A single loaf of brown bread with a small bite taken out, optional tiny smiling face")),
    ("props/item_fishfood.png",    P("A small orange fish food container with floating pellets around it")),
    ("props/item_frisbee.png",     P("A red frisbee disc viewed from three quarter angle with motion spin lines")),
    ("props/item_spoon_bowl.png",  P("A small pink bowl of white rice with a spoon inside, steam rising")),
    ("props/item_toothbrush.png",  P("A blue toothbrush next to a tube of toothpaste with a dollop of white paste")),
    ("props/item_helmet.png",      P("A pink bicycle safety helmet with a yellow star decoration")),
    ("props/item_bottle.png",      P("A baby bottle filled with white milk, blue cap and measurement marks")),
    ("props/item_soap.png",        P("A bar of green soap with white foam bubbles around it")),
    ("props/item_toy_block.png",   P("Three stacked colorful baby blocks red yellow and blue")),
    ("props/item_sandbucket.png",  P("A blue sand bucket filled with sand and shells, small yellow shovel beside it")),
    ("props/item_shovel.png",      P("A single yellow plastic toy shovel")),
    ("props/item_waterbucket.png", P("A transparent light-blue water bucket with small water droplets around")),
    ("props/item_meat.png",        P("A drumstick-shaped piece of meat with a bone, steam rising, cute")),
    ("props/item_hiking_boot.png", P("A single brown hiking boot with thick laces")),
    ("props/item_cage.png",        P("A small wooden cage with bars and an open door")),
    ("props/item_keyboard.png",    P("A small computer keyboard viewed from three quarter angle, pastel gray keys")),
    ("props/item_leash.png",       P("A red dog leash coiled up with a collar clip")),
    ("props/item_cuckoo_clock.png",P("A small wooden cuckoo clock with a pendulum, a tiny bird peeking out of the door")),
    # Animals
    ("animals/animal_duck.png",       P("A yellow duck facing the camera with an orange beak, happy smile, tiny wings, chibi proportions")),
    ("animals/animal_goose.png",      P("A white goose with an orange beak, long gentle neck, happy expression, chibi")),
    ("animals/animal_fish.png",       P("A school of three orange koi fish with big friendly eyes, bubbles around them")),
    ("animals/animal_dog.png",        P("A brown dog with floppy ears, tongue out, wagging tail, happy, chibi")),
    ("animals/animal_crab.png",       P("A small red crab with big friendly eyes and cute claws, smiling, chibi")),
    ("animals/animal_dino_big.png",   P("A friendly green triceratops dinosaur with big eyes and a smile, chubby body, not scary, chibi")),
    ("animals/animal_dino_small.png", P("A tiny baby green dinosaur egg-shaped body with two small legs, big sparkling eyes, smiling, chibi")),
    ("animals/char_sanbei.png",       P("Portrait of a happy 3 year old Taiwanese girl, short black hair with a small red bow, round cheeks, big sparkling eyes, wearing a pink dress, chibi proportions", "plain pastel pink background")),
    ("animals/char_wangwang.png",     P("Portrait of a happy 2 year old Taiwanese boy, short black hair, round cheeks, big sparkling eyes, wearing yellow overalls with a tiny dinosaur print, holding a stuffed dragon, chibi proportions", "plain pastel yellow background")),
    # Candies
    ("candies/candy_green.png",  P("A round apple green hard candy with a shiny white highlight, twisted clear wrapper ends, sticker style")),
    ("candies/candy_yellow.png", P("A round lemon yellow hard candy with a shiny highlight, twisted wrapper ends, sticker style")),
    ("candies/candy_orange.png", P("A round orange hard candy with a shiny highlight, twisted wrapper ends, sticker style")),
    ("candies/candy_blue.png",   P("A round soda blue hard candy with a shiny highlight, twisted wrapper ends, sticker style")),
    ("candies/candy_red.png",    P("A round strawberry red hard candy with a shiny highlight, twisted wrapper ends, sticker style")),
    ("candies/candy_purple.png", P("A round grape purple hard candy with a shiny highlight, twisted wrapper ends, sticker style")),
    # UI
    ("ui/ui_backpack.png", P("A pink backpack with a big front pocket and a cute smiling face, two shoulder straps")),
    ("ui/ui_star.png",     P("A yellow star with a happy face and a sparkle highlight")),
    ("ui/ui_logo.png",     P("A game logo illustration: a pink paper banner with a rainbow arc above six small candies in a row, star sparkles around, children's app style")),

    # --- v2 expansion ---
    # New map with 8 landmarks
    ("map/map_main.png", P(
        "Top-down whimsical adventure map for toddlers showing eight distinct location landmarks connected by winding rainbow pastel paths, arranged as four landmarks on the top row and four on the bottom row, evenly spaced and clearly visible. "
        "Top row left-to-right: a green pond park with baby ducks on a lily pad; a bright yellow kindergarten building with a red heart above the door; an orange nursery with a rainbow slide; a hot-pink zoo entrance arch decorated with bamboo and flowers with a baby panda peeking and a giraffe head above. "
        "Bottom row left-to-right: a blue sandy beach with a sandcastle and a palm tree; a red-brown dinosaur mountain with a smiling triceratops; a mint-green open meadow farm with three fluffy white sheep and a tiny red locomotive on curved tracks; a pastel purple office building with a clock tower. "
        "Each landmark sits on its own little oval grass island, connected by pastel pink and blue winding paths. Sunny sky with fluffy clouds and a big rainbow arc across the top. Spacious, well-organized layout, not cluttered.",
        SCENE_BG, "16:9"
    )),
    # Zoo + Sheep world backgrounds
    ("locations/bg_zoo.png", P(
        "Interior of a cozy zoo scene, a round pink entrance arch in the back decorated with bamboo and flowers, a chubby smiling baby panda sitting on grass holding a bamboo stick on the left, a tall giggly long-neck giraffe with blonde mane in the center reaching up to leaves, a friendly green baby crocodile lying on the right with its mouth open showing one stained tooth, blue sunny sky, fluffy clouds, soft flower beds in foreground",
        SCENE_BG, "16:9"
    )),
    ("locations/bg_sheepworld.png", P(
        "Cheerful open meadow farm, three fluffy cloud-white baby sheep grazing on the left, a tiny colorful mini-train track curving through the scene with a cute bright red locomotive, a chubby brown capybara sitting on the right near a wooden feeding trough, wooden fence along the edge, a windmill in the distance, soft green grass, sunny sky, rainbow arc",
        SCENE_BG, "16:9"
    )),
    # New animals
    ("animals/animal_panda.png",     P("A chubby baby panda sitting upright, round body, big black eye patches, pink blush cheeks, holding a bamboo stick, smiling, chibi")),
    ("animals/animal_giraffe.png",   P("A friendly baby giraffe standing sideways, yellow body with large brown rounded spots, long soft neck, blonde mane tuft, big sparkly eyes, happy, chibi")),
    ("animals/animal_crocodile.png", P("A smiling green baby crocodile lying down with rounded snout open wide, one tooth stained dark, small white teeth, orange tongue, big friendly eyes, not scary, chibi")),
    ("animals/animal_sheep.png",     P("A fluffy cloud-white baby lamb, tiny pink ears and hooves, big round black eyes, pink blush cheeks, standing on grass, chibi")),
    ("animals/animal_capybara.png",  P("A chubby brown capybara sitting upright, squinty happy closed eyes, tiny round ears, small hands on tummy, kawaii chibi")),
    # New props
    ("props/item_bamboo.png",       P("A fresh green bamboo stalk with a few jade leaves, bright color, a dew drop highlight")),
    ("props/item_carrot.png",       P("A bright orange carrot with three small green leaves on top, cute sticker style")),
    ("props/item_pliers.png",       P("Cartoon pliers with pink handles for pulling teeth, rounded edges, metallic shiny jaws, sparkle, cute")),
    ("props/item_grass.png",        P("A small bundle of fresh green hay tied with a pink ribbon")),
    ("props/item_coin.png",         P("A shiny golden star-shaped coin with a tiny smiling face and sparkles")),
    ("props/item_animal_feed.png",  P("A small paper bag with a rolled top, brown feed pellets spilling out, a paw print label on the bag")),
    # Eggs
    ("pets/egg_duck.png",  P("A glossy pastel yellow egg with tiny white duckling wings peeking from a small crack on top, shiny highlight, sticker style, plain white background")),
    ("pets/egg_dino.png",  P("A pastel green egg with darker green rounded spots and a small crack on top hinting at dino scales, glossy, sticker style, plain white background")),
    ("pets/egg_panda.png", P("A pure white egg with two round black patches like panda eye markings, a tiny green bamboo leaf sprouting from the top crack, glossy, sticker style, plain white background")),
    ("pets/egg_sheep.png", P("A pale pink egg wrapped in a fluffy cloud-like wool tuft on top, soft pastel, glossy, sticker style, plain white background")),
    ("pets/egg_bear.png",  P("A creamy beige egg with two small round brown bear-ear shaped bumps on top, glossy, sticker style, plain white background")),
    ("pets/egg_bunny.png", P("A soft pink egg with two long upright bunny-ear shaped bumps on top, small heart on front, glossy, sticker style, plain white background")),
    ("pets/egg_crab.png",  P("A coral orange egg with two tiny red claw-shaped bumps on the sides, sparkles, glossy, sticker style, plain white background")),
    ("pets/egg_bird.png",  P("A lavender purple egg with a small music note emblem in front and a tiny yellow feather on top, glossy, sticker style, plain white background")),
    # Pets (hatched babies)
    ("pets/pet_duck.png",   P("A tiny yellow baby duckling standing facing camera, round tummy, orange beak open happily, tiny wings up, chibi, plain pastel background")),
    ("pets/pet_dino.png",   P("A tiny light-green baby dinosaur with round head, stubby legs, pink blush cheeks, smile, chibi, plain pastel background")),
    ("pets/pet_panda.png",  P("A tiny baby panda sitting, round body, big sparkling eyes, holding a mini bamboo stalk, chibi, plain pastel background")),
    ("pets/pet_sheep.png",  P("A tiny fluffy lamb, cloud-like body, tiny pink legs, smiling, chibi, plain pastel background")),
    ("pets/pet_bear.png",   P("A tiny honey-brown bear cub sitting upright, round ears, big happy eyes, paw raised, chibi, plain pastel background")),
    ("pets/pet_bunny.png",  P("A tiny pink bunny with long ears, sparkly eyes, hugging a small carrot, chibi, plain pastel background")),
    ("pets/pet_crab.png",   P("A tiny red crab, huggable round body, tiny claws raised, big friendly eyes, chibi, plain pastel background")),
    ("pets/pet_bird.png",   P("A tiny lavender cuckoo bird, perched, tiny yellow beak singing, little music notes around, chibi, plain pastel background")),
    # UI for nest
    ("ui/ui_nest.png",   P("A cute woven straw nest icon with a pastel pink egg inside and a sparkle on top, flat sticker style")),
    ("ui/icon_water.png",P("A cute water drop with a smiling face and a small blue splash at the bottom, sticker style")),
    ("ui/icon_sun.png",  P("A cheerful pastel yellow sun icon with a happy smiling face and soft rounded rays, sticker style")),
    # Candies for 2 new locations
    ("candies/candy_pink.png", P("A round bubblegum pink hard candy with a shiny white highlight, twisted clear wrapper ends, sticker style")),
    ("candies/candy_teal.png", P("A round mint teal hard candy with a shiny white highlight, twisted clear wrapper ends, sticker style")),
]


def generate_one(prompt, out_path, retries=2):
    body = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "n": 1,
        "response_format": "b64_json",
    }).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
        },
        method="POST",
    )
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = json.loads(resp.read())
            if "data" in data and len(data["data"]) > 0:
                b64 = data["data"][0].get("b64_json", "")
                if b64:
                    os.makedirs(os.path.dirname(out_path), exist_ok=True)
                    with open(out_path, "wb") as f:
                        f.write(base64.b64decode(b64))
                    return True, os.path.getsize(out_path)
                url = data["data"][0].get("url", "")
                if url:
                    with urllib.request.urlopen(url, timeout=60) as imgresp:
                        os.makedirs(os.path.dirname(out_path), exist_ok=True)
                        with open(out_path, "wb") as f:
                            f.write(imgresp.read())
                    return True, os.path.getsize(out_path)
            return False, f"no data in response: {str(data)[:200]}"
        except urllib.error.HTTPError as e:
            err = f"HTTP {e.code}: {e.read().decode('utf-8', 'ignore')[:200]}"
            if attempt < retries:
                time.sleep(2 * (attempt + 1))
                continue
            return False, err
        except Exception as e:
            if attempt < retries:
                time.sleep(2 * (attempt + 1))
                continue
            return False, str(e)


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    total = len(IMAGES)
    ok = 0
    fail = []
    log_path = os.path.join(ROOT, "generation_log.json")
    log = {"runs": []}
    if os.path.exists(log_path):
        try:
            log = json.loads(open(log_path).read())
        except Exception:
            pass

    for i, (rel, prompt) in enumerate(IMAGES, 1):
        if only and only not in rel:
            continue
        out = os.path.join(IMG_ROOT, rel)
        if os.path.exists(out) and os.path.getsize(out) > 500:
            print(f"[{i:2}/{total}] SKIP (exists) {rel}")
            ok += 1
            continue
        print(f"[{i:2}/{total}] gen {rel}...", flush=True)
        success, info = generate_one(prompt, out)
        if success:
            print(f"          OK {info} bytes")
            ok += 1
        else:
            print(f"          FAIL {info}")
            fail.append((rel, str(info)))
        time.sleep(0.8)  # rate limit

    log["runs"].append({
        "time": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "total": total,
        "ok": ok,
        "fail": fail,
    })
    with open(log_path, "w") as f:
        json.dump(log, f, ensure_ascii=False, indent=2)

    print(f"\nDone. {ok}/{total} success, {len(fail)} failed.")
    if fail:
        for f in fail:
            print("  -", f[0], "->", f[1][:120])
    return 0 if not fail else 1


if __name__ == "__main__":
    sys.exit(main())
