# 技術規格

## 架構

```
kids-daily-adventure/
├── index.html              # 主入口（單頁）
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker（離線支援）
├── css/
│   └── style.css          # 全站樣式（含響應式）
├── js/
│   ├── app.js             # 入口、路由（地圖⇄場景⇄背包）
│   ├── state.js           # localStorage 狀態管理
│   ├── scenes.js          # 6 個地點場景定義（任務、道具、動畫）
│   ├── drag.js            # 拖移互動引擎
│   ├── audio.js           # 音訊（BGM、音效、語音）
│   └── haptics.js         # 震動回饋
├── assets/
│   ├── images/
│   │   ├── map/           # 主地圖
│   │   ├── locations/     # 6 張背景
│   │   ├── props/         # 18 個道具
│   │   ├── animals/       # 動物/角色
│   │   ├── candies/       # 6 色糖果
│   │   └── ui/            # UI 元素
│   └── audio/             # BGM 與音效（可選）
├── scripts/
│   └── generate_images.py # Grok API 圖片生成腳本
└── docs/
    ├── GAME_DESIGN.md
    ├── IMAGE_PROMPTS.md
    └── TECH_SPEC.md
```

## 主要畫面與路由

用單一 HTML + 多個 `<section>`，JS 切換 class 做過場：

1. **#splash** — 開始畫面（Logo + 兩個角色 + 「開始冒險」按鈕）
2. **#map** — 主地圖（6 個地點 + 右上角背包入口 + 時鐘顯示）
3. **#scene** — 地點內部（背景 + 3 個任務卡 + 道具欄）
4. **#task** — 任務進行中（拖移互動、計數、完成動畫）
5. **#backpack** — 糖果背包（6 色糖果計數 + 彩虹進度）

路由：更新 URL hash（`#/`、`#/location/qingtang`、`#/backpack`），使瀏覽器上一頁可正常返回。

## 互動：拖移

用 Pointer Events（同時支援觸控與滑鼠）：

```js
// 道具卡
prop.addEventListener('pointerdown', startDrag);
function startDrag(e) {
  prop.setPointerCapture(e.pointerId);
  prop.addEventListener('pointermove', onMove);
  prop.addEventListener('pointerup', onDrop);
}
function onDrop(e) {
  // 檢查 elementFromPoint 是否為有效 target
  const target = document.elementFromPoint(e.clientX, e.clientY);
  if (target?.dataset.accepts === prop.dataset.type) {
    triggerSuccess(target);
  }
}
```

## 互動：時間窗

每次進入地點前檢查當地時間：
```js
function isLocationOpen(location) {
  const h = new Date().getHours();
  return h >= location.openHour && h < location.closeHour;
}
```
關閉時段顯示「小月亮睡覺中，記得 XX 點再來玩！」並鎖定該地點（降 50% 透明度）。

## 互動：每日任務重置

```js
function getTodayKey() {
  return 'kda_daily_' + new Date().toISOString().slice(0,10);
}
// 寫入完成 task id
const done = JSON.parse(localStorage.getItem(getTodayKey()) || '[]');
done.push(taskId);
localStorage.setItem(getTodayKey(), JSON.stringify(done));
```

## 音訊

- 每個地點用 Web Audio API `AudioBufferSourceNode` loop 播放 BGM
- 因小孩裝置可能沒音源檔，啟動時嘗試 fetch，失敗則靜音不阻塞
- 使用者首次點擊後才初始化 AudioContext（iOS 需使用者手勢）
- 語音提示：用 `SpeechSynthesisUtterance` 說中文（免外部檔案）

```js
function speak(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-TW';
  u.rate = 0.9;
  speechSynthesis.speak(u);
}
```

## 震動

```js
function buzz(pattern = [50]) {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}
// 成功: [100, 50, 100]
// 點擊: [30]
// 完成全部: [200, 100, 200, 100, 400]
```

## 響應式策略

CSS 媒體查詢 + viewport：

```css
/* 基準：直式手機 */
.map-grid { grid-template: repeat(3, 1fr) / repeat(2, 1fr); }

/* 橫式手機 / 小平板 */
@media (orientation: landscape) and (max-width: 1024px) {
  .map-grid { grid-template: repeat(2, 1fr) / repeat(3, 1fr); }
}

/* 大螢幕 */
@media (min-width: 1025px) {
  .app { max-width: 1024px; margin: 0 auto; }
}

/* 瀏海 */
.app {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

使用 CSS Grid 讓佈局自動適應。

## 儲存格式

```json
// kda_candies
{ "green": 3, "yellow": 1, "orange": 0, "blue": 2, "red": 5, "purple": 1 }

// kda_daily_2026-04-19
["qingtang_feed_duck", "qingtang_feed_fish"]

// kda_settings
{ "bgm": true, "sfx": true, "voice": true, "vibration": true }
```

## Fallback 機制

若 Grok 生成失敗，使用 CSS/SVG/emoji 替代：
- 背景 → CSS 漸層 + 大 emoji（🏞/🏫/🏖/...）
- 道具 → emoji 按鈕（🍞/🥏/🍖...）
- 動物 → emoji（🦆/🐕/🦖...）
- 糖果 → CSS 圓形 + 顏色

這樣遊戲在圖片缺失時仍然可玩。

## 部署

- Static site，直接 push 到 GitHub `main` branch
- GitHub Pages → source: main / root
- URL: `https://albertliu16888.github.io/kids-daily-adventure/`

## 安全與隱私

- 不收集任何個資
- 不連外網（除首次載入）
- Service Worker 快取全部資源
- 不含第三方分析
