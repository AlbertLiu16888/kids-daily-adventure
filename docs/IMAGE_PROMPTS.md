# 圖片生成提示詞 (Grok Imagine)

## 風格總則（所有圖片共用）

**Style anchor**: `cute flat cartoon illustration, thick clean outlines, pastel color palette, soft pink and sky blue tones, kawaii style for toddlers age 2 to 4, rounded shapes, no scary elements, warm friendly atmosphere, simple readable shapes, high contrast, plain solid background or simple gradient`

**Negative guidance**（在主提示後加）: `no text, no words, no letters, no scary faces, no realistic proportions`

**Aspect ratio**:
- 主地圖 / 場景背景：16:9
- 道具 / 糖果 / 動物：1:1
- 角色頭像：1:1

## 一、主地圖 (1 張)

| 檔名 | 提示詞 |
|------|--------|
| `map_main.png` | `Cute flat cartoon top-down illustration of a whimsical children's adventure map for toddlers. Six distinct location landmarks connected by a winding path: a green pond park with ducks in top-left, a yellow kindergarten building in top-center, an orange nursery with playground in top-right, a blue sandy beach in bottom-left, a red-brown dinosaur mountain with a cartoon T-rex in bottom-center, a purple office building in bottom-right. Pastel palette, thick outlines, kawaii style, bright sunny sky, fluffy clouds, rainbow across top, 16:9, plain flat style, no text` |

## 二、地點背景 (6 張)

| 檔名 | 提示詞 |
|------|--------|
| `bg_qingtang.png` | `Cute flat cartoon scene of a peaceful park lake, calm green water with lily pads, two friendly cartoon ducks and one white goose near the shore, orange koi fish swimming, a happy brown dog with floppy ears sitting on grass, willow tree on left, wooden bench, sunny sky with soft clouds, pastel palette, thick outlines, kawaii style for toddlers, 16:9, no people, no text` |
| `bg_kindergarten.png` | `Cute flat cartoon interior of a sunny kindergarten classroom, small wooden table with a bowl and spoon, a sink with mirror and toothbrush cup, a small pink bicycle with training wheels, colorful rug, big window with flower pot, pastel yellow walls, warm friendly atmosphere, thick outlines, kawaii style, 16:9, no people, no text` |
| `bg_nursery.png` | `Cute flat cartoon interior of a toddler nursery room, small low table with baby bottle, a small sink with soap dispenser at toddler height, an open toy box with teddy bear and blocks nearby, soft pastel orange walls, round rug, plush animals on shelf, warm cozy atmosphere, thick outlines, kawaii style for toddlers, 16:9, no people, no text` |
| `bg_beach.png` | `Cute flat cartoon seaside scene, golden sandy beach in foreground, gentle turquoise sea waves in middle, clear blue sky, small colorful sandcastle starter pile, a few seashells, a tiny red cartoon crab peeking from sand, palm tree on the right, bright sunny day, pastel palette, thick outlines, kawaii style for toddlers, 16:9, no people, no text` |
| `bg_dinomountain.png` | `Cute flat cartoon scene of a friendly green mountain with winding stairs path to the top, a big smiling cartoon triceratops at the base, two small baby dinosaurs wandering on the slopes, a wooden cage, fluffy clouds around the peak, soft pastel colors, not scary, kawaii style for toddlers, thick outlines, 16:9, no people, no text` |
| `bg_office.png` | `Cute flat cartoon interior of a cozy home office, a wooden desk with a laptop computer and keyboard, a large cuckoo clock on the wall, a cute yellow cartoon duck standing on the floor with a tiny leash, bookshelf, warm lamp light, pastel purple walls, friendly atmosphere, thick outlines, kawaii style, 16:9, no people, no text` |

## 三、道具 (18 張，全部透明背景)

