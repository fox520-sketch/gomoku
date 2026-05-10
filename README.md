# 海洋五子棋 Gomoku Web Game

這是一個可直接放到 GitHub Pages 的五子棋網頁遊戲專案。

## 功能

- 15x15 五子棋棋盤
- 海洋風、護眼風、電子紙風、暮光風、櫻花風、森林風、夜航風
- 單人 vs 電腦 AI
- AI 難易度 1 到 20 級
- 同裝置雙人對戰
- Firebase Firestore 線上雙人對戰
- 邀請連結：建立房間後可複製 `?room=房號` 連結
- 音效開關與多種音效
- 悔棋
- 回合計時器
- 手機、平板、電腦響應式版面
- 無需建置工具，靜態檔案即可部署

## 檔案結構

```text
index.html
css/style.css
js/app.js
js/firebase-config.js
js/firebase-config.example.js
firebase/firestore.rules
```

## 本機測試

因為使用 ES Module，建議使用本機伺服器開啟，不要直接雙擊 HTML。

方式一：使用 Python

```bash
python3 -m http.server 8000
```

然後開啟：

```text
http://localhost:8000
```

方式二：使用 VS Code Live Server 外掛。

## Firebase 設定

1. 到 Firebase Console 建立專案。
2. 新增 Web App。
3. 複製 Firebase Web App 設定。
4. 打開 `js/firebase-config.js`，把空白設定換成你的設定。
5. 啟用 Authentication 的 Anonymous 匿名登入。
6. 啟用 Firestore Database。
7. 到 Firestore Rules，貼上 `firebase/firestore.rules` 的內容並發布。

## GitHub Pages 部署

1. 建立新的 GitHub repository。
2. 上傳本專案所有檔案。
3. 到 repository 的 Settings > Pages。
4. Source 選擇 Deploy from a branch。
5. Branch 選擇 `main`，資料夾選擇 `/root`。
6. 儲存後等待 GitHub Pages 發布完成。

## 使用提醒

- `js/firebase-config.js` 可以公開在前端，但 Firestore 規則務必設定好。
- `firebase/firestore.rules` 已加入較嚴格的玩家身分、欄位格式、房間加入、落子、悔棋與重開驗證。正式公開前仍建議依流量與需求持續調整。
- 線上模式中，只有建立房間的黑棋玩家可以重新開始該房間。
- 線上雙人對戰使用集合：`gomokuRooms`。

## 邀請連結

線上模式建立或加入房間後，網址會自動帶上房號，例如：

```text
https://你的帳號.github.io/gomoku/?room=ABC123
```

按「複製邀請連結」即可把這個網址傳給朋友。朋友打開後會自動切到線上模式並填入房號，只要輸入暱稱後按「加入房間」即可。

## 更新 Firestore Rules

如果你已經部署過舊版，請到 Firebase Console：

1. Cloud Firestore > 規則
2. 貼上 `firebase/firestore.rules` 的新內容
3. 按「發布」

新規則會限制：

- 必須登入匿名帳號才可讀寫
- 只有玩家本人可以更新房間
- 白棋只能在空位時加入
- 落子必須由當前回合玩家發出
- 悔棋只能撤回自己剛下的最後一手
- 只有黑棋房主可以重新開始房間
- 不允許刪除房間文件
