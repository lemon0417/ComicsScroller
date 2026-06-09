import Button from "@components/Button";
import SwitchField from "@components/SwitchField";

type ManageDataPanelProps = {
  busy: boolean;
  debugLogEnabled: boolean;
  onDebugLogToggle: () => void;
  onExportClick: () => void;
  onImportClick: () => void;
  onResetClick: () => void;
};

export function ManageDataPanel({
  busy,
  debugLogEnabled,
  onDebugLogToggle,
  onExportClick,
  onImportClick,
  onResetClick,
}: ManageDataPanelProps) {
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
