#!/usr/bin/env python3
"""Send Telegram notification when game is deployed."""
import json
import os
import sys
import urllib.request

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")
if not BOT_TOKEN or not CHAT_ID:
    sys.stderr.write("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars required\n")
    sys.exit(2)

MESSAGE = """🎈 *仙貝與旺旺龍的每日探險 — 正式上線！*

✅ *GitHub Pages 部署成功*

🔗 *遊戲網址：*
https://albertliu16888.github.io/kids-daily-adventure/

📦 *GitHub Repo：*
https://github.com/AlbertLiu16888/kids-daily-adventure

🎮 *遊戲內容：*
• 6 個地點：青塘園 / 田園幼稚園 / 金培恩 / 海邊 / 恐龍山 / 辦公室
• 18 個每日互動任務（拖移麵包、飛盤、奶瓶...）
• 6 種糖果收集：完成一個地點全部任務得一種顏色
• 每日自動重置、時間窗限制、鼓勵培養作息
• 中文語音引導、震動回饋、背景音樂

🎯 *兩位小玩家：*
• 仙貝（3.5 歲）
• 旺旺龍（2 歲）

⚡ *技術：*
Pure HTML5 + Vanilla JS，PWA 離線可玩，手機/平板/桌機響應式

🚀 請開啟網址陪小朋友一起玩！"""


def main():
    body = json.dumps({
        "chat_id": CHAT_ID,
        "text": MESSAGE,
        "parse_mode": "Markdown",
        "disable_web_page_preview": False,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
    if data.get("ok"):
        print(f"Telegram sent. Message ID: {data['result']['message_id']}")
    else:
        print("Telegram failed:", data)


if __name__ == "__main__":
    main()
