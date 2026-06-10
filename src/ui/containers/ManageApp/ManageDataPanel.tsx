import Button from "@components/Button";
import SwitchField from "@components/SwitchField";
import type { LibrarySyncStatus } from "@domain/library";

type ManageDataPanelProps = {
  busy: boolean;
  debugLogEnabled: boolean;
  librarySyncStatus: LibrarySyncStatus;
  onDebugLogToggle: () => void;
  onExportClick: () => void;
  onImportClick: () => void;
  onResetClick: () => void;
  onSyncNow: () => void;
  onSyncToggle: (enabled: boolean) => void;
};

function formatSyncTime(timestamp?: number) {
  if (!timestamp) {
    return "尚未同步";
  }
  return new Date(timestamp).toLocaleString("zh-TW", {
    hour12: false,
  });
}

function formatPayloadSize(bytes?: number) {
  if (!bytes) {
    return "無遠端資料";
  }
  return `${Math.ceil(bytes / 1024)} KB`;
}

export function ManageDataPanel({
  busy,
  debugLogEnabled,
  librarySyncStatus,
  onDebugLogToggle,
  onExportClick,
  onImportClick,
  onResetClick,
  onSyncNow,
  onSyncToggle,
}: ManageDataPanelProps) {
  const syncDisabled = busy || !librarySyncStatus.available;

  return (
    <div className="manage-settings-stack">
      <section className="manage-settings-section">
        <h2 className="manage-section-title">開發者功能</h2>
        <SwitchField
          id="manage-debug-log-toggle"
          label="除錯記錄"
          description="輸出 Redux action 與解析 trace 到 console。"
          checked={debugLogEnabled}
          onToggle={onDebugLogToggle}
        />
      </section>
      <section className="manage-settings-section">
        <h2 className="manage-section-title">Chrome 同步</h2>
        <SwitchField
          id="manage-library-sync-toggle"
          label="同步精簡書庫"
          description="使用 Chrome 帳號同步追蹤、閱讀紀錄與更新狀態；完整章節快取仍只保留在本機。"
          checked={librarySyncStatus.enabled}
          disabled={syncDisabled}
          onToggle={() => onSyncToggle(!librarySyncStatus.enabled)}
        />
        <div className="mt-4 grid gap-2 rounded-2xl border border-comic-line/70 bg-comic-paper-soft/70 p-4 text-[12px] leading-5 text-comic-ink/65">
          <div className="flex items-center justify-between gap-4">
            <span>上次同步</span>
            <span className="font-medium text-comic-ink">
              {formatSyncTime(librarySyncStatus.lastSyncedAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>遠端更新</span>
            <span className="font-medium text-comic-ink">
              {formatSyncTime(librarySyncStatus.remoteUpdatedAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>同步大小</span>
            <span className="font-medium text-comic-ink">
              {formatPayloadSize(librarySyncStatus.payloadBytes)}
            </span>
          </div>
          {librarySyncStatus.lastError ? (
            <p role="alert" className="text-red-700">
              {librarySyncStatus.lastError}
            </p>
          ) : null}
          {!librarySyncStatus.available ? (
            <p role="status">
              目前無法存取 Chrome Sync，請確認 extension storage 權限與瀏覽器環境。
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            disabled={syncDisabled || !librarySyncStatus.enabled}
            onClick={onSyncNow}
          >
            立即同步
          </Button>
        </div>
      </section>
      <section className="manage-settings-section">
        <h2 className="manage-section-title">資料</h2>
        <p className="manage-section-desc">匯入、匯出或重置資料。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="primary" disabled={busy} onClick={onImportClick}>
            匯入設定
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onExportClick}>
            匯出設定
          </Button>
          <Button variant="danger" disabled={busy} onClick={onResetClick}>
            重置資料
          </Button>
        </div>
      </section>
    </div>
  );
}
