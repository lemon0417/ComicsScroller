import {
  FETCH_CHAPTER,
  IMAGE_LOAD_FAILED,
  type ReaderImageFailureStage,
  RETRY_IMAGE,
} from "@domain/actions/reader";
import { buildSeriesKey } from "@domain/library";
import { READER_IMAGE_GAP } from "@domain/utils/readerLayout";
import reduce from "lodash/reduce";

export type ComicsChapterRecord = {
  title: string;
};

export type ComicsImageType = "end" | "image" | "natural" | "paywall" | "wide";

export type ComicsImageSource = {
  chapter: string;
  href?: string;
  src: string;
  cid?: string;
  key?: string;
  type?: ComicsImageType;
};

export type ComicsImageRecord = ComicsImageSource & {
  autoRetryCount: number;
  height: number;
  loadError: ReaderImageFailureStage | null;
  loading: boolean;
  naturalHeight: number;
  naturalWidth: number;
  requestSrc: string;
  type: ComicsImageType;
};

export type PendingChapterGateStatus = "fetching" | "queued";

export type PendingChapterGateRecord = {
  blockingChapterId: string;
  chapterId: string;
  chapterIndex: number;
  status: PendingChapterGateStatus;
  imgList?: ComicsImageSource[];
  canPreloadPreviousChapter?: boolean;
};

export type LeadingEvictionRestoreRecord = {
  sequence: number;
  firstRetainedImageId: number;
  removedScrollHeight: number;
};

export type ComicsState = {
  innerHeight: number;
  innerWidth: number;
  site: string;
  seriesKey: string;
  comicsID: string;
  title: string;
  currentChapterTitle: string;
  chapterLatestIndex: number;
  chapterNowIndex: number;
  canPreloadPreviousChapter: boolean;
  baseURL: string;
  subscribe: boolean;
  chapterLoadStatus: "failed" | "idle" | "loading" | "ready";
  chapters: Record<string, ComicsChapterRecord>;
  chapterList: string[];
  requestedChapter: string;
  readyChapters: Record<string, true>;
  pendingChapterGate: PendingChapterGateRecord | null;
  leadingEvictionRestore: LeadingEvictionRestoreRecord | null;
  leadingEvictionRestoreSequence: number;
  read: string[];
  renderBeginIndex: number;
  renderEndIndex: number;
  imageList: {
    result: number[];
    entity: Record<number, ComicsImageRecord>;
  };
};

type Action = {
  type: string;
  src?: string;
  data?:
    | boolean
    | number
    | string
    | string[]
    | ComicsImageSource[]
    | Record<string, ComicsChapterRecord>;
  index?: number;
  begin?: number;
  end?: number;
  height?: number;
  innerHeight?: number;
  innerWidth?: number;
  imgType?: ComicsImageType;
  naturalWidth?: number;
  naturalHeight?: number;
  baseURL?: string;
  chapter?: string;
  site?: string;
  stage?: ReaderImageFailureStage;
  gate?: PendingChapterGateRecord;
};

export const MAX_IMAGE_AUTO_RETRY_COUNT = 2;

const initialState: ComicsState = {
  innerHeight: typeof window === "undefined" ? 0 : window.innerHeight,
  innerWidth: typeof window === "undefined" ? 0 : window.innerWidth,
  site: "",
  seriesKey: "",
  comicsID: "",
  title: "",
  currentChapterTitle: "",
  chapterLatestIndex: 0,
  chapterNowIndex: 0,
  canPreloadPreviousChapter: true,
  baseURL: "",
  subscribe: false,
  chapterLoadStatus: "idle",
  chapters: {},
  chapterList: [],
  requestedChapter: "",
  readyChapters: {},
  pendingChapterGate: null,
  leadingEvictionRestore: null,
  leadingEvictionRestoreSequence: 0,
  read: [],
  renderBeginIndex: 0,
  renderEndIndex: 0,
  imageList: {
    result: [],
    entity: {},
  },
};

const UPDATE_COMICS_ID = "UPDATE_COMICS_ID";
const UPDATE_SUBSCRIBE = "UPDATE_SUBSCRIBE";
const UPDATE_TITLE = "UPDATE_TITLE";
const UPDATE_CHAPTERS = "UPDATE_CHAPTERS";
const UPDATE_CHAPTER_LIST = "UPDATE_CHAPTER_LIST";
const UPDATE_CHAPTER_LATEST_INDEX = "UPDATE_CHAPTER_LATEST_INDEX";
export const UPDATE_CHAPTER_NOW_INDEX = "UPDATE_CHAPTER_NOW_INDEX";
const UPDATE_CAN_PRELOAD_PREVIOUS_CHAPTER =
  "UPDATE_CAN_PRELOAD_PREVIOUS_CHAPTER";
