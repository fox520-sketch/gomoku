# 海洋五子棋 Gomoku Web Game

這是一個可直接放到 GitHub Pages 的五子棋網頁遊戲專案。

## 功能

- 15x15 五子棋棋盤
- 海洋風、護眼風、電子紙風、暮光風、櫻花風、森林風、夜航風
- 單人 vs 電腦 AI
- AI 難易度 1 到 20 級
- 同裝置雙人對戰
- Firebase Firestore 線上雙人對戰
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
- 本專案的 Firestore 規則是入門示範，可再依需求加強驗證。
- 線上雙人對戰使用集合：`gomokuRooms`。
