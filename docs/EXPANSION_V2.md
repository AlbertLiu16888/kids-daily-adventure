# v2 擴充設計

## 新增地點（共 8）

| 順序 | 地點 | 顏色/糖果 | 時段 | 3 個任務（與連續對話）|
|---|---|---|---|---|
| 7 | 動物園 | pink 桃紅 | 08:00–18:00 | 竹子餵熊貓 / 胡蘿蔔餵長頸鹿 / 拔鱷魚蛀牙 |
| 8 | 羊世界 | teal 薄荷 | 08:00–17:00 | 牧草餵小羊 / 投硬幣坐小火車 / 飼料餵水豚 |

既有 6 個（青塘園、幼稚園、托兒所、海邊、恐龍山、辦公室）保留。

## 蛋 & 寵物系統

* **獲蛋**：完成一個地點全部任務 → 必得糖果 + 40% 機率隨機獲得一顆「地點主題蛋」
  * 青塘園→小鴨蛋 / 恐龍山→恐龍蛋 / 動物園→熊貓蛋 / 羊世界→羊咩蛋 / 幼稚園→小熊蛋 / 托兒所→小兔蛋 / 海邊→小螃蟹蛋 / 辦公室→布穀鳥蛋
* **孵蛋**：每顆蛋有兩條進度條（💧 噴水 / ☀️ 光照），各需 5 次，加總 10 次即孵化；每天同種互動至多各 2 次，鼓勵持續數天陪伴
* **寵物**：孵化完成後進入「寵物」清單，每天可互動（撫摸、餵食）並累積親密度；親密度達 3 → 角色展現更多動作
* **3D 旋轉觀察**：蛋/小動物使用 CSS 3D `rotateX/rotateY`，指針拖曳旋轉；地球儀式觀察

## 連續性對話設計

每個任務包含 3–5 句有劇情連續的台詞 `dialog.start / dialog.mid[] / dialog.end`：

示例（餵熊貓）：
1. `start`：「熊貓圓圓肚子咕咕叫，牠最愛吃竹子囉～」
2. `midFirst`：「圓圓聞到竹葉了！把竹子拖給牠吧」
3. `midMore`：「牠吃得好開心，還要再一些！」
4. `end`：「圓圓揉著肚子：謝謝你，我們是好朋友了！」

寵物每日互動也有多日續劇（day1 認識 / day2 記得你 / day3 想你 / day4+ 任我玩）。

## 圖片 Grok 提示詞（新增 30 張）

統一風格：`cute flat cartoon illustration, thick clean outlines, pastel color palette, kawaii style for toddlers age 2 to 4, rounded shapes, no scary elements, warm friendly atmosphere`
負面：`no text, no words, no scary faces`

### 地點背景（16:9）
1. `locations/bg_zoo.png` — Cozy zoo scene with a large round entrance arch decorated with hanging bamboo and flowers, a smiling chubby panda cub sitting on grass holding a bamboo stick on the left, a tall giggly long-neck giraffe with blonde mane in the middle reaching for leaves, a green friendly crocodile with big round eyes lying on the right showing a tooth, blue sunny sky with fluffy clouds, small flower beds in foreground
2. `locations/bg_sheepworld.png` — Cheerful open meadow farm, three fluffy cloud-like white baby sheep grazing on the left, a tiny colorful mini-train track curving through the scene with a cute red locomotive, one chubby capybara sitting on the right near a wooden feeding trough, wooden fence, windmill in background, rainbow arc, soft green grass

### 動物（1:1 or 3:4）
3. `animals/animal_panda.png` — A chubby baby panda sitting upright, round body, big black eye patches, pink blush cheeks, holding bamboo, smiling
4. `animals/animal_giraffe.png` — A friendly baby giraffe standing sideways, yellow body with large brown rounded spots, long soft neck, blonde mane tuft, big sparkly eyes, happy
5. `animals/animal_crocodile.png` — A smiling green baby crocodile lying down, rounded snout open wide showing one cavity-stained tooth, small white teeth, orange tongue, big friendly eyes, chibi
6. `animals/animal_sheep.png` — A fluffy cloud-white baby lamb, tiny pink ears and hooves, big round black eyes, pink blush, standing on grass, chibi
7. `animals/animal_capybara.png` — A chubby brown capybara sitting upright, squinty happy eyes, tiny round ears, small hands on tummy, chibi kawaii