const UPDATE_RENDER_INDEX = "UPDATE_RENDER_INDEX";
const UPDATE_READ_CHAPTERS = "UPDATE_READ_CHAPTERS";
const CONCAT_IMAGE_LIST = "CONCAT_IMAGE_LIST";
const LOAD_IMAGE_SRC = "LOAD_IMAGE_SRC";
export const UPDATE_IMAGE_TYPE = "UPDATE_IMAGE_TYPE";
const UPDATE_INNER_HEIGHT = "UPDATE_INNER_HEIGHT";
const UPDATE_INNER_WIDTH = "UPDATE_INNER_WIDTH";
const RESET_IMAGE = "RESET_IMAGE";
const SET_CHAPTER_LOAD_FAILED = "SET_CHAPTER_LOAD_FAILED";
const EVICT_LEADING_IMAGE_CHAPTERS = "EVICT_LEADING_IMAGE_CHAPTERS";
const UPDATE_SITE_INFO = "UPDATE_SITE_INFO";
const START_PENDING_CHAPTER_GATE = "START_PENDING_CHAPTER_GATE";
const RECEIVE_PENDING_CHAPTER_GATE = "RECEIVE_PENDING_CHAPTER_GATE";
const APPEND_PENDING_CHAPTER_GATE = "APPEND_PENDING_CHAPTER_GATE";
const CLEAR_PENDING_CHAPTER_GATE = "CLEAR_PENDING_CHAPTER_GATE";
const CLEAR_LEADING_EVICTION_RESTORE = "CLEAR_LEADING_EVICTION_RESTORE";

function createFallbackImageRecord(chapter = ""): ComicsImageRecord {
  return {
    autoRetryCount: 0,
    chapter,
    loadError: null,
    requestSrc: "",
    src: "",
    height: 1400,
    loading: false,
    naturalHeight: 0,
    naturalWidth: 0,
    type: "image",
  };
}

function resolveCurrentChapterTitle(input: {
  chapterList: string[];
  chapters: Record<string, ComicsChapterRecord>;
  chapterNowIndex: number;
}) {
  const chapterID = input.chapterList[input.chapterNowIndex];
  return chapterID ? input.chapters[chapterID]?.title || "" : "";
}

function buildChapterIndexMap(chapterList: string[]) {
  return chapterList.reduce<Record<string, number>>((acc, chapterID, index) => {
    if (chapterID) {
      acc[chapterID] = index;
    }
    return acc;
  }, {});
}

function appendImageListToState(
  state: ComicsState,
  data: ComicsImageSource[],
): ComicsState {
  if (data.length === 0) {
    return state;
  }

  const imageStartIndex = state.imageList.result.length;
  return syncReadyChaptersForAppendedImages({
    ...state,
    chapterLoadStatus: "ready",
    imageList: {
      ...state.imageList,
      result: [
        ...state.imageList.result,
        ...Array.from({ length: data.length }, (_v, k) => k + imageStartIndex),
        data.length + imageStartIndex,
      ],
      entity: {
        ...reduce(
          data,
          (acc, item, k) => ({
            ...acc,
            [imageStartIndex + k]: {
              ...item,
              autoRetryCount: 0,
              loading: item.type !== "paywall",
              height: item.type === "paywall" ? 320 : 1400,
              loadError: null,
              requestSrc: item.src,
              type: item.type || "image",
              naturalWidth: 0,
              naturalHeight: 0,
            },
          }),
          state.imageList.entity,
        ) as Record<number, ComicsImageRecord>,
        [data.length + imageStartIndex]: {
          autoRetryCount: 0,
          type: "end",
          chapter: data[0].chapter,
          loadError: null,
          requestSrc: "",
          src: "",
          loading: false,
          height: 72,
          naturalWidth: 0,
          naturalHeight: 0,
        },
      },
    },
  });
}

