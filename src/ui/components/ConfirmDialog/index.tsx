import useDialogFocus from "@ui/hooks/useDialogFocus";
import type { ReactNode } from "react";
import { useId, useRef } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "secondary" | "danger";
  busy?: boolean;
  children?: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
};

function getConfirmButtonClass(variant: ConfirmDialogProps["confirmVariant"]) {
  if (variant === "primary") {
    return "ds-btn-primary";
  }
  if (variant === "secondary") {
    return "ds-btn-secondary";
  }
  return "ds-btn-danger";
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "取消",
  confirmVariant = "danger",
  busy = false,
  children,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useDialogFocus({
    open,
    dialogRef,
    initialFocusRef: cancelButtonRef,
    onEscape: busy ? undefined : onClose,
  });

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="ds-dialog-backdrop"
      onClick={() => {
        if (!busy) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="ds-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <div className="ds-dialog__body">
          <h2 id={titleId} className="ds-dialog__title">
            {title}
          </h2>
          <p id={descriptionId} className="ds-dialog__desc">
            {description}
          </p>
          {children ? <div className="ds-dialog__content">{children}</div> : null}
        </div>
        <div className="ds-dialog__footer">
          <button
            ref={cancelButtonRef}
            type="button"
            className="ds-btn-secondary"
            disabled={busy}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={getConfirmButtonClass(confirmVariant)}
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
