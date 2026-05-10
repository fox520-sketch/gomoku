# Gomoku v9 Firestore Rules Syntax Hotfix

這版只修正 Firestore Rules 編譯錯誤：`Invalid variable name: roomId`。

原因：`validRoom()` 函式在 match 區塊外定義，不能直接讀取 `{roomId}`，因此改成把 `roomId` 傳入函式。

請到 Firebase Console：Cloud Firestore > 規則，把 `firebase/firestore.rules` 內容全部貼上並按「發布」。

這版不需要更新 `js/firebase-config.js`。如果 GitHub repo 內也想保存規則範本，可以同步覆蓋 `firebase/firestore.rules`。