function canAppendPendingChapter(
  state: ComicsState,
  gate: PendingChapterGateRecord | null,
) {
  return Boolean(
    gate &&
      gate.status === "queued" &&
      gate.imgList?.length &&
      state.readyChapters[gate.blockingChapterId],
  );
}

function isReadableChapterImage(record: ComicsImageRecord) {
  return record.type !== "end" && record.type !== "paywall";
}

function isSettledReadableChapterImage(record: ComicsImageRecord) {
  return Boolean(record.naturalHeight > 0 || record.loadError);
}

function isChapterReady(
  imageList: ComicsState["imageList"],
  chapterID: string,
) {
  if (!chapterID) {
    return false;
  }

  let hasChapterRecord = false;
  let tailReadableRecord: ComicsImageRecord | null = null;
  for (const imageID of imageList.result) {
    const record = imageList.entity[imageID];
    if (!record || record.chapter !== chapterID) {
      continue;
    }

    hasChapterRecord = true;
    if (isReadableChapterImage(record)) {
      tailReadableRecord = record;
    }
  }

  if (!hasChapterRecord) {
    return false;
  }
  if (!tailReadableRecord) {
    return true;
  }
  return isSettledReadableChapterImage(tailReadableRecord);
}

function syncReadyChapter(
  readyChapters: ComicsState["readyChapters"],
  imageList: ComicsState["imageList"],
  chapterID: string,
) {
  if (!chapterID) {
    return readyChapters;
  }

  const isReady = isChapterReady(imageList, chapterID);
  if (isReady) {
    if (readyChapters[chapterID]) {
      return readyChapters;
    }
    const nextReadyChapters: ComicsState["readyChapters"] = {
      ...readyChapters,
    };
    nextReadyChapters[chapterID] = true;
    return nextReadyChapters;
  }

  if (!readyChapters[chapterID]) {
    return readyChapters;
  }

  const nextReadyChapters = { ...readyChapters };
  delete nextReadyChapters[chapterID];
  return nextReadyChapters;
}

function syncReadyChaptersForAppendedImages(state: ComicsState) {
  const chapterIDs: string[] = [];
  for (const imageID of state.imageList.result) {
    const chapterID = state.imageList.entity[imageID]?.chapter;
    if (chapterID && !chapterIDs.includes(chapterID)) {
      chapterIDs.push(chapterID);
    }
  }

  let readyChapters = state.readyChapters;
  for (let index = 0; index < chapterIDs.length; index += 1) {
    const chapterID = chapterIDs[index];
    readyChapters = syncReadyChapter(
      readyChapters,
      state.imageList,
      chapterID,
    );
  }

  return readyChapters === state.readyChapters
    ? state
    : {
        ...state,
        readyChapters,
      };
}

function getReaderImageRowHeight(record?: ComicsImageRecord) {
  return Math.max(0, record?.height || 0) + READER_IMAGE_GAP * 2;
}

function appendPendingChapterToState(state: ComicsState): ComicsState {
  const gate = state.pendingChapterGate;
  if (!canAppendPendingChapter(state, gate) || !gate?.imgList) {
    return state;
  }

  const nextState = appendImageListToState(
    {
      ...state,
      pendingChapterGate: null,
    },
    gate.imgList,
  );

  return {
    ...nextState,
    canPreloadPreviousChapter: gate.canPreloadPreviousChapter !== false,
  };
}

