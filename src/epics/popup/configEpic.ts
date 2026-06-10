import {
  POPUP_UPDATE_LIMIT,
  type PopupDataView,
  REQUEST_EXPORT_CONFIG,
  REQUEST_IMPORT_CONFIG,
  REQUEST_POPUP_DATA,
  REQUEST_RESET_CONFIG,
  REQUEST_SET_LIBRARY_SYNC_ENABLED,
  REQUEST_SYNC_LIBRARY_NOW,
} from "@domain/actions/popup";
import {
  getPopupUpdateCount,
  type LibrarySyncStatus,
  type PopupFeedSnapshot,
} from "@domain/library";
import {
  hydratePopupFeed,
  setExportConfig,
  setExtensionReleaseNotice,
  setLibrarySyncStatus,
  setPopupNotice,
} from "@domain/reducers/popupState";
import { getExtensionReleaseNotice } from "@infra/services/extensionRelease";
import {
  exportLibraryArchive,
  getLibrarySyncStatus,
  getPopupFeedSnapshot,
  importLibraryDump,
  pushLibrarySyncIfEnabled,
  resetLibrary,
  setLibrarySyncEnabled,
  syncLibraryNow,
} from "@infra/services/library/popup";
import { ofType } from "redux-observable";
import { from, type Observable, of } from "rxjs";
import { catchError, mergeMap } from "rxjs/operators";

import type { PopupEpic } from "../types";

type PopupConfigAction = {
  type:
    | typeof REQUEST_POPUP_DATA
    | typeof REQUEST_IMPORT_CONFIG
    | typeof REQUEST_RESET_CONFIG
    | typeof REQUEST_EXPORT_CONFIG
    | typeof REQUEST_SET_LIBRARY_SYNC_ENABLED
    | typeof REQUEST_SYNC_LIBRARY_NOW;
  payload?: unknown;
};

function resolvePopupView(action: PopupConfigAction): PopupDataView | undefined {
  if (action.type !== REQUEST_POPUP_DATA) {
    return undefined;
  }
  if (!action.payload || typeof action.payload !== "object") {
    return undefined;
  }
  const view = (action.payload as { view?: PopupDataView }).view;
  return view === "popup" || view === "manage" ? view : undefined;
}

function updateBadge(feed: PopupFeedSnapshot | undefined) {
  const count = getPopupUpdateCount(feed);
  chrome.action.setBadgeText({ text: `${count === 0 ? "" : count}` });
}

function getPopupConfigErrorMessage(actionType: PopupConfigAction["type"]) {
  if (actionType === REQUEST_IMPORT_CONFIG) {
    return "匯入失敗，請確認設定檔格式後再試。";
  }
  if (actionType === REQUEST_RESET_CONFIG) {
    return "重置資料失敗，請稍後再試。";
  }
  if (actionType === REQUEST_EXPORT_CONFIG) {
    return "匯出失敗，請稍後再試。";
  }
  if (
    actionType === REQUEST_SET_LIBRARY_SYNC_ENABLED ||
    actionType === REQUEST_SYNC_LIBRARY_NOW
  ) {
    return "同步失敗，請稍後再試。";
  }
  return "目前無法載入書庫資料，請稍後再試。";
}

async function loadPopupViewData(view?: PopupDataView) {
  const [feed, extensionReleaseNotice, librarySyncStatus] = await Promise.all([
    getPopupFeedSnapshot(
      view === "popup" ? { updateLimit: POPUP_UPDATE_LIMIT } : {},
    ),
    getExtensionReleaseNotice().catch(() => null),
    getLibrarySyncStatus(),
  ]);

  return {
    feed,
    extensionReleaseNotice,
    librarySyncStatus,
  };
}

