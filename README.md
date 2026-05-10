# 海洋五子棋 Gomoku v10 更新包

這版新增三項體驗改善：

1. **最後一步提示 + 勝利連線動畫**
   - 最後一步會以亮圈與中心點標記。
   - 任一方五子連線後，棋盤會顯示發光勝利線動畫。

2. **對手離線 / 等待加入提示**
   - 線上房間會顯示「等待白棋加入」、「對手在線上」、「對手可能已離線」。
   - 使用 Firestore heartbeat 更新玩家在線狀態，不需要改用 Firebase Realtime Database。

3. **PWA 手機安裝版**
   - 新增 `manifest.json`、`service-worker.js`、App icon。
   - 支援手機瀏覽器「加入主畫面」。
   - 支援基本快取，網站可更像 App 一樣開啟。

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

新版規則允許玩家更新自己的線上狀態欄位：

```text
players.black.online
players.black.lastSeen
players.white.online
players.white.lastSeen
```

所以如果沒有更新 Rules，線上狀態或下棋可能會被擋。

## 測試網址

GitHub commit 完、Firebase Rules 發布完後，等待 GitHub Pages 重新部署 1～3 分鐘。

請用新版網址避開快取：

```text
https://fox520-sketch.github.io/gomoku/?v=10
```

測試流程：

1. 選「線上雙人 Firebase」
2. 建立新房間
3. 黑棋下一手，確認最後一步有亮圈
4. 複製邀請連結
5. 用另一個瀏覽器或手機加入
6. 看右側房間資訊是否顯示對手在線上
7. 其中一方關閉分頁或切到背景，等 15～45 秒，看是否顯示可能離線
8. 連成五子時確認棋盤出現勝利線動畫

## PWA 安裝方式

### Android / Chrome

1. 開啟 GitHub Pages 網站
2. 若出現「安裝到手機」按鈕，可直接點擊
3. 或打開 Chrome 選單，選「安裝應用程式」或「加入主畫面」

### iPhone / Safari

1. 用 Safari 開啟網站
2. 點分享按鈕
3. 選「加入主畫面」

## 注意

- Firestore heartbeat 是輕量版在線狀態，不需要 Realtime Database。
- 手機或瀏覽器可能限制背景分頁更新，因此「離線」提示會有數十秒延遲，這是正常現象。
- 如果更新後畫面怪怪的，先用 `?v=10` 開啟，或強制重新整理。
