import type { RefObject } from "react";
import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

type UseDialogFocusArgs = {
  open: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscape?: () => void;
  restoreFocus?: boolean;
};

function isFocusable(element: HTMLElement | null): element is HTMLElement {
  return Boolean(
    element &&
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-disabled") !== "true",
  );
}

function getFocusableElements(dialog: HTMLElement) {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(isFocusable);
}

export default function useDialogFocus({
  open,
  dialogRef,
  initialFocusRef,
  onEscape,
  restoreFocus = true,
}: UseDialogFocusArgs) {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const dialog = dialogRef.current;
    const initialFocusElement = initialFocusRef?.current ?? null;
    const initialFocus = isFocusable(initialFocusElement)
      ? initialFocusElement
      : dialog
        ? getFocusableElements(dialog)[0]
        : null;

    (initialFocus || dialog)?.focus();

    const keydownHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onEscapeRef.current) {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const activeDialog = dialogRef.current;
      if (!activeDialog) {
        return;
      }

      const focusableElements = getFocusableElements(activeDialog);

      if (focusableElements.length === 0) {
        event.preventDefault();
        activeDialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      if (!activeElement || !activeDialog.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", keydownHandler);
    return () => {
      document.removeEventListener("keydown", keydownHandler);
      const previousFocus = previousFocusRef.current;
      if (restoreFocus && previousFocus?.isConnected) {
        previousFocus.focus();
      }
      previousFocusRef.current = null;
    };
  }, [dialogRef, initialFocusRef, open, restoreFocus]);
}
