# Repository Guidelines

## 專案基礎
- 純前端 Chrome Extension（MV3）。
- 主要入口：app（閱讀）、popup（彈窗）、manage（管理頁）、background（service worker）。

## 核心規範
- **不得引入後端服務**。
- **維持既有資料流**：UI → reducers → epics → store。
- **禁止手改 `dist/`**。
- **使用 Yarn（不得使用 npm）**。
- **所有提交必須符合 Conventional Commits**。

## Codex 工作入口
- 硬性規範以 `docs/01-overview/extension-rules.md` 為準。
- 任務路由與測試選擇先看 `docs/index.md` 的「任務入口」。
- 站點 / parser / manifest / DNR / redirect 類任務優先使用 `$comic-scroller-site-adapter`。
- 預設先跑相關 focused tests；收尾或 CI 等價檢查用 `yarn verify`。
- 版本更新一律用 `yarn version:bump <major|minor|patch|x.y.z>`，不要手改版本號。

## 文件索引
入口：`docs/index.md`

重點文件：
- `docs/01-overview/extension-rules.md`
- `docs/01-overview/architecture.md`
- `docs/02-dev/commands.md`
- `docs/02-dev/toolchain.md`
- `docs/04-sites/dm5.md`
