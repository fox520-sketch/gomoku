# Gomoku Ocean v8 Stable Firestore Rules Hotfix

這版是線上雙人權限修正版，重點是讓 Firestore Rules 先穩定通過合法玩家操作。

## 為什麼要這版？

前一版 Rules 對「每一步棋」做太多細節驗證，導致合法的第一手也可能被擋下。
這版改成：

- 必須登入 Firebase 匿名帳號才可讀寫。
- 只有黑棋建立者可以建立房間。
- 只有尚未滿員的房間可以加入白棋。
- 只有房間內的黑棋或白棋玩家可以更新棋局。
- 玩家不能透過一般棋局更新竄改 players 名單。
- 房間資料仍限制必要欄位與棋盤長度。
- 不允許前端刪除房間。

## 要更新的檔案

請覆蓋 GitHub repository 中的：

- `js/app.js`
- `firebase/firestore.rules`
- `README.md`

不要覆蓋：

- `js/firebase-config.js`

## Firebase Rules

請到 Firebase Console：

Cloud Firestore → 規則

把 `firebase/firestore.rules` 的內容全部貼上並發布。

發布後請用新版網址測試，例如：

```text
https://fox520-sketch.github.io/gomoku/?v=8
```

請建立新房間測試，不要使用舊房間。
