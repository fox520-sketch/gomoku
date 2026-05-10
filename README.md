# Gomoku Ocean v7 Hotfix

這個修正版解決線上模式黑棋第一手被 Firestore Rules 擋下的問題。

## 要更新的檔案

請覆蓋 GitHub repository 中的：

- `js/app.js`
- `firebase/firestore.rules`
- `README.md`

不要覆蓋 `js/firebase-config.js`。

## Firebase Rules

請到 Firebase Console：

Cloud Firestore → 規則

把 `firebase/firestore.rules` 的內容貼上並發布。

發布後請用新的網址參數重新開啟網站，例如：

```text
https://fox520-sketch.github.io/gomoku/?v=7
```

並建立新房間測試。
