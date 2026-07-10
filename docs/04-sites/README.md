# 站點變更 Checklist

Codex 處理站點 / parser / manifest / DNR / redirect 類任務時，優先使用 `$comic-scroller-site-adapter`。本文件是人類與 skill 共同引用的 canonical checklist。

新增或調整站點時，先確認變更屬於 metadata、reader 圖片解析、redirect、manifest 權限或 DNR header 規則。

## 必查位置
- Metadata adapter：`src/sites/<site>/adapter.ts`、`src/sites/<site>/meta.ts`
- Metadata registry：`src/sites/registry.ts`
- Reader epic：`src/epics/sites/<site>.ts`
- Reader epic registry：`src/epics/sites/registry.ts`
- Pure parser / resolver：`src/sites/<site>/`
- Manifest host permissions：`src/manifest/manifest.json`、`src/manifest/manifest.dev.json`
- Background redirect：`src/infra/services/background.ts`
- DNR header 規則：`public/rules.json`

## 規則
- `src/sites/**` 不得 import `src/epics/**`
- 站點 parser 必須支援 MV3 background 可用的 no-DOM fallback
- 新增跨站來源時，同步評估 production/dev manifest 的 `host_permissions`
- 需要 Referer / Cookie / header 修改時，優先用 DNR，不新增 content script 或 webRequest
- 付費、失敗、timeout 與 retry 狀態要明確回到 reader 流程，不讓 UI 永久卡在 loading

## 測試
- Metadata：`src/sites/__tests__/<site>.meta.test.ts`
- Reader parser / resolver：`src/epics/sites/<site>*.test.ts`
- 共用 reader orchestration：`src/epics/sites/readerFlow.test.ts`
- Background redirect 或通知：`src/infra/services/background.test.ts`
