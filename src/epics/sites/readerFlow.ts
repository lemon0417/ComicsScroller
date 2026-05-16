import {
  FETCH_CHAPTER,
  FETCH_IMAGE_SRC,
  FETCH_IMG_LIST,
  fetchImgList,
  fetchImgSrc,
  UPDATE_READ,
} from "@domain/actions/reader";
import {
  clearPendingChapterGate,
  type ComicsChapterRecord,
  type ComicsImageSource,
  concatImageList,
  loadImgSrc,
  receivePendingChapterGate,
  setChapterLoadFailed,
  startPendingChapterGate,
  updateCanPreloadPreviousChapter,
  updateChapterLatestIndex,
  updateChapterList,
  updateChapterNowIndex,
  updateChapters,
  updateComicsID,
  updateReadChapters,
  updateSiteInfo,
  updateSubscribe,
  updateTitle,
} from "@domain/reducers/comics";
import {
  applyReaderSeriesState,
  applyReadProgress,
} from "@infra/services/library/reader";
import {
  type SiteKey,
  uniqueStrings,
} from "@infra/services/library/schema";
import type {
  FetchMetaOptions,
  SiteMeta,
  SiteMetaFetcher,
} from "@sites/types";
import findIndex from "lodash/findIndex";
import { ofType } from "redux-observable";
import { EMPTY, from, merge, type Observable, of } from "rxjs";
import {
  catchError,
  defaultIfEmpty,
  filter as rxFilter,
  finalize,
  map as rxMap,
  mergeMap,
} from "rxjs/operators";

import type { AppEpic, EpicAction } from "../types";

type ReaderChapterAction = {
  chapter: string;
};

type ReaderIndexAction = {
  index: number;
};

type ReaderRangeAction = {
  begin: number;
  end: number;
};

type ReaderChapterPayload = {
  chapterID: string;
  seriesID: string;
  comicUrl: string;
  imgList: ComicsImageSource[];
  canPreloadPreviousChapter?: boolean;
};

type ReaderFlowConfig = {
  site: SiteKey;
  baseURL: string;
  fetchChapterImages$: (
    chapterID: string,
  ) => Observable<ReaderChapterPayload>;
  fetchMeta$: SiteMetaFetcher;
  onMetaLoaded?: (payload: ReaderChapterPayload, meta: SiteMeta) => void;
  resolveFetchMetaOptions$?: (
    payload: ReaderChapterPayload,
  ) => Observable<FetchMetaOptions>;
};

export function normalizeReaderSiteMeta(meta: SiteMeta): SiteMeta {
  const chapterList = uniqueStrings(meta.chapterList);
  if (chapterList.length === meta.chapterList.length) {
    return meta;
  }
  return {
    ...meta,
    chapterList,
  };
}

export function getRequestedImageIds(input: {
  begin: number;
  end: number;
  result: number[];
}) {
  const { begin, end, result } = input;
  if (result.length === 0) {
    return [];
  }

  const startIndex = Math.max(0, begin);
  const endIndex = Math.min(result.length - 1, end);
  if (startIndex > endIndex) {
    return [];
  }

  const requestedIds: number[] = [];
  for (let index = startIndex; index <= endIndex; index += 1) {
    const imageId = result[index];
    if (typeof imageId === "number") {
      requestedIds.push(imageId);
    }
  }
  return requestedIds;
}

function hasLoadedChapter(input: {
  imageList: {
    result: number[];
    entity: Record<number, { chapter?: string }>;
  };
  chapterID: string;
}) {
  const { imageList, chapterID } = input;
  if (!chapterID) {
    return false;
  }

  return imageList.result.some(
    (imageIndex) => imageList.entity[imageIndex]?.chapter === chapterID,
  );
}

function getCanPreloadPreviousChapter(payload: ReaderChapterPayload) {
  return payload.canPreloadPreviousChapter !== false;
}

