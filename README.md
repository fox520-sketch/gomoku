# 海洋五子棋 Gomoku v11 更新包

這版新增三項功能改善：

1. **線上悔棋請求**
   - 線上雙人不再直接悔棋。
   - 玩家按「悔棋」後會送出請求。
   - 對手會看到「同意悔棋 / 拒絕」按鈕。
   - 對手同意後才會撤回上一手；拒絕則繼續遊戲。
   - 目前支援撤回「自己剛下、且對手尚未回應的最後一手」。

2. **手機確認落子**
   - 新增「手機確認落子：先預覽，再確認送出」設定。
   - 手機預設會開啟，降低誤觸機率。
   - 第一次點棋盤會顯示預覽棋；按「確認落子」或再次點同一格才會真正送出。
   - 可按「取消預覽」取消。

3. **QR Code 邀請好友**
   - 建立房間後，除了邀請連結，也會顯示 QR Code。
   - 朋友用手機掃描即可直接帶入房號。
   - QR Code 使用線上 QR 產生服務，若該服務暫時無法連線，仍可使用邀請連結。

## 要上傳到 GitHub 的檔案

請把本更新包解壓縮後，上傳覆蓋 GitHub repository 裡的這些檔案：

```text
index.html
css/style.css
js/app.js
firebase/firestore.rules
README.md
manifest.json
service-worker.js
icons/icon.svg
icons/icon-192.png
icons/icon-512.png
```

請不要覆蓋：

```text
js/firebase-config.js
```

你的 Firebase 設定已經成功，這個更新包刻意沒有包含 `js/firebase-config.js`。

## Firebase Rules 也要更新

到 Firebase Console：

```text
Cloud Firestore → 規則
```

把舊規則全部刪除，貼上這個檔案的內容：

```text
firebase/firestore.rules
```

然後按 **發布**。

這版 Rules 新增允許房間文件含有：

```text
undoRequest
```

如果沒有更新 Rules，悔棋請求可能會被 Firebase 擋下。

## 測試網址

GitHub commit 完、Firebase Rules 發布完後，等待 GitHub Pages 重新部署 1～3 分鐘。

請用新版網址避開快取：

```text
https://fox520-sketch.github.io/gomoku/?v=11
```

## 測試流程

### A. 測試手機確認落子

1. 開啟「手機確認落子」
2. 點棋盤一格
3. 確認出現預覽棋與「確認落子 / 取消預覽」按鈕
4. 按「確認落子」後才真正下棋

### B. 測試 QR Code 邀請

1. 選「線上雙人 Firebase」
2. 建立新房間
3. 確認房間資訊下方出現邀請連結與 QR Code
4. 用手機掃描 QR Code
5. 手機開啟後輸入暱稱並加入房間

### C. 測試線上悔棋請求

1. 黑棋建立房間並下一手
2. 白棋加入房間
3. 黑棋按「悔棋」
4. 白棋畫面應顯示悔棋請求
5. 白棋按「同意悔棋」
6. 黑棋剛剛那一手會被撤回

## 注意

- 如果悔棋請求送出後又有人下了新的一手，舊悔棋請求會自動失效或被清除。
- QR Code 圖片由線上服務產生；遊戲本身仍可用邀請連結加入。
- 如果更新後畫面怪怪的，先用 `?v=11` 開啟，或強制重新整理。
