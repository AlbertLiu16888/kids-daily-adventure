// Scenes / locations data. Positions are in percent of .scene-bg.
// Each task:
//   id, label, emoji,
//   prompt (first voice, spoken when task starts),
//   dialog: { start, midEach, midLast, end }  // continuity thread
//   prop { type, emoji, img }
//   targets [{ id, emoji, img, x, y, accepts, label? }]
//   needs  (how many successful drops to complete)
//   educational?  'letter' | 'count'
//     - 'letter': prop.type === 'letter_tap'. Targets carry a `label` letter.
//                 Only the target whose label === prop.target counts as a hit;
//                 wrong taps gently re-prompt. needs is always 1.
//     - 'count':  voice says the next count number ("一", "二", "三"…) on each
//                 successful drop, reinforcing the idea of counting items.
//
// Each location has `eggType` that may drop on full completion.
//
// v3 expansion: each location now has 5+ tasks; a deterministic per-day RNG in
// app.js (pickDailyTasks) selects 3 of them for today, so the rotation feels
// fresh without any day-to-day server state.

export const LOCATIONS = [
  {
    id: 'qingtang',
    name: '青塘園',
    emoji: '🦆',
    color: 'green',
    candyEmoji: '🍏',
    hours: [8, 21],
    bg: 'assets/images/locations/bg_qingtang.png',
    bgFallback: 'linear-gradient(180deg, #cdeafd 0%, #a4e3b7 100%)',
    bgEmoji: '🏞',
    tasks: [
      {
        id: 'qingtang_feed_duck',
        label: '餵鴨鵝',
        emoji: '🐤',
        prompt: '把麵包給鴨鴨和鵝！',
        success: '鴨鴨好開心！',
        prop: { type:'bread', emoji:'🍞', img:'assets/images/props/item_bread.png' },
        targets: [
          { id:'duck',  emoji:'🦆', img:'assets/images/animals/animal_duck.png',  x:25, y:60, accepts:'bread' },
          { id:'goose', emoji:'🦢', img:'assets/images/animals/animal_goose.png', x:65, y:55, accepts:'bread' },
        ],
        needs: 2,
      },
      {
        id: 'qingtang_feed_fish',
        label: '餵魚',
        emoji: '🐟',
        prompt: '撒魚飼料給小魚吃！',
        success: '魚魚游過來了！',
        prop: { type:'fishfood', emoji:'🐟', img:'assets/images/props/item_fishfood.png' },
        targets: [
          { id:'fish', emoji:'🐠', img:'assets/images/animals/animal_fish.png', x:50, y:70, accepts:'fishfood' },
        ],
        needs: 3,
      },
      {
        id: 'qingtang_play_dog',
        label: '跟狗玩',
        emoji: '🐕',
        prompt: '丟飛盤給狗狗！',
        success: '狗狗叼回來了！',
        prop: { type:'frisbee', emoji:'🥏', img:'assets/images/props/item_frisbee.png' },
        targets: [
          { id:'dog', emoji:'🐕', img:'assets/images/animals/animal_dog.png', x:50, y:55, accepts:'frisbee' },
        ],
        needs: 2,
      },
      // v3: 字母小教室 — D for Duck
      {
        id: 'qingtang_letter_d',
        label: 'ABC 找鴨鴨',
        emoji: '🔤',
        prompt: '聽好喔，找出 D，D 是 Duck 鴨鴨！',
        success: '答對了！D 就是 Duck，鴨鴨！',
        prop: { type:'letter_tap', target:'D', word:'Duck', wordZh:'鴨鴨', emoji:'👆', img:null },
        targets: [
          { id:'l1', label:'A', x:25, y:50, accepts:'letter_tap' },
          { id:'l2', label:'D', x:50, y:50, accepts:'letter_tap' },
          { id:'l3', label:'F', x:75, y:50, accepts:'letter_tap' },
        ],
        needs: 1,
        educational: 'letter',
      },
      // v3: 數一數 — 餵 4 條魚
      {
        id: 'qingtang_count_fish',
        label: '數魚飼料',
        emoji: '🔢',
        prompt: '小魚有 4 條，每條都要餵到喔！',
        success: '4 條魚都吃飽飽！',
        prop: { type:'fishfood', emoji:'🐟', img:'assets/images/props/item_fishfood.png' },
        targets: [
          { id:'fish', emoji:'🐠', img:'assets/images/animals/animal_fish.png', x:50, y:65, accepts:'fishfood' },
        ],
        needs: 4,
        educational: 'count',
        countLabel: '條',
      },
    ],
  },
  {
    id: 'kindergarten',
    name: '田園幼稚園',
    emoji: '🏫',
    color: 'yellow',
    candyEmoji: '🍋',
    hours: [8, 12],
    bg: 'assets/images/locations/bg_kindergarten.png',
    bgFallback: 'linear-gradient(180deg, #fff3c4 0%, #ffe38a 100%)',
    bgEmoji: '🏫',
    tasks: [
      {
        id: 'kg_eat',
        label: '自己吃飯',
        emoji: '🍚',
        prompt: '用湯匙自己吃飯飯！',
        success: '吃光光，好棒！',
        prop: { type:'spoon', emoji:'🥄', img:'assets/images/props/item_spoon_bowl.png' },
        targets: [
          { id:'bowl', emoji:'🍚', x:50, y:55, accepts:'spoon' },
        ],
        needs: 3,
      },
      {
        id: 'kg_brush',
        label: '自己刷牙',
        emoji: '🪥',
        prompt: '刷刷刷，把牙齒刷乾淨！',
        success: '牙齒閃亮亮！',
        prop: { type:'toothbrush', emoji:'🪥', img:'assets/images/props/item_toothbrush.png' },
        targets: [
          { id:'mouth', emoji:'😁', x:50, y:55, accepts:'toothbrush' },
        ],
        needs: 3,
      },
      {
        id: 'kg_bike',
        label: '學腳踏車',
        emoji: '🚴',
        prompt: '戴上安全帽騎腳踏車！',
        success: '騎得好穩喔！',
        prop: { type:'helmet', emoji:'⛑️', img:'assets/images/props/item_helmet.png' },
        targets: [
          { id:'head', emoji:'🚴', x:50, y:55, accepts:'helmet' },
        ],
        needs: 1,
      },
      // v3: 字母 — A for Apple
      {
        id: 'kg_letter_a',
        label: 'ABC 找蘋果',
        emoji: '🍎',
        prompt: '今天教 A，A 是 Apple 蘋果！點 A 試試看～',
        success: '很棒！A 是 Apple 蘋果！',
        prop: { type:'letter_tap', target:'A', word:'Apple', wordZh:'蘋果', emoji:'👆', img:null },
        targets: [
          { id:'l1', label:'B', x:25, y:50, accepts:'letter_tap' },
          { id:'l2', label:'A', x:50, y:50, accepts:'letter_tap' },
          { id:'l3', label:'M', x:75, y:50, accepts:'letter_tap' },
        ],
        needs: 1,
        educational: 'letter',
      },
      // v3: 數一數 — 5 顆糖
      {
        id: 'kg_count_candy',
        label: '數糖果',
        emoji: '🔢',
        prompt: '小朋友想要 5 顆糖，數對才能拿到喔！',
        success: '5 顆全到位，老師很高興！',
        prop: { type:'candy_drop', emoji:'🍬', img:null },
        targets: [
          { id:'jar', emoji:'🫙', x:50, y:55, accepts:'candy_drop' },
        ],
        needs: 5,
        educational: 'count',
        countLabel: '顆',
      },
    ],
  },
  {
    id: 'nursery',
    name: '金培恩托兒所',
    emoji: '🧸',
    color: 'orange',
    candyEmoji: '🍊',
    hours: [8, 12],
    bg: 'assets/images/locations/bg_nursery.png',
    bgFallback: 'linear-gradient(180deg, #ffe0c2 0%, #ffb370 100%)',
    bgEmoji: '🧸',
    tasks: [
      {
        id: 'ny_bottle',
        label: '喝奶奶',
        emoji: '🍼',
        prompt: '把奶瓶拿給小寶寶！',
        success: '咕嚕咕嚕好飽！',
        prop: { type:'bottle', emoji:'🍼', img:'assets/images/props/item_bottle.png' },
        targets: [
          { id:'baby', emoji:'👶', x:50, y:55, accepts:'bottle' },
        ],
        needs: 2,
      },
      {
        id: 'ny_wash',
        label: '自己洗手',
        emoji: '🧼',
        prompt: '擦肥皂搓搓手！',
        success: '手手香香！',
        prop: { type:'soap', emoji:'🧼', img:'assets/images/props/item_soap.png' },
        targets: [
          { id:'hand', emoji:'🤲', x:50, y:55, accepts:'soap' },
        ],
        needs: 3,
      },
      {
        id: 'ny_toy',
        label: '收玩具',
        emoji: '🧸',
        prompt: '把玩具放進玩具箱！',
        success: '房間好乾淨！',
        prop: { type:'toy', emoji:'🧸', img:'assets/images/props/item_toy_block.png' },
        targets: [
          { id:'toybox', emoji:'📦', x:70, y:60, accepts:'toy' },
        ],
        needs: 3,
      },
      // v3: 字母 — B for Bottle
      {
        id: 'ny_letter_b',
        label: 'ABC 找奶瓶',
        emoji: '🍼',
        prompt: 'B 是 Bottle 奶瓶喔，找 B！',
        success: '答對！B 是 Bottle 奶瓶！',
        prop: { type:'letter_tap', target:'B', word:'Bottle', wordZh:'奶瓶', emoji:'👆', img:null },
        targets: [
          { id:'l1', label:'P', x:25, y:50, accepts:'letter_tap' },
          { id:'l2', label:'B', x:50, y:50, accepts:'letter_tap' },
          { id:'l3', label:'D', x:75, y:50, accepts:'letter_tap' },
        ],
        needs: 1,
        educational: 'letter',
      },
      // v3: 數一數 — 3 塊積木
      {
        id: 'ny_count_block',
        label: '數積木',
        emoji: '🔢',
        prompt: '老師說要 3 塊積木疊塔，一起數！',
        success: '3 塊積木的塔好高！',
        prop: { type:'toy', emoji:'🧱', img:'assets/images/props/item_toy_block.png' },
        targets: [
          { id:'tower', emoji:'🗼', x:50, y:60, accepts:'toy' },
        ],
        needs: 3,
        educational: 'count',
        countLabel: '塊',
      },
    ],
  },
  {
    id: 'beach',
    name: '海邊',
    emoji: '🏖',
    color: 'blue',
    candyEmoji: '🟦',
    hours: [8, 21],
    bg: 'assets/images/locations/bg_beach.png',
    bgFallback: 'linear-gradient(180deg, #9dd6ff 0%, #ffe8a9 100%)',
    bgEmoji: '🏖',
    tasks: [
      {
        id: 'beach_sand',
        label: '堆城堡',
        emoji: '🏰',
        prompt: '用沙桶堆沙堡！',
        success: '好厲害的城堡！',
        prop: { type:'sandbucket', emoji:'🪣', img:'assets/images/props/item_sandbucket.png' },
        targets: [
          { id:'castle', emoji:'🏖', x:50, y:70, accepts:'sandbucket' },
        ],
        needs: 3,
      },
      {
        id: 'beach_wave',
        label: '踏浪',
        emoji: '🌊',
        prompt: '去踩踩小浪花！',
        success: '波波波，好涼！',
        prop: { type:'foot', emoji:'👣', img:null },
        targets: [
          { id:'wave', emoji:'🌊', x:50, y:50, accepts:'foot' },
        ],
        needs: 5,
      },
      {
        id: 'beach_crab',
        label: '抓螃蟹',
        emoji: '🦀',
        prompt: '用水桶蓋住螃蟹！',
        success: '抓到囉！',
        prop: { type:'waterbucket', emoji:'🪣', img:'assets/images/props/item_waterbucket.png' },
        targets: [
          { id:'crab1', emoji:'🦀', img:'assets/images/animals/animal_crab.png', x:30, y:65, accepts:'waterbucket' },
          { id:'crab2', emoji:'🦀', img:'assets/images/animals/animal_crab.png', x:70, y:70, accepts:'waterbucket' },
          { id:'crab3', emoji:'🦀', img:'assets/images/animals/animal_crab.png', x:50, y:60, accepts:'waterbucket' },
        ],
        needs: 3,
      },
      // v3: 字母 — C for Crab
      {
        id: 'beach_letter_c',
        label: 'ABC 找螃蟹',
        emoji: '🦀',
        prompt: 'C 是 Crab 螃蟹！找 C 喔～',
        success: 'C 就是 Crab 螃蟹！',
        prop: { type:'letter_tap', target:'C', word:'Crab', wordZh:'螃蟹', emoji:'👆', img:null },
        targets: [
          { id:'l1', label:'O', x:25, y:50, accepts:'letter_tap' },
          { id:'l2', label:'C', x:50, y:50, accepts:'letter_tap' },
          { id:'l3', label:'E', x:75, y:50, accepts:'letter_tap' },
        ],
        needs: 1,
        educational: 'letter',
      },
      // v3: 數一數 — 5 顆貝殼
      {
        id: 'beach_count_shell',
        label: '撿 5 顆貝殼',
        emoji: '🐚',
        prompt: '海邊有貝殼，要撿 5 顆放進水桶喔！',
        success: '5 顆漂亮貝殼收集完成！',
        prop: { type:'shell', emoji:'🐚', img:null },
        targets: [
          { id:'bucket', emoji:'🪣', img:'assets/images/props/item_waterbucket.png', x:50, y:65, accepts:'shell' },
        ],
        needs: 5,
        educational: 'count',
        countLabel: '顆',
      },
    ],
  },
  {
    id: 'dinomountain',
    name: '恐龍山',
    emoji: '🦖',
    color: 'red',
    candyEmoji: '🍓',
    hours: [8, 21],
    bg: 'assets/images/locations/bg_dinomountain.png',
    bgFallback: 'linear-gradient(180deg, #c8e6ff 0%, #ff9a9a 100%)',
    bgEmoji: '🦖',
    tasks: [
      {
        id: 'dino_feed',
        label: '餵恐龍',
        emoji: '🍖',
        prompt: '把肉肉給恐龍吃！',
        success: '啊嗚！好好吃！',
        prop: { type:'meat', emoji:'🍖', img:'assets/images/props/item_meat.png' },
        targets: [
          { id:'dinobig', emoji:'🦖', img:'assets/images/animals/animal_dino_big.png', x:50, y:55, accepts:'meat' },
        ],
        needs: 2,
      },
      {
        id: 'dino_climb',
        label: '爬山',
        emoji: '⛰',
        prompt: '點階梯爬到山頂！',
        success: '山頂到囉！',
        prop: { type:'step', emoji:'⬆️', img:null },
        targets: [
          { id:'mountain', emoji:'⛰', x:50, y:50, accepts:'step' },
        ],
        needs: 5,
      },
      {
        id: 'dino_cage',
        label: '關恐龍',
        emoji: '🏚',
        prompt: '把小恐龍關回籠子！',
        success: '小恐龍回家了！',
        prop: { type:'cage', emoji:'🏚', img:'assets/images/props/item_cage.png' },
        targets: [
          { id:'dinosmall1', emoji:'🦕', img:'assets/images/animals/animal_dino_small.png', x:25, y:65, accepts:'cage' },
          { id:'dinosmall2', emoji:'🦕', img:'assets/images/animals/animal_dino_small.png', x:55, y:70, accepts:'cage' },
          { id:'dinosmall3', emoji:'🦕', img:'assets/images/animals/animal_dino_small.png', x:75, y:60, accepts:'cage' },
        ],
        needs: 3,
      },
      // v3: 字母 — T for T-Rex
      {
        id: 'dino_letter_t',
        label: 'ABC 找暴龍',
        emoji: '🦖',
        prompt: 'T 是 T-Rex 暴龍喔，按 T！',
        success: '答對！T-Rex 是大暴龍！',
        prop: { type:'letter_tap', target:'T', word:'T-Rex', wordZh:'暴龍', emoji:'👆', img:null },
        targets: [
          { id:'l1', label:'L', x:25, y:50, accepts:'letter_tap' },
          { id:'l2', label:'X', x:50, y:50, accepts:'letter_tap' },
          { id:'l3', label:'T', x:75, y:50, accepts:'letter_tap' },
        ],
        needs: 1,
        educational: 'letter',
      },
      // v3: 數一數 — 4 顆恐龍蛋
      {
        id: 'dino_count_eggs',
        label: '撿 4 顆恐龍蛋',
        emoji: '🥚',
        prompt: '山洞裡有 4 顆恐龍蛋，一起數！',
        success: '全部 4 顆都收集到！',
        prop: { type:'dino_egg', emoji:'🥚', img:null },
        targets: [
          { id:'nest', emoji:'🪺', x:50, y:60, accepts:'dino_egg' },
        ],
        needs: 4,
        educational: 'count',
        countLabel: '顆',
      },
    ],
  },
  {
    id: 'office',
    name: '辦公室',
    emoji: '💼',
    color: 'purple',
    candyEmoji: '🍇',
    hours: [12, 18],
    bg: 'assets/images/locations/bg_office.png',
    bgFallback: 'linear-gradient(180deg, #ecd9ff 0%, #c8a8ff 100%)',
    bgEmoji: '💼',
    tasks: [
      {
        id: 'office_keyboard',
        label: '打電腦',
        emoji: '⌨️',
        prompt: '幫爸爸打鍵盤！',
        success: '打字好快！',
        prop: { type:'keyboard', emoji:'⌨️', img:'assets/images/props/item_keyboard.png' },
        targets: [
          { id:'computer', emoji:'💻', x:50, y:50, accepts:'keyboard' },
        ],
        needs: 3,
      },
      {
        id: 'office_duck',
        label: '遛鴨子',
        emoji: '🦆',
        prompt: '牽著鴨子去散步！',
        success: '鴨鴨跟著你走！',
        prop: { type:'leash', emoji:'🪢', img:'assets/images/props/item_leash.png' },
        targets: [
          { id:'officeduck', emoji:'🦆', img:'assets/images/animals/animal_duck.png', x:50, y:60, accepts:'leash' },
        ],
        needs: 2,
      },
      {
        id: 'office_cuckoo',
        label: '布穀鳥',
        emoji: '🕰',
        prompt: '點時鐘讓布穀鳥跳出來！',
        success: '咕咕！時間到！',
        prop: { type:'clocktap', emoji:'👆', img:null },
        targets: [
          { id:'clock', emoji:'🕰', img:'assets/images/props/item_cuckoo_clock.png', x:50, y:40, accepts:'clocktap' },
        ],
        needs: 3,
      },
      // v3: 字母 — O for Office
      {
        id: 'office_letter_o',
        label: 'ABC 找辦公室',
        emoji: '🏢',
        prompt: 'O 是 Office 辦公室喔，找 O！',
        success: 'O 是 Office 辦公室！',
        prop: { type:'letter_tap', target:'O', word:'Office', wordZh:'辦公室', emoji:'👆', img:null },
        targets: [
          { id:'l1', label:'Q', x:25, y:50, accepts:'letter_tap' },
          { id:'l2', label:'O', x:50, y:50, accepts:'letter_tap' },
          { id:'l3', label:'C', x:75, y:50, accepts:'letter_tap' },
        ],
        needs: 1,
        educational: 'letter',
      },
      // v3: 數一數 — 5 份文件
      {
        id: 'office_count_paper',
        label: '5 份文件',
        emoji: '🔢',
        prompt: '幫爸爸把 5 份文件放進文件夾！',
        success: '5 份文件整理完成！',
        prop: { type:'paper', emoji:'📄', img:null },
        targets: [
          { id:'folder', emoji:'📁', x:50, y:55, accepts:'paper' },
        ],
        needs: 5,
        educational: 'count',
        countLabel: '份',
      },
    ],
  },
  // --- v2: 動物園 ---
  {
    id: 'zoo',
    name: '動物園',
    emoji: '🐼',
    color: 'pink',
    candyEmoji: '🩷',
    hours: [8, 18],
    bg: 'assets/images/locations/bg_zoo.png',
    bgFallback: 'linear-gradient(180deg, #ffe0ec 0%, #ffc8dd 100%)',
    bgEmoji: '🦁',
    tasks: [
      {
        id: 'zoo_panda',
        label: '餵熊貓',
        emoji: '🐼',
        prompt: '把竹子給熊貓圓圓！',
        success: '圓圓最愛竹子了！',
        prop: { type:'bamboo', emoji:'🎋', img:'assets/images/props/item_bamboo.png' },
        targets: [
          { id:'panda', emoji:'🐼', img:'assets/images/animals/animal_panda.png', x:28, y:60, accepts:'bamboo' },
        ],
        needs: 3,
      },
      {
        id: 'zoo_giraffe',
        label: '餵長頸鹿',
        emoji: '🦒',
        prompt: '把胡蘿蔔舉高給長頸鹿！',
        success: '咔滋咔滋～好甜！',
        prop: { type:'carrot', emoji:'🥕', img:'assets/images/props/item_carrot.png' },
        targets: [
          { id:'giraffe', emoji:'🦒', img:'assets/images/animals/animal_giraffe.png', x:55, y:45, accepts:'carrot' },
        ],
        needs: 3,
      },
      {
        id: 'zoo_croc',
        label: '拔蛀牙',
        emoji: '🐊',
        prompt: '小心用夾子幫鱷魚拔蛀牙！',
        success: '哈！牙齒不痛囉！',
        prop: { type:'pliers', emoji:'🪛', img:'assets/images/props/item_pliers.png' },
        targets: [
          { id:'croc', emoji:'🐊', img:'assets/images/animals/animal_crocodile.png', x:75, y:65, accepts:'pliers' },
        ],
        needs: 2,
      },
      // v3: 字母 — P for Panda
      {
        id: 'zoo_letter_p',
        label: 'ABC 找熊貓',
        emoji: '🐼',
        prompt: 'P 是 Panda 熊貓喔，找 P！',
        success: 'P 就是 Panda 熊貓！',
        prop: { type:'letter_tap', target:'P', word:'Panda', wordZh:'熊貓', emoji:'👆', img:null },
        targets: [
          { id:'l1', label:'B', x:25, y:50, accepts:'letter_tap' },
          { id:'l2', label:'P', x:50, y:50, accepts:'letter_tap' },
          { id:'l3', label:'R', x:75, y:50, accepts:'letter_tap' },
        ],
        needs: 1,
        educational: 'letter',
      },
      // v3: 數一數 — 3 根香蕉
      {
        id: 'zoo_count_banana',
        label: '猴子吃 3 根香蕉',
        emoji: '🍌',
        prompt: '猴子餓了，要 3 根香蕉，一起數喔！',
        success: '3 根香蕉，猴子最開心！',
        prop: { type:'banana', emoji:'🍌', img:null },
        targets: [
          { id:'monkey', emoji:'🐒', x:50, y:60, accepts:'banana' },
        ],
        needs: 3,
        educational: 'count',
        countLabel: '根',
      },
    ],
  },
  // --- v2: 羊世界 ---
  {
    id: 'sheepworld',
    name: '羊世界',
    emoji: '🐑',
    color: 'teal',
    candyEmoji: '🟢',
    hours: [8, 17],
    bg: 'assets/images/locations/bg_sheepworld.png',
    bgFallback: 'linear-gradient(180deg, #d8f3e6 0%, #b3e4c7 100%)',
    bgEmoji: '🐑',
    tasks: [
      {
        id: 'sheep_feed',
        label: '餵小羊',
        emoji: '🌾',
        prompt: '把牧草給小羊咩咩！',
        success: '咩～吃得好開心！',
        prop: { type:'grass', emoji:'🌾', img:'assets/images/props/item_grass.png' },
        targets: [
          { id:'lamb', emoji:'🐑', img:'assets/images/animals/animal_sheep.png', x:25, y:65, accepts:'grass' },
        ],
        needs: 3,
      },
      {
        id: 'sheep_train',
        label: '坐小火車',
        emoji: '🚂',
        prompt: '投硬幣讓小火車開動！',
        success: '嗚～出發囉！',
        prop: { type:'coin', emoji:'🪙', img:'assets/images/props/item_coin.png' },
        targets: [
          { id:'train', emoji:'🚂', x:50, y:60, accepts:'coin' },
        ],
        needs: 2,
      },
      {
        id: 'sheep_capybara',
        label: '餵水豚',
        emoji: '🦫',
        prompt: '把飼料給水豚大哥！',
        success: '呼～飽飽好舒服！',
        prop: { type:'feed', emoji:'🥣', img:'assets/images/props/item_animal_feed.png' },
        targets: [
          { id:'capy', emoji:'🦫', img:'assets/images/animals/animal_capybara.png', x:75, y:65, accepts:'feed' },
        ],
        needs: 3,
      },
      // v3: 字母 — S for Sheep
      {
        id: 'sheep_letter_s',
        label: 'ABC 找小羊',
        emoji: '🐑',
        prompt: 'S 是 Sheep 小羊喔，按 S！',
        success: 'S 就是 Sheep 小羊！',
        prop: { type:'letter_tap', target:'S', word:'Sheep', wordZh:'小羊', emoji:'👆', img:null },
        targets: [
          { id:'l1', label:'S', x:25, y:50, accepts:'letter_tap' },
          { id:'l2', label:'Z', x:50, y:50, accepts:'letter_tap' },
          { id:'l3', label:'N', x:75, y:50, accepts:'letter_tap' },
        ],
        needs: 1,
        educational: 'letter',
      },
      // v3: 數一數 — 6 把牧草
      {
        id: 'sheep_count_grass',
        label: '6 把牧草',
        emoji: '🔢',
        prompt: '羊群有點餓，要 6 把牧草，一起數！',
        success: '6 把牧草，羊群好飽！',
        prop: { type:'grass', emoji:'🌾', img:'assets/images/props/item_grass.png' },
        targets: [
          { id:'flock', emoji:'🐑', img:'assets/images/animals/animal_sheep.png', x:50, y:65, accepts:'grass' },
        ],
        needs: 6,
        educational: 'count',
        countLabel: '把',
      },
    ],
  },
];

// Which egg may drop when a location is fully cleared today.
export const LOCATION_EGG = {
  qingtang:     'duck',
  kindergarten: 'bear',
  nursery:      'bunny',
  beach:        'crab',
  dinomountain: 'dino',
  office:       'bird',
  zoo:          'panda',
  sheepworld:   'sheep',
};

export function findLocation(id) {
  return LOCATIONS.find(l => l.id === id);
}
export function findTask(locId, taskId) {
  const loc = findLocation(locId);
  return loc?.tasks.find(t => t.id === taskId);
}