function createLoadedActions(
  input: {
    feed: PopupFeedSnapshot;
    extensionReleaseNotice: Awaited<ReturnType<typeof getExtensionReleaseNotice>> | null;
    librarySyncStatus: LibrarySyncStatus;
  },
  source: "load" | "import" | "reset",
) {
  return [
    hydratePopupFeed(input.feed, source),
    setExtensionReleaseNotice(input.extensionReleaseNotice),
    setLibrarySyncStatus(input.librarySyncStatus),
  ];
}

const popupConfigEpic: PopupEpic = (action$) =>
  (action$ as Observable<PopupConfigAction>).pipe(
    ofType(
      REQUEST_POPUP_DATA,
      REQUEST_IMPORT_CONFIG,
      REQUEST_RESET_CONFIG,
      REQUEST_EXPORT_CONFIG,
      REQUEST_SET_LIBRARY_SYNC_ENABLED,
      REQUEST_SYNC_LIBRARY_NOW,
    ),
    mergeMap((action) => {
      if (action.type === REQUEST_POPUP_DATA) {
        const view = resolvePopupView(action);
        return from(loadPopupViewData(view)).pipe(
          mergeMap((data) => createLoadedActions(data, "load")),
          catchError(() =>
            of(setPopupNotice(getPopupConfigErrorMessage(action.type))),
          ),
        );
      }

      if (action.type === REQUEST_IMPORT_CONFIG) {
        return from(importLibraryDump(action.payload || {})).pipe(
          mergeMap(() => from(pushLibrarySyncIfEnabled())),
          mergeMap(() =>
            from(loadPopupViewData()).pipe(
              mergeMap((data) => {
                const { feed } = data;
                updateBadge(feed);
                return createLoadedActions(data, "import");
              }),
            ),
          ),
          catchError(() =>
            of(setPopupNotice(getPopupConfigErrorMessage(action.type))),
          ),
        );
      }

      if (action.type === REQUEST_RESET_CONFIG) {
        return from(resetLibrary()).pipe(
          mergeMap(() => from(pushLibrarySyncIfEnabled())),
          mergeMap(() =>
            from(loadPopupViewData()).pipe(
              mergeMap((data) => {
                const { feed } = data;
                updateBadge(feed);
                return createLoadedActions(data, "reset");
              }),
            ),
          ),
          catchError(() =>
            of(setPopupNotice(getPopupConfigErrorMessage(action.type))),
          ),
        );
      }

      if (action.type === REQUEST_EXPORT_CONFIG) {
        return from(exportLibraryArchive()).pipe(
          mergeMap(({ blob, filename }) => {
            const url = window.URL.createObjectURL(blob);
            return [setExportConfig(url, filename)];
          }),
          catchError(() =>
            of(setPopupNotice(getPopupConfigErrorMessage(action.type))),
          ),
        );
      }

      if (action.type === REQUEST_SET_LIBRARY_SYNC_ENABLED) {
        const enabled = Boolean(
          action.payload &&
            typeof action.payload === "object" &&
            (action.payload as { enabled?: boolean }).enabled,
        );
        return from(setLibrarySyncEnabled(enabled)).pipe(
          mergeMap(() => from(enabled ? syncLibraryNow() : getLibrarySyncStatus())),
          mergeMap(() =>
            from(loadPopupViewData("manage")).pipe(
              mergeMap((data) => {
                updateBadge(data.feed);
                return createLoadedActions(data, "load");
              }),
            ),
          ),
          catchError(() =>
            of(setPopupNotice(getPopupConfigErrorMessage(action.type))),
          ),
        );
      }

      if (action.type === REQUEST_SYNC_LIBRARY_NOW) {
        return from(syncLibraryNow()).pipe(
          mergeMap(() =>
            from(loadPopupViewData("manage")).pipe(
              mergeMap((data) => {
                updateBadge(data.feed);
                return createLoadedActions(data, "load");
              }),
            ),
          ),
          catchError(() =>
            of(setPopupNotice(getPopupConfigErrorMessage(action.type))),
          ),
        );
      }

      return [];
    }),
  );

export default popupConfigEpic;
