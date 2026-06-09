import CheckboxField from "@components/CheckboxField";
import ConfirmDialog from "@components/ConfirmDialog";
import type { ChangeEventHandler } from "react";

import type { ManageDialogState } from "./types";

type ManageConfirmDialogProps = {
  busy: boolean;
  clearSeriesDataCheckboxId: string;
  clearSeriesDataDescriptionId: string;
  dialogState: ManageDialogState;
  onClearSeriesDataChange: ChangeEventHandler<HTMLInputElement>;
  onClose: () => void;
  onConfirm: () => void;
};

export function ManageConfirmDialog({
  busy,
  clearSeriesDataCheckboxId,
  clearSeriesDataDescriptionId,
  dialogState,
  onClearSeriesDataChange,
  onClose,
  onConfirm,
}: ManageConfirmDialogProps) {
  if (dialogState.kind === "closed") {
    return null;
  }

  if (dialogState.kind === "reset") {
    return (
      <ConfirmDialog
        open
        title="重置資料"
        description="確定重置所有資料？此操作會刪除更新、追蹤、紀錄與作品快取。"
        confirmLabel="重置資料"
        busy={busy}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );
  }

  if (dialogState.kind === "history") {
    return (
      <ConfirmDialog
        open
        title="移除閱讀紀錄"
        description={`確定移除「${dialogState.item.title}」的閱讀紀錄嗎？追蹤、更新與作品資料會保留。`}
        confirmLabel="移除紀錄"
        busy={busy}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );
  }

  return (
    <ConfirmDialog
      open
      title="棄坑作品"
      description={`確定取消追蹤「${dialogState.item.title}」嗎？未勾選時只會取消追蹤並清除更新提醒。`}
      confirmLabel="確認棄坑"
      busy={busy}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <CheckboxField
        id={clearSeriesDataCheckboxId}
        descriptionId={clearSeriesDataDescriptionId}
        label="一併清除閱讀紀錄與作品資料"
        description="勾選後會額外刪除這部作品的閱讀紀錄與快取。此操作無法復原。"
        checked={dialogState.clearSeriesData}
        disabled={busy}
        onChange={onClearSeriesDataChange}
      />
    </ConfirmDialog>
  );
}