function getTailChapterID(input: {
  imageList: {
    result: number[];
    entity: Record<number, { chapter?: string }>;
  };
}) {
  const tailImageID = input.imageList.result[input.imageList.result.length - 1];
  return typeof tailImageID === "number"
    ? input.imageList.entity[tailImageID]?.chapter || ""
    : "";
}

function toReaderChapterTitles(
  chapters: SiteMeta["chapters"],
): Record<string, ComicsChapterRecord> {
  return Object.entries(chapters || {}).reduce<Record<string, ComicsChapterRecord>>(
    (acc, [chapterID, chapter]) => {
      if (!chapterID) {
        return acc;
      }
      acc[chapterID] = {
        title: chapter?.title || "",
      };
      return acc;
    },
    {},
  );
}

function buildInitialChapterActions(payload: ReaderChapterPayload): EpicAction[] {
  return [
    updateComicsID(payload.seriesID),
    concatImageList(payload.imgList),
    fetchImgSrc(0, 6),
  ];
}

function buildMetadataActions(input: {
  site: SiteKey;
  baseURL: string;
  payload: ReaderChapterPayload;
  meta: SiteMeta;
  seriesRead: string[];
  subscribed: boolean;
}) {
  const { site, baseURL, payload, meta, seriesRead, subscribed } = input;
  const canPreloadPreviousChapter = getCanPreloadPreviousChapter(payload);
  const chapterIndex = findIndex(
    meta.chapterList,
    (item) => item === payload.chapterID,
  );
  const actions: EpicAction[] = [
    updateSiteInfo(site, baseURL),
    updateComicsID(payload.seriesID),
    updateSubscribe(subscribed),
    updateTitle(meta.title || ""),
    updateReadChapters(seriesRead),
    updateChapters(toReaderChapterTitles(meta.chapters)),
    updateChapterList(meta.chapterList),
    updateChapterNowIndex(chapterIndex),
    updateCanPreloadPreviousChapter(canPreloadPreviousChapter),
  ];

  if (chapterIndex > 0 && canPreloadPreviousChapter) {
    actions.push(
      fetchImgList(chapterIndex - 1),
      updateChapterLatestIndex(chapterIndex - 1),
    );
    return actions;
  }

  actions.push(updateChapterLatestIndex(chapterIndex - 1));
  return actions;
}

export function createDirectFetchImgSrcEpic(): AppEpic {
  return (action$, state$) =>
    action$.pipe(
      ofType(FETCH_IMAGE_SRC),
      mergeMap((action) => {
        const { begin, end } = action as ReaderRangeAction;
        const { result, entity } = state$.value.comics.imageList;
        return from(getRequestedImageIds({ begin, end, result })).pipe(
          rxFilter(
            (item) =>
              entity[item].loading &&
              entity[item].type !== "end",
          ),
          rxMap((id) => loadImgSrc(entity[id].requestSrc, id)),
        );
      }),
    );
}

