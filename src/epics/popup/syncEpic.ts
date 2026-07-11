import {
  POPUP_UPDATE_LIMIT,
  type PopupDataView,
  REQUEST_POPUP_DATA,
} from "@domain/actions/popup";
import {
  hydratePopupFeed,
  setExtensionReleaseNotice,
  setPopupNotice,
} from "@domain/reducers/popupState";
import {
  getExtensionReleaseNotice,
  subscribeToExtensionReleaseState,
} from "@infra/services/extensionRelease";
import {
  getPopupFeedSnapshot,
  subscribeToLibrarySignal,
} from "@infra/services/library/popup";
import { ofType } from "redux-observable";
import { from, merge, Observable, of } from "rxjs";
import { catchError, exhaustMap, map, switchMap } from "rxjs/operators";

import { observeLibrarySignals } from "../librarySignal";
import type { PopupEpic } from "../types";

const POPUP_LOAD_ERROR_MESSAGE = "目前無法載入書庫資料，請稍後再試。";

function observeLibraryChanges(view?: PopupDataView) {
  return observeLibrarySignals(subscribeToLibrarySignal).pipe(
    switchMap(() =>
      from(
        getPopupFeedSnapshot(
          view === "popup" ? { updateLimit: POPUP_UPDATE_LIMIT } : {},
        ),
      ).pipe(
        map((feed) => hydratePopupFeed(feed, "load")),
        catchError(() => of(setPopupNotice(POPUP_LOAD_ERROR_MESSAGE))),
      ),
    ),
  );
}

function observeExtensionReleaseChanges() {
  return new Observable<ReturnType<typeof setExtensionReleaseNotice>>(
    (subscriber) => {
      const unsubscribe = subscribeToExtensionReleaseState(() => {
        getExtensionReleaseNotice()
          .then((notice) => {
            subscriber.next(setExtensionReleaseNotice(notice));
          })
          .catch(() => {
            subscriber.next(setExtensionReleaseNotice(null));
          });
      });
      return unsubscribe;
    },
  );
}

function resolvePopupView(action: { payload?: unknown }): PopupDataView | undefined {
  if (!action.payload || typeof action.payload !== "object") {
    return undefined;
  }
  const view = (action.payload as { view?: PopupDataView }).view;
  return view === "popup" || view === "manage" ? view : undefined;
}

const popupSyncEpic: PopupEpic = (action$) =>
  action$.pipe(
    ofType(REQUEST_POPUP_DATA),
    exhaustMap((action) =>
      merge(
        observeLibraryChanges(resolvePopupView(action as { payload?: unknown })),
        observeExtensionReleaseChanges(),
      ),
    ),
  );

export default popupSyncEpic;