### 青塘園道具
| 檔名 | 提示詞 |
|------|--------|
| `item_bread.png` | `Cute flat cartoon icon of a single loaf of brown bread with a bite taken out, cheerful smiling face optional, thick black outline, pastel palette, centered on plain white background, kawaii style, 1:1 square, no text` |
| `item_fishfood.png` | `Cute flat cartoon icon of a small orange fish food container with floating pellets around it, thick outline, kawaii style, plain white background, 1:1, no text` |
| `item_frisbee.png` | `Cute flat cartoon icon of a red frisbee disc viewed from three quarter angle, motion lines suggesting spin, thick outline, kawaii style, plain white background, 1:1, no text` |

### 田園幼稚園道具
| 檔名 | 提示詞 |
|------|--------|
| `item_spoon_bowl.png` | `Cute flat cartoon icon of a small pink bowl of white rice with a spoon inside, steam rising from bowl, thick outline, kawaii style, plain white background, 1:1, no text` |
| `item_toothbrush.png` | `Cute flat cartoon icon of a blue toothbrush next to a tube of toothpaste with a dollop of white paste, thick outline, kawaii style, plain white background, 1:1, no text` |
| `item_helmet.png` | `Cute flat cartoon icon of a pink bicycle safety helmet with a yellow star, thick outline, kawaii style, plain white background, 1:1, no text` |

### 金培恩托兒所道具
| 檔名 | 提示詞 |
|------|--------|
| `item_bottle.png` | `Cute flat cartoon icon of a baby bottle filled with white milk, blue cap and measurement marks, thick outline, kawaii style, plain white background, 1:1, no text` |
| `item_soap.png` | `Cute flat cartoon icon of a bar of green soap with white foam bubbles around it, thick outline, kawaii style, plain white background, 1:1, no text` |
| `item_toy_block.png` | `Cute flat cartoon icon of three stacked colorful baby blocks red yellow blue, thick outline, kawaii style, plain white background, 1:1, no text` |

### 海邊道具
| 檔名 | 提示詞 |
|------|--------|
| `item_sandbucket.png` | `Cute flat cartoon icon of a blue sand bucket with yellow shovel next to it, filled with sand and shells, thick outline, kawaii style, plain white background, 1:1, no text` |
| `item_shovel.png` | `Cute flat cartoon icon of a yellow plastic toy shovel, thick outline, kawaii style, plain white background, 1:1, no text` |
| `item_waterbucket.png` | `Cute flat cartoon icon of a transparent light-blue water bucket with small water droplets, thick outline, kawaii style, plain white background, 1:1, no text` |

### 恐龍山道具
| 檔名 | 提示詞 |
|------|--------|
| `item_meat.png` | `Cute flat cartoon icon of a drumstick shaped piece of meat with a bone, steam rising, thick outline, kawaii style, plain white background, 1:1, no text` |
| `item_hiking_boot.png` | `Cute flat cartoon icon of a single brown hiking boot with thick laces, thick outline, kawaii style, plain white background, 1:1, no text` |
| `item_cage.png` | `Cute flat cartoon icon of a small wooden cage with bars and an open door, thick outline, kawaii style, plain white background, 1:1, no text` |

### 辦公室道具
| 檔名 | 提示詞 |
|------|--------|
| `item_keyboard.png` | `Cute flat cartoon icon of a small computer keyboard viewed from three quarter angle, pastel gray keys, thick outline, kawaii style, plain white background, 1:1, no text` |
| `item_leash.png` | `Cute flat cartoon icon of a red dog leash coiled up with a collar clip, thick outline, kawaii style, plain white background, 1:1, no text` |
| `item_cuckoo_clock.png` | `Cute flat cartoon icon of a small wooden cuckoo clock with a pendulum and tiny bird peeking out of door, thick outline, kawaii style, plain white background, 1:1, no text` |

## 四、動物與角色 (9 張)

