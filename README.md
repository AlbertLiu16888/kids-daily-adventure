# 🎈 仙貝與旺旺龍的每日探險 (Kids Daily Adventure)

給 2~4 歲小朋友的每日互動探索遊戲。

## 特色

- **6 個地點**：青塘園、田園幼稚園、金培恩托兒所、海邊、恐龍山、辦公室
- **18 個每日任務**：餵鴨子、刷牙、堆沙堡、餵恐龍、遛鴨子 等
- **拖移互動**：把道具拖到動物/物件上觸發可愛動畫
- **糖果獎勵系統**：每個地點一種糖果，收集 6 色進背包
- **時間窗**：不同地點有不同開放時間，培養作息
- **每日重置**：每天一次，避免過度使用
- **離線可玩**：PWA，首次打開後無網路也能用
- **響應式**：手機直式、橫式、平板、桌機自動適配
- **無障礙**：大按鈕、語音提示（zh-TW）、震動回饋

## 技術

- Pure HTML5 + CSS3 + Vanilla JS（ES modules）
- Web Audio API（BGM、音效）
- SpeechSynthesis（中文語音引導）
- Vibration API（震動）
- localStorage（進度）
- Service Worker（離線）

## 開發

直接開啟 `index.html`（需用 HTTP server，ES modules 不能走 file:// 協定）：

```bash
python3 -m http.server 8080
# 訪問 http://localhost:8080
```

## 線上遊玩

https://albertliu16888.github.io/kids-daily-adventure/

## 生成圖片

```bash
python3 scripts/generate_images.py
```

需要 Grok API key，已寫死在腳本內。
