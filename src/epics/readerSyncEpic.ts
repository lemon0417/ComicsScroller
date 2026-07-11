import { updateSubscribe } from "@domain/reducers/comics";
import {
  getReaderSeriesSyncState,
  subscribeToLibrarySignal,
} from "@infra/services/library/reader";
import { devLog } from "@utils/devLog";
import { closeCurrentTab } from "@utils/navigation";
import { EMPTY, from, of } from "rxjs";
import { catchError, filter, map, switchMap } from "rxjs/operators";

import { observeLibrarySignals } from "./librarySignal";
import type { AppEpic } from "./types";

type ReaderLibrarySignal = Parameters<
  Parameters<typeof subscribeToLibrarySignal>[0]
>[0];

export function isReaderLibrarySignalRelevant(
  signal: ReaderLibrarySignal,
  seriesKey: string,
) {
  if (!seriesKey || !signal || !Array.isArray(signal.scopes)) {
    return false;
  }

  const seriesKeys = Array.isArray(signal.seriesKeys) ? signal.seriesKeys : [];
  return (
    seriesKeys.length === 0 ||
    seriesKeys.includes(seriesKey) ||
    signal.scopes.includes("subscriptions")
  );
}

const readerSyncEpic: AppEpic = (_action$, state$) =>
  observeLibrarySignals(subscribeToLibrarySignal).pipe(
    map((signal) => ({
      signal,
      seriesKey: String(state$.value.comics.seriesKey || ""),
    })),
    filter(({ signal, seriesKey }) =>
      isReaderLibrarySignalRelevant(signal, seriesKey),
    ),
    switchMap(({ seriesKey }) =>
      from(getReaderSeriesSyncState(seriesKey)).pipe(
        switchMap(({ exists, subscribed }) => {
          if (state$.value.comics.seriesKey !== seriesKey) {
            return EMPTY;
          }
          if (exists) {
            return of(updateSubscribe(subscribed));
          }
          return from(closeCurrentTab()).pipe(
            catchError((error: unknown) => {
              devLog("reader:close-missing-series-failed", error);
              return EMPTY;
            }),
            switchMap(() => EMPTY),
          );
        }),
        catchError((error: unknown) => {
          devLog("reader:library-sync-failed", error);
          return EMPTY;
        }),
      ),
    ),
  );

export default readerSyncEpic;