export default function comics(
  state: ComicsState = initialState,
  action: Action,
): ComicsState {
  switch (action.type) {
    case FETCH_CHAPTER:
      return {
        ...state,
        chapterLoadStatus: "loading",
        readyChapters: {},
        pendingChapterGate: null,
        leadingEvictionRestore: null,
        leadingEvictionRestoreSequence: 0,
        requestedChapter:
          typeof action.chapter === "string"
            ? action.chapter
            : state.requestedChapter,
      };
    case LOAD_IMAGE_SRC:
      if (typeof action.index === "number" && action.index >= 0) {
        const currentRecord =
          state.imageList.entity[action.index] || createFallbackImageRecord();
        return {
          ...state,
          imageList: {
            ...state.imageList,
            entity: {
              ...state.imageList.entity,
              [action.index]: {
                ...currentRecord,
                src: action.src || "",
                loading: false,
              },
            },
          },
        };
      }
      return state;
    case UPDATE_IMAGE_TYPE:
      if (typeof action.index === "number" && action.index >= 0) {
        const currentRecord =
          state.imageList.entity[action.index] || createFallbackImageRecord();
        const nextImageList = {
          ...state.imageList,
          entity: {
            ...state.imageList.entity,
            [action.index]: {
              ...currentRecord,
              autoRetryCount: 0,
              height:
                typeof action.height === "number"
                  ? action.height
                  : currentRecord.height,
              loadError: null,
              type: action.imgType || currentRecord.type,
              naturalWidth:
                typeof action.naturalWidth === "number"
                  ? action.naturalWidth
                  : currentRecord.naturalWidth,
              naturalHeight:
                typeof action.naturalHeight === "number"
                  ? action.naturalHeight
                  : currentRecord.naturalHeight,
            },
          },
        };
        return {
          ...state,
          readyChapters: syncReadyChapter(
            state.readyChapters,
            nextImageList,
            currentRecord.chapter,
          ),
          imageList: nextImageList,
        };
      }
      return state;
    case CONCAT_IMAGE_LIST:
      if (Array.isArray(action.data) && action.data.length > 0) {
        return appendImageListToState(state, action.data as ComicsImageSource[]);
      }
      return state;
    case START_PENDING_CHAPTER_GATE:
      return {
        ...state,
        pendingChapterGate: action.gate || null,
      };
    case RECEIVE_PENDING_CHAPTER_GATE:
      if (!action.gate) {
        return state;
      }
      if (
        state.readyChapters[action.gate.blockingChapterId] &&
        action.gate.imgList?.length
      ) {
        return appendImageListToState(
          {
            ...state,
            canPreloadPreviousChapter:
              action.gate.canPreloadPreviousChapter !== false,
            pendingChapterGate: null,
          },
          action.gate.imgList,
        );
      }
      return {
        ...state,
        pendingChapterGate: action.gate,
      };
    case APPEND_PENDING_CHAPTER_GATE:
      return appendPendingChapterToState(state);
    case CLEAR_PENDING_CHAPTER_GATE:
      return {
        ...state,
        pendingChapterGate: null,
      };
    case IMAGE_LOAD_FAILED: {
      if (typeof action.index !== "number" || action.index < 0) {
        return state;
      }
      if (!action.stage) {
        return state;
      }
      const currentRecord = state.imageList.entity[action.index];
      if (
        !currentRecord ||
        currentRecord.type === "end" ||
        currentRecord.type === "paywall"
      ) {
        return state;
      }
      if (currentRecord.autoRetryCount < MAX_IMAGE_AUTO_RETRY_COUNT) {
        const nextImageList = {
          ...state.imageList,
          entity: {
            ...state.imageList.entity,
            [action.index]: {
              ...currentRecord,
              autoRetryCount: currentRecord.autoRetryCount + 1,
              loadError: null,
              loading: true,
              src: currentRecord.requestSrc,
            },
          },
        };
        return {
          ...state,
          readyChapters: syncReadyChapter(
            state.readyChapters,
            nextImageList,
            currentRecord.chapter,
          ),
          imageList: nextImageList,
        };
      }
      const nextImageList = {
        ...state.imageList,
        entity: {
          ...state.imageList.entity,
          [action.index]: {
            ...currentRecord,
            loadError: action.stage,
            loading: false,
            src: currentRecord.requestSrc,
          },
        },
      };
      return {
        ...state,
        readyChapters: syncReadyChapter(
          state.readyChapters,
          nextImageList,
          currentRecord.chapter,
        ),
        imageList: nextImageList,
      };
    }
    case RETRY_IMAGE: {
      if (typeof action.index !== "number" || action.index < 0) {
        return state;
      }
      if (!state.imageList.entity[action.index]) {
        return state;
      }
      const currentRecord = state.imageList.entity[action.index];
      const nextImageList = {
        ...state.imageList,
        entity: {
          ...state.imageList.entity,
          [action.index]: {
            ...currentRecord,
            autoRetryCount: 0,
            loadError: null,
            loading: true,
            src: currentRecord.requestSrc,
          },
        },
      };
      return {
        ...state,
        readyChapters: syncReadyChapter(
          state.readyChapters,
          nextImageList,
          currentRecord.chapter,
        ),
        imageList: nextImageList,
      };
    }
    case UPDATE_CHAPTER_LATEST_INDEX:
      if (typeof action.data !== "number") return state;
      return {
        ...state,
        chapterLatestIndex: action.data,
      };
    case UPDATE_CHAPTER_NOW_INDEX: {
      if (typeof action.data !== "number") return state;
      const chapterNowIndex = action.data;
      return {
        ...state,
        chapterNowIndex,
        currentChapterTitle: resolveCurrentChapterTitle({
          chapterList: state.chapterList,
          chapters: state.chapters,
          chapterNowIndex,
        }),
      };
    }
    case UPDATE_CAN_PRELOAD_PREVIOUS_CHAPTER:
      if (typeof action.data !== "boolean") return state;
      return {
        ...state,
        canPreloadPreviousChapter: action.data,
      };
    case UPDATE_RENDER_INDEX:
      return {
        ...state,
        renderBeginIndex:
          typeof action.begin === "number"
            ? action.begin
            : state.renderBeginIndex,
        renderEndIndex:
          typeof action.end === "number" ? action.end : state.renderEndIndex,
      };
    case UPDATE_READ_CHAPTERS:
      if (!Array.isArray(action.data)) return state;
      return {
        ...state,
        read: action.data as string[],
      };
    case UPDATE_CHAPTERS: {
      if (!action.data || typeof action.data !== "object" || Array.isArray(action.data)) {
        return state;
      }
      const chapters = action.data as Record<string, ComicsChapterRecord>;
      return {
        ...state,
        chapters,
        currentChapterTitle: resolveCurrentChapterTitle({
          chapterList: state.chapterList,
          chapters,
          chapterNowIndex: state.chapterNowIndex,
        }),
      };
    }
    case UPDATE_CHAPTER_LIST: {
      if (!Array.isArray(action.data)) return state;
      const chapterList = action.data as string[];
      return {
        ...state,
        chapterList,
        currentChapterTitle: resolveCurrentChapterTitle({
          chapterList,
          chapters: state.chapters,
          chapterNowIndex: state.chapterNowIndex,
        }),
      };
    }
    case UPDATE_COMICS_ID:
      if (typeof action.data !== "string") return state;
      return {
        ...state,
        comicsID: action.data,
        seriesKey:
          state.site && typeof action.data === "string"
            ? buildSeriesKey(state.site, action.data)
            : "",
      };
    case UPDATE_SUBSCRIBE:
      if (typeof action.data !== "boolean") return state;
      return {
        ...state,
        subscribe: action.data,
      };
    case UPDATE_TITLE:
      if (typeof action.data !== "string") return state;
      return {
        ...state,
        title: action.data,
      };
    case SET_CHAPTER_LOAD_FAILED:
      return {
        ...state,
        chapterLoadStatus: "failed",
      };
    case EVICT_LEADING_IMAGE_CHAPTERS: {
      if (typeof action.data !== "number" || state.imageList.result.length === 0) {
        return state;
      }

      const chapterIndexMap = buildChapterIndexMap(state.chapterList);
      const headImageID = state.imageList.result[0];
      const headChapterID = state.imageList.entity[headImageID]?.chapter || "";
      const headChapterIndex = chapterIndexMap[headChapterID];
      if (
        typeof headChapterIndex !== "number" ||
        headChapterIndex <= action.data
      ) {
        return state;
      }

      let removeCount = 0;
      while (removeCount < state.imageList.result.length) {
        const imageID = state.imageList.result[removeCount];
        if (state.imageList.entity[imageID]?.chapter !== headChapterID) {
          break;
        }
        removeCount += 1;
      }

      if (removeCount <= 0) {
        return state;
      }

      const nextResult = state.imageList.result.slice(removeCount);
      const nextEntity = { ...state.imageList.entity };
      let removedScrollHeight = 0;
      for (let index = 0; index < removeCount; index += 1) {
        const imageID = state.imageList.result[index];
        removedScrollHeight += getReaderImageRowHeight(nextEntity[imageID]);
        delete nextEntity[imageID];
      }
      const firstRetainedImageId = nextResult[0];
      const nextRestoreSequence = state.leadingEvictionRestoreSequence + 1;

      return {
        ...state,
        leadingEvictionRestoreSequence: nextRestoreSequence,
        leadingEvictionRestore:
          typeof firstRetainedImageId === "number" && removedScrollHeight > 0
            ? {
                sequence: nextRestoreSequence,
                firstRetainedImageId,
                removedScrollHeight,
              }
            : null,
        imageList: {
          result: nextResult,
          entity: nextEntity,
        },
      };
    }
    case CLEAR_LEADING_EVICTION_RESTORE:
      if (
        typeof action.data !== "number" ||
        state.leadingEvictionRestore?.sequence !== action.data
      ) {
        return state;
      }
      return {
        ...state,
        leadingEvictionRestore: null,
      };
    case RESET_IMAGE:
      return {
        ...state,
        readyChapters: {},
        pendingChapterGate: null,
        leadingEvictionRestore: null,
        leadingEvictionRestoreSequence: 0,
        imageList: {
          result: [],
          entity: {},
        },
      };
    case UPDATE_INNER_HEIGHT:
      return {
        ...state,
        innerHeight:
          typeof action.innerHeight === "number"
            ? action.innerHeight
            : state.innerHeight,
      };
    case UPDATE_INNER_WIDTH:
      return {
        ...state,
        innerWidth:
          typeof action.innerWidth === "number"
            ? action.innerWidth
            : state.innerWidth,
      };
    case UPDATE_SITE_INFO:
      return {
        ...state,
        site: typeof action.site === "string" ? action.site : state.site,
        seriesKey:
          typeof action.site === "string" && state.comicsID
            ? buildSeriesKey(action.site, state.comicsID)
            : "",
        baseURL:
          typeof action.baseURL === "string" ? action.baseURL : state.baseURL,
      };
    default:
      return state;
  }
}