### 道具
8. `props/item_bamboo.png` — A fresh green bamboo stalk with a few leaves, bright jade color, dew drops
9. `props/item_carrot.png` — A bright orange carrot with three green leaves, cute sticker style
10. `props/item_pliers.png` — Cartoon pink-handle pliers for pulling teeth, cute rounded edges, sparkle
11. `props/item_grass.png` — A small bundle of fresh green hay tied with a pink ribbon
12. `props/item_coin.png` — A shiny golden star-shaped coin with a smiling face
13. `props/item_animal_feed.png` — A small paper bag of animal feed with brown pellets spilling and a paw print label

### 蛋（1:1 sticker style）
14. `pets/egg_duck.png` — A glossy pastel yellow egg with tiny white duckling wings peeking out, small highlight shine, round bottom
15. `pets/egg_dino.png` — A green egg with darker green spots, cracks on top hinting at dinosaur scales, glossy
16. `pets/egg_panda.png` — A white egg with round black patches like panda, green bamboo leaf sprouting on top, glossy
17. `pets/egg_sheep.png` — A pale pink egg with fluffy cloud-pattern texture, white wool tufts on top, glossy
18. `pets/egg_bear.png` — A creamy beige egg with brown tiny bear-ear shaped bumps on top, glossy
19. `pets/egg_bunny.png` — A soft pink egg with two long upright bunny-ear shaped bumps, glossy
20. `pets/egg_crab.png` — A coral orange egg with two tiny claw bumps on the sides, sparkling, glossy
21. `pets/egg_bird.png` — A lavender purple egg with a music note emblem, tiny yellow feather on top, glossy

### 寵物（孵化後）
22. `pets/pet_duck.png` — A tiny yellow baby duckling standing, round tummy, orange beak open, tiny wings up, chibi
23. `pets/pet_dino.png` — A tiny light-green baby dinosaur with round head, stubby legs, pink blush, chibi
24. `pets/pet_panda.png` — A tiny baby panda sitting, round body, big sparkling eyes, holding mini bamboo, chibi
25. `pets/pet_sheep.png` — A tiny fluffy lamb, cloud-like body, tiny legs, smiling, chibi
26. `pets/pet_bear.png` — A tiny honey-brown bear cub sitting, round ears, big happy eyes, chibi
27. `pets/pet_bunny.png` — A tiny pink bunny with long ears, sparkly eyes, carrot hug, chibi
28. `pets/pet_crab.png` — A tiny red crab, huggable round body, tiny claws up, chibi
29. `pets/pet_bird.png` — A tiny lavender bird cuckoo style, perched, tiny yellow beak singing, chibi

### UI 圖示
30. `ui/ui_nest.png` — A cute woven straw nest icon with a pastel egg inside and a sparkle, flat sticker
31. `ui/icon_water.png` — A cute water drop with a smiling face and a small splash
32. `ui/icon_sun.png` — A cheerful pastel yellow sun icon with a smiling face and soft rays

### 新主地圖（取代現有 map_main.png）
33. `map/map_main.png` — Top-down whimsical adventure map for toddlers, 4 landmarks across the top row and 4 across the bottom row connected by winding rainbow pastel paths. Top row left-to-right: a green pond park with baby ducks (青塘園), a yellow kindergarten building with heart (田園幼稚園), an orange nursery with slide (金培恩托兒所), a bright pink zoo arch with a baby panda and a giraffe head peeking (動物園). Bottom row left-to-right: a blue sandy beach with sandcastle (海邊), a red-brown dinosaur mountain with smiling triceratops (恐龍山), a mint-green meadow farm with fluffy white sheep and a tiny red train (羊世界), a purple office building with a clock (辦公室). Sunny sky with fluffy clouds and a rainbow arc. Each landmark is a cute sticker-style mini-scene on its own oval grass patch, spaced evenly so all 8 are clearly visible. wide 16:9 composition.