| 檔名 | 提示詞 |
|------|--------|
| `animal_duck.png` | `Cute flat cartoon yellow duck facing camera with orange beak, happy smile, tiny wings, chibi proportions, thick outline, kawaii, plain white background, 1:1, no text` |
| `animal_goose.png` | `Cute flat cartoon white goose with orange beak, long gentle neck, happy expression, chibi, thick outline, kawaii, plain white background, 1:1, no text` |
| `animal_fish.png` | `Cute flat cartoon school of three orange koi fish with big friendly eyes, bubbles around them, thick outline, kawaii, plain white background, 1:1, no text` |
| `animal_dog.png` | `Cute flat cartoon brown dog with floppy ears, tongue out, wagging tail, happy, chibi, thick outline, kawaii, plain white background, 1:1, no text` |
| `animal_crab.png` | `Cute flat cartoon small red crab with big friendly eyes and cute claws, smiling, chibi, thick outline, kawaii, plain white background, 1:1, no text` |
| `animal_dino_big.png` | `Cute flat cartoon friendly green triceratops dinosaur with big eyes and smile, chubby body, not scary, chibi, thick outline, kawaii for toddlers, plain white background, 1:1, no text` |
| `animal_dino_small.png` | `Cute flat cartoon tiny baby green dinosaur egg-shaped body, two small legs, big sparkling eyes, smiling, chibi, thick outline, kawaii, plain white background, 1:1, no text` |
| `char_sanbei.png` | `Cute flat cartoon portrait of a happy 3 year old Taiwanese girl, short black hair with a small red bow, round cheeks, big sparkling eyes, wearing a pink dress, chibi proportions, thick outline, kawaii style, plain pastel background, 1:1, no text` |
| `char_wangwang.png` | `Cute flat cartoon portrait of a happy 2 year old Taiwanese boy, short black hair, round cheeks, big sparkling eyes, wearing yellow overalls with a tiny dinosaur print, holding a stuffed dragon, chibi proportions, thick outline, kawaii style, plain pastel background, 1:1, no text` |

## 五、糖果 (6 張，透明背景)

| 檔名 | 提示詞 |
|------|--------|
| `candy_green.png` | `Cute flat cartoon round apple green hard candy with a shiny white highlight, twisted clear wrapper ends, thick black outline, kawaii sticker style, plain white background, 1:1, no text` |
| `candy_yellow.png` | `Cute flat cartoon round lemon yellow hard candy with shiny highlight, twisted wrapper ends, thick outline, kawaii sticker style, plain white background, 1:1, no text` |
| `candy_orange.png` | `Cute flat cartoon round orange hard candy with shiny highlight, twisted wrapper ends, thick outline, kawaii sticker style, plain white background, 1:1, no text` |
| `candy_blue.png` | `Cute flat cartoon round soda blue hard candy with shiny highlight, twisted wrapper ends, thick outline, kawaii sticker style, plain white background, 1:1, no text` |
| `candy_red.png` | `Cute flat cartoon round strawberry red hard candy with shiny highlight, twisted wrapper ends, thick outline, kawaii sticker style, plain white background, 1:1, no text` |
| `candy_purple.png` | `Cute flat cartoon round grape purple hard candy with shiny highlight, twisted wrapper ends, thick outline, kawaii sticker style, plain white background, 1:1, no text` |

## 六、UI 元素 (3 張)

| 檔名 | 提示詞 |
|------|--------|
| `ui_backpack.png` | `Cute flat cartoon pink backpack with a big front pocket and cute face, two shoulder straps, thick outline, kawaii style, plain white background, 1:1, no text` |
| `ui_star.png` | `Cute flat cartoon yellow star with happy face and sparkle highlight, thick outline, kawaii, plain white background, 1:1, no text` |
| `ui_logo.png` | `Cute flat cartoon game logo illustration showing a pink paper banner with a rainbow arc above six small candies in a row, star sparkles around, kawaii children's app style, pastel palette, thick outlines, plain white background, 1:1, no text` |

---

## 總計
- 1 張主地圖
- 6 張地點背景
- 18 張道具
- 9 張動物/角色
- 6 張糖果
- 3 張 UI 元素

**總計 43 張圖片**

## 生成策略
1. 先生成 6 張地點背景（最重要，影響遊戲可玩性）
2. 再生成道具（18 張，拖移互動必需）
3. 再生成動物與糖果
4. 最後生成主地圖與 UI
5. 若 Grok 失敗，遊戲使用 SVG/emoji fallback（已在程式內實作）