export function updateTitle(data: string) {
  return { type: UPDATE_TITLE, data };
}

export function updateComicsID(data: string) {
  return { type: UPDATE_COMICS_ID, data };
}

export function updateSubscribe(data: boolean) {
  return { type: UPDATE_SUBSCRIBE, data };
}

export function updateReadChapters(data: string[]) {
  return { type: UPDATE_READ_CHAPTERS, data };
}

export function updateChapters(data: Record<string, ComicsChapterRecord>) {
  return { type: UPDATE_CHAPTERS, data };
}

export function updateChapterList(data: string[]) {
  return { type: UPDATE_CHAPTER_LIST, data };
}

export function updateChapterLatestIndex(data: number) {
  return { type: UPDATE_CHAPTER_LATEST_INDEX, data };
}

export function updateChapterNowIndex(data: number) {
  return { type: UPDATE_CHAPTER_NOW_INDEX, data };
}

export function updateCanPreloadPreviousChapter(data: boolean) {
  return { type: UPDATE_CAN_PRELOAD_PREVIOUS_CHAPTER, data };
}

export function concatImageList(data: ComicsImageSource[]) {
  return { type: CONCAT_IMAGE_LIST, data };
}

export function loadImgSrc(src: string, index: number) {
  return { type: LOAD_IMAGE_SRC, src, index };
}