export function createFetchImgListEpic(
  fetchChapterImages$: ReaderFlowConfig["fetchChapterImages$"],
): AppEpic {
  const inFlightChapterRequests = new Set<string>();

  return (action$, state$) =>
    action$.pipe(
      ofType(FETCH_IMG_LIST),
      mergeMap((action) => {
        const { index } = action as ReaderIndexAction;
        const {
          chapterList,
          imageList,
          pendingChapterGate,
        } = state$.value.comics;
        const chapterID = String(chapterList[index] || "");
        const hasExistingImages = imageList.result.length > 0;
        const blockingChapterId = hasExistingImages
          ? getTailChapterID({ imageList })
          : "";
        const pendingGate =
          hasExistingImages && blockingChapterId
            ? {
                blockingChapterId,
                chapterId: chapterID,
                chapterIndex: index,
                status: "fetching" as const,
              }
            : null;

        if (
          !chapterID ||
          pendingChapterGate ||
          inFlightChapterRequests.has(chapterID) ||
          hasLoadedChapter({ imageList, chapterID })
        ) {
          return EMPTY;
        }

        const fetchChapterImagesResult$ = fetchChapterImages$(chapterID).pipe(
          mergeMap((payload) => {
            const latestComics = state$.value.comics;
            const latestImageList = latestComics.imageList;
            if (
              hasLoadedChapter({
                imageList: latestImageList,
                chapterID: payload.chapterID,
              })
            ) {
              return pendingGate ? [clearPendingChapterGate()] : [];
            }

            if (!pendingGate) {
              const actions: EpicAction[] = [
                concatImageList(payload.imgList),
                updateCanPreloadPreviousChapter(
                  getCanPreloadPreviousChapter(payload),
                ),
              ];
              if (latestImageList.result.length === 0) {
                return [...actions, fetchImgSrc(0, 6)];
              }
              return actions;
            }

            return [
              receivePendingChapterGate({
                ...pendingGate,
                canPreloadPreviousChapter:
                  getCanPreloadPreviousChapter(payload),
                imgList: payload.imgList,
                status: "queued",
              }),
            ];
          }),
          catchError(() => (pendingGate ? of(clearPendingChapterGate()) : EMPTY)),
          finalize(() => {
            inFlightChapterRequests.delete(chapterID);
          }),
        );
        const fetchChapterImagesWithGate$: Observable<EpicAction> = pendingGate
          ? fetchChapterImagesResult$.pipe(
              defaultIfEmpty(clearPendingChapterGate()),
            )
          : fetchChapterImagesResult$;

        inFlightChapterRequests.add(chapterID);
        if (!pendingGate) {
          return fetchChapterImagesWithGate$;
        }

        return merge(
          of(startPendingChapterGate(pendingGate)),
          fetchChapterImagesWithGate$,
        );
      }),
    );
}

export function createFetchChapterEpic(config: ReaderFlowConfig): AppEpic {
  const resolveFetchMetaOptions$ =
    config.resolveFetchMetaOptions$ || (() => of({}));

  return (action$) =>
    action$.pipe(
      ofType(FETCH_CHAPTER),
      mergeMap((action) => {
        const { chapter: chapterID } = action as ReaderChapterAction;
        return config.fetchChapterImages$(chapterID).pipe(
          mergeMap((payload) =>
            merge(
              of(...buildInitialChapterActions(payload)),
              resolveFetchMetaOptions$(payload).pipe(
                mergeMap((fetchMetaOptions) =>
                  config.fetchMeta$(payload.comicUrl, fetchMetaOptions),
                ),
                mergeMap((rawMeta) => {
                  const meta = normalizeReaderSiteMeta(rawMeta);
                  config.onMetaLoaded?.(payload, meta);
                  return from(
                    applyReaderSeriesState(
                      config.site,
                      payload.seriesID,
                      {
                        title: meta.title || "",
                        chapters: meta.chapters,
                        chapterList: meta.chapterList,
                        cover: meta.cover,
                        url: payload.comicUrl,
                      },
                      payload.chapterID,
                    ),
                  ).pipe(
                    mergeMap(({ series, subscribed, updatesCount }) => {
                      chrome.action.setBadgeText({
                        text: `${updatesCount === 0 ? "" : updatesCount}`,
                      });
                      return buildMetadataActions({
                        site: config.site,
                        baseURL: config.baseURL,
                        payload,
                        meta,
                        seriesRead: series?.read || [],
                        subscribed,
                      });
                    }),
                  );
                }),
              ),
            ),
          ),
          defaultIfEmpty(setChapterLoadFailed()),
        );
      }),
    );
}

export function createUpdateReadEpic(site: SiteKey): AppEpic {
  return (action$, state$) =>
    action$.pipe(
      ofType(UPDATE_READ),
      mergeMap((action) => {
        const { index } = action as ReaderIndexAction;
        const { comicsID, chapterList } = state$.value.comics;

        return from(applyReadProgress(site, comicsID, chapterList[index])).pipe(
          mergeMap(({ series, updatesCount }) => {
            chrome.action.setBadgeText({
              text: `${updatesCount === 0 ? "" : updatesCount}`,
            });
            return [
              updateReadChapters(series?.read || []),
              updateChapterNowIndex(index),
            ];
          }),
        );
      }),
    );
}
