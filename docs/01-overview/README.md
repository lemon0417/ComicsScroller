# 專案概覽

## 核心定位
- 純前端 Chrome Extension（MV3），不依賴後端服務。
- 主要包含：閱讀頁（app）、彈窗（popup）、管理頁（manage）、背景服務（service worker）。
- 持久化主資料由 `IndexedDB` 管理，`chrome.storage.local` 僅負責同步 signal 與小型設定，頁面 store 只承擔 UI / session state。

## 入口與核心模組
- Reader：`src/app.tsx` → `src/ui/containers/App`
- Popup：`src/popup.tsx` → `src/ui/containers/PopupApp`
- Manage：`src/manage.tsx` → `src/ui/containers/ManageApp`
- Background：`src/background.ts`

## 目錄結構（重點）
- `src/ui/`：UI 組件與容器
- `src/domain/`：actions / reducers / selectors / store
- `src/epics/`：副作用與資料流
- `src/sites/`：站點 adapter / registry / meta（reader + background 共用）
- `src/infra/`：storage / library repository / chrome 等 I/O
- `src/styles/`：樣式（`tailwind.css` 為入口）
- `src/assets/`：靜態資產（`imgs/`）
- `src/manifest/`：`manifest.json` / `manifest.dev.json`
- `public/`：靜態資產與 `rules.json`
- `dist/`：建置輸出（禁止手改）
- `docs/`：文件

## 目前架構重點
- 共享持久化模型位於 `src/infra/services/library/`
- repository 呼叫面依 runtime 場景拆分：
  - reader：`library/reader.ts`
  - popup / manage：`library/popup.ts`
  - background：`library/background.ts`
- 新功能應先選場景 facade；只有 repository 行為本身才直接碰 `queries / mutations / compat / sync / signal`
- schema constants / row types / normalize helper 由 `library/schema.ts` 內部持有
- popup / manage / reader 的持久化同步：`chrome.storage.onChanged` + `librarySignal`
- `LibrarySnapshotV2` 只留在 `compat.ts` 的匯入匯出與 migration 路徑，公開 facade 不再鼓勵 snapshot 型 API
- runtime IndexedDB rows、dump v1/v2、legacy 匯入相容性是不同層次，細節見 `docs/03-features/library.md`
- popup / manage 走 `getPopupFeedSnapshot()`，store 內只保存 popup feed 與 UI 狀態
- `getPopupFeedSnapshot()` 直接從 IndexedDB rows 組出 feed，不再先還原成完整 library snapshot
- reader 保存 canonical `seriesKey`
- reader mount / signal sync 優先走 `getReaderSeriesSyncState()`，避免為了同步 subscribe 狀態去 hydrate 全量章節資料
- `getReaderSeriesState()` 保留給需要完整 chapter list / read state 的 reader 查詢
- reader 與 background 走系列級 mutation，不再每次全量重寫整包 snapshot
- `src/background.ts` 已收斂成 listener wiring，背景更新檢查與通知邏輯在 `src/infra/services/background.ts`
- reducer 不負責 DOM / URL side effects，這類行為放在 epics
- background 保持 MV3 service worker 限制下可用，不依賴 DOM API