export function updateImgType(
  height: number,
  index: number,
  imgType: ComicsImageType,
  naturalWidth?: number,
  naturalHeight?: number,
) {
  return {
    type: UPDATE_IMAGE_TYPE,
    height,
    index,
    imgType,
    naturalWidth,
    naturalHeight,
  };
}

export function resetImg() {
  return { type: RESET_IMAGE };
}

export function updateInnerHeight(innerHeight: number) {
  return { type: UPDATE_INNER_HEIGHT, innerHeight };
}

export function updateInnerWidth(innerWidth: number) {
  return { type: UPDATE_INNER_WIDTH, innerWidth };
}

export function updateSiteInfo(site: string, baseURL: string) {
  return { type: UPDATE_SITE_INFO, site, baseURL };
}

export function setChapterLoadFailed() {
  return { type: SET_CHAPTER_LOAD_FAILED };
}

export function evictLeadingImageChapters(data: number) {
  return { type: EVICT_LEADING_IMAGE_CHAPTERS, data };
}

export function startPendingChapterGate(gate: PendingChapterGateRecord) {
  return { type: START_PENDING_CHAPTER_GATE, gate };
}

export function receivePendingChapterGate(gate: PendingChapterGateRecord) {
  return { type: RECEIVE_PENDING_CHAPTER_GATE, gate };
}

export function appendPendingChapterGate() {
  return { type: APPEND_PENDING_CHAPTER_GATE };
}

export function clearPendingChapterGate() {
  return { type: CLEAR_PENDING_CHAPTER_GATE };
}

export function clearLeadingEvictionRestore(sequence: number) {
  return { type: CLEAR_LEADING_EVICTION_RESTORE, data: sequence };
}
