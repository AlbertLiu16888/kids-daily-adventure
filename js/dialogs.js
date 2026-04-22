// Continuity dialog threads keyed by task id.
// Each array plays in sequence: [start, afterFirstDrop, ..., onComplete].
// app.js picks lines by progress so children hear a connected little story.

export const TASK_DIALOG = {
  // 青塘園
  qingtang_feed_duck: [
    '鴨鴨和鵝鵝看到你啦，肚子咕咕叫！',
    '第一隻吃到了，笑得好開心～',
    '鵝鵝也想吃，快把麵包給牠！',
    '兩位都吃飽了，謝謝你！',
  ],
  qingtang_feed_fish: [
    '池塘裡的小魚游過來了',
    '噗通～第一口，吃得好香',
    '再撒一把，魚群都圍過來了',
    '魚魚吃飽了，向你吐泡泡說謝謝',
  ],
  qingtang_play_dog: [
    '狗狗想玩飛盤，尾巴搖個不停！',
    '汪！叼回來了，還要再丟一次',
    '玩得好開心，狗狗對你笑',
  ],

  // 田園幼稚園
  kg_eat: [
    '吃飯時間到囉，肚子咕咕叫',
    '好吃耶！再一口',
    '白飯變成超人能量，吃光光！',
  ],
  kg_brush: [
    '該刷牙了，細菌要跑光光',
    '上面刷刷、下面刷刷',
    '牙齒亮晶晶，笑一個！',
  ],
  kg_bike: [
    '出門要戴安全帽喔，保護頭頭',
    '安全帽扣好了，好帥！',
    '可以騎腳踏車囉，出發！',
  ],

  // 金培恩托兒所
  ny_bottle: [
    '小寶寶肚子餓了要喝奶',
    '咕嘟咕嘟，寶寶喝得好香',
    '喝飽了，寶寶笑嘻嘻',
  ],
  ny_wash: [
    '玩完要洗手，細菌才不會跑到嘴巴',
    '搓一搓泡泡，好香',
    '手手乾乾淨淨，摸臉不怕囉',
  ],
  ny_toy: [
    '玩完玩具要收回盒子裡',
    '把積木放進去，真棒',
    '房間變乾淨了，下次更好玩',
  ],

  // 海邊
  beach_sand: [
    '哇～沙灘暖暖的，可以堆城堡',
    '加一點沙，城堡越來越高',
    '你堆的城堡好漂亮！',
  ],
  beach_wave: [
    '海浪輕輕拍拍小腳丫',
    '腳丫涼涼，好舒服',
    '海說：下次再來玩喔～',
  ],
  beach_crab: [
    '小螃蟹躲在沙裡',
    '倒一點水，螃蟹探頭出來了',
    '螃蟹揮揮手跟你打招呼！',
  ],

  // 恐龍山
  dino_feed: [
    '大恐龍肚子餓得好大聲！',
    '牠聞到肉肉味，張大嘴巴',
    '大恐龍摸摸肚子，好滿足',
  ],
  dino_climb: [
    '山上風景很美，我們爬上去吧',
    '一步一步穩穩爬',
    '到山頂啦，哇～看得好遠！',
  ],
  dino_cage: [
    '小恐龍走丟了，快去找牠們',
    '第一隻小恐龍回家囉',
    '第二隻也找到了',
    '三隻小恐龍團圓，開心得跳起來！',
  ],

  // 辦公室
  office_keyboard: [
    '爸爸要打電腦，幫忙敲一下鍵盤',
    '啪啪啪，打出一行字了',
    '工作完成，爸爸跟你說謝謝！',
  ],
  office_duck: [
    '小黃鴨說：今天我想出門散步',
    '牽好繩子，鴨鴨跟上來了',
    '散步完畢，鴨鴨肚子飽飽累累',
  ],
  office_cuckoo: [
    '時鐘指到整點，咕咕鐘要出來囉',
    '咕咕～咕咕～第一聲',
    '再點一下',
    '咕咕鳥鞠躬回家，時間剛剛好',
  ],

  // --- v2: 動物園 ---
  zoo_panda: [
    '熊貓圓圓在竹林後面偷看你',
    '聞到新鮮竹子，圓圓眼睛亮了！',
    '嚓嚓嚓～吃竹子的聲音好療癒',
    '圓圓拍拍肚子：我們是好朋友了！',
  ],
  zoo_giraffe: [
    '長頸鹿高高探出頭跟你問好',
    '牠最喜歡脆脆的胡蘿蔔了',
    '再一根！長頸鹿點點頭說謝謝',
    '長頸鹿彎下長長的脖子親親你～',
  ],
  zoo_croc: [
    '鱷魚先生張大嘴：哎唷我牙齒痛痛的',
    '夾出一顆蛀牙，勇敢鱷魚忍住了',
    '再一顆，快完成囉！',
    '嘴巴亮晶晶，鱷魚哈哈大笑，謝謝你！',
  ],

  // --- v2: 羊世界 ---
  sheep_feed: [
    '小羊咩咩跑過來迎接你',
    '咬一口新鮮牧草，咩～好好吃',
    '羊毛變得更蓬鬆了，快摸摸看',
    '小羊依偎在你身邊，咩咩說謝謝',
  ],
  sheep_train: [
    '叮噹～小火車開始賣票啦',
    '投進第一枚星星硬幣！',
    '再一枚，車廂開始動了',
    '嗚——出發！風吹過臉好涼快',
  ],
  sheep_capybara: [
    '水豚大哥懶懶地泡在溫泉邊',
    '牠聞到飼料香香，瞇瞇眼點頭',
    '吃完了還要一碗～',
    '水豚打了一個滿足的呵欠：謝謝你',
  ],
};

// Multi-day greeting when visiting a hatched pet in the nest.
// Picks by dayIndex % list.length
export const PET_DAILY = [
  '你好～今天是我們第一天見面，我有點害羞',
  '你又來看我了，好開心～',
  '我記得你！今天想陪我玩嗎？',
  '嘿嘿～我們已經是好朋友囉',
  '我偷偷練了新動作，看～',
  '每天看到你都覺得好幸福',
];

export function dialogFor(taskId, progress, total) {
  const lines = TASK_DIALOG[taskId];
  if (!lines || !lines.length) return null;
  if (progress <= 0) return lines[0];
  if (progress >= total) return lines[lines.length - 1];
  // distribute middle lines across mid progress
  const mids = lines.slice(1, -1);
  if (!mids.length) return lines[0];
  const idx = Math.min(mids.length - 1, Math.max(0, progress - 1));
  return mids[idx];
}
