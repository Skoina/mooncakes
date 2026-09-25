# 月餅不要掉！

波皮與嚕卡DUA的中秋手機網頁遊戲。此資料夾是 **庭園版 v3.8** 的 GitHub Pages 靜態部署版本，不需建置工具或後端。

## 部署到 GitHub Pages

1. 登入 GitHub，建立新的 **Public** repository，例如 `mooncake-game`。若你使用 GitHub Free，公開儲存庫可使用 GitHub Pages。
2. **解壓縮**下載的 ZIP。到新 repository 的 `Code` 頁面，點 **Add file → Upload files**，把解壓縮後的**檔案內容**（`index.html`、`game.js`、`style.css`、`assets/`、`audio/`、`.nojekyll`、`README.md`）拖入，上傳並按 **Commit changes**。確定 `index.html` 位於 repository **根目錄**，不要讓整個 `moon-cake-game-github` 資料夾成為網站根目錄，也不要直接上傳 ZIP。
3. 進入 repository 的 **Settings → Pages**。在 **Build and deployment** 的 **Source** 選 **Deploy from a branch**；**Branch** 選 `main`，資料夾選 **/(root)**，按 **Save**。
4. 等待 Pages 完成部署；回到 **Settings → Pages** 點 **Visit site**。專案網址通常是 `https://你的帳號.github.io/mooncake-game/`；以頁面顯示的實際網址為準。

GitHub 官方說明：[上傳檔案](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)、[設定 Pages 來源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。GitHub 表示更新後可能需要最多約 10 分鐘才會出現在網站上。

## 使用與更新

- 首次造訪若瀏覽器禁止音樂自動播放，點畫面上的「開啟音樂，進入遊戲」。音樂會循環播放。
- 一般模式疊滿 20 顆解鎖無限模式；無限模式有 5 條命，每放下 3 顆黑狗加速 20%，每成功疊上一顆背景音樂加速 5%。一般模式第 16～20 顆背景音樂為 1.5 倍速。
- 最高紀錄與解鎖狀態儲存在**該瀏覽器、該網站網址**的 localStorage。本機試玩版的紀錄不會自動轉移到 GitHub Pages 網址；換裝置、無痕模式或清除網站資料也不會共享紀錄。
- 更新時將新版檔案上傳並覆蓋相同路徑。若看見舊畫面，先確認網站根目錄的 `index.html` 已更新，再重新整理頁面。

## v3.8 修正

移除 iPhone Safari、Instagram 內建瀏覽器點擊時可能出現的高亮與按下時的位移效果；透明點擊層保持透明，點擊放下月餅的操作未變。已在 HTML 為 CSS 加上版本查詢參數，更新網站時請**同時覆蓋 `index.html` 與 `style.css`**。
