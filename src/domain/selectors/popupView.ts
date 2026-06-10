import type { ExtensionReleaseNotice } from "@domain/extensionRelease";
import type {
  LibrarySyncStatus,
  PopupFeedSnapshot,
} from "@domain/library";

type PopupState = {
  popup: {
    feed: PopupFeedSnapshot;
    extensionReleaseNotice: ExtensionReleaseNotice | null;
    hydrationStatus: "idle" | "loading" | "ready";
    activeAction: "import" | "export" | "remove" | "reset" | "sync" | null;
    notice: {
      tone: "success" | "error" | "info";
      message: string;
    } | null;
    exportUrl: string;
    exportFilename: string;
    librarySyncStatus: LibrarySyncStatus;
  };
};

export function selectPopupView(state: PopupState) {
  const popupState = state.popup;

  return {
    hydrationStatus: popupState.hydrationStatus,
    activeAction: popupState.activeAction,
    notice: popupState.notice,
    extensionReleaseNotice: popupState.extensionReleaseNotice,
    exportUrl: popupState.exportUrl,
    exportFilename: popupState.exportFilename,
    librarySyncStatus: popupState.librarySyncStatus,
    update: popupState.feed.update,
    updatesTruncated: popupState.feed.updatesTruncated === true,
    subscribe: popupState.feed.subscribe,
    history: popupState.feed.history,
    continueReading: popupState.feed.continueReading,
  };
}

export type PopupViewProps = ReturnType<typeof selectPopupView>;
