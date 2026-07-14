# Background Check（僅 dev）

## 用途
驗證背景更新流程：模擬訂閱掃描並回報新增更新數。

## 使用方式
1. `yarn start` 建置 dev 版本
2. 重新載入 extension（dist/）
3. Popup 右上角選單 → `Background Check`

## 輸出
會以 Chrome notification 顯示：
- checked / new / added / errors

## 更新語意
- 每輪最多處理 20 本，站點 HTTP concurrency 固定為 4，單筆 request 有 timeout
- DM5 使用 RSS-first 章節來源；SF／ComicBus 目前由作品 HTML 投影章節快照
- 背景只刷新完整章節快照與 updates，不更動 title、cover、作品 URL 或閱讀進度
- 同一輪 repository invalidation 會合併成一個 library signal

## 注意
- 僅 dev 模式顯示
- 需要在 `chrome://extensions` 查看 service worker log
