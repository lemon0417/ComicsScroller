import ConnectedComicImage from "@components/ComicImage";
import Loading from "@components/Loading";
import { fetchChapter, updateVisibleImageRange } from "@domain/actions/reader";
import {
  clearLeadingEvictionRestore,
  type ComicsState,
} from "@domain/reducers/comics";
import {
  DEFAULT_IMAGE_HEIGHT,
  READER_HEADER_HEIGHT,
  READER_IMAGE_GAP,
} from "@domain/utils/readerLayout";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { connect } from "react-redux";
import {
  List,
  type ListImperativeAPI,
  type RowComponentProps,
  useDynamicRowHeight,
} from "react-window";

type ImageContainerProps = {
  chapterLoadStatus: ComicsState["chapterLoadStatus"];
  fetchChapter: typeof fetchChapter;
  hasPendingChapterGate: boolean;
  imageListKey: string;
  imageResult: number[];
  innerHeight: number;
  leadingEvictionRestore: ComicsState["leadingEvictionRestore"];
  requestedChapter: string;
  clearLeadingEvictionRestore: typeof clearLeadingEvictionRestore;
  updateVisibleImageRange: typeof updateVisibleImageRange;
};

type ReaderImageRowProps = {
  hasPendingChapterGate: boolean;
  imageResult: number[];
};

const READER_LIST_OVERSCAN_COUNT = 6;
const READER_DEFAULT_ROW_HEIGHT = DEFAULT_IMAGE_HEIGHT + 2 * READER_IMAGE_GAP;
const READER_PENDING_GATE_ROW_HEIGHT = 216;
const EMPTY_VISIBLE_RANGE = { begin: -1, end: -1 };

type AnchorSnapshot = {
  imageId: number;
  top: number;
};

type AppendRangeSuppress = {
  imageListLength: number;
  startIndex: number;
};

export function getLeadingTrimStartIndex(
  prevImageResult: number[],
  nextImageResult: number[],
) {
  if (
    prevImageResult.length === 0 ||
    nextImageResult.length === 0 ||
    prevImageResult[0] === nextImageResult[0]
  ) {
    return -1;
  }
  return prevImageResult.indexOf(nextImageResult[0]);
}

export function getAppendStartIndex(
  prevImageResult: number[],
  nextImageResult: number[],
) {
  if (
    prevImageResult.length === 0 ||
    nextImageResult.length <= prevImageResult.length
  ) {
    return -1;
  }

  for (let index = 0; index < prevImageResult.length; index += 1) {
    if (prevImageResult[index] !== nextImageResult[index]) {
      return -1;
    }
  }

  return prevImageResult.length;
}

function getRowViewportTop(
  listElement: HTMLDivElement,
  imageId: number,
) {
  const rowElement = listElement.querySelector<HTMLElement>(
    `[data-image-id="${imageId}"]`,
  );
  if (!rowElement) {
    return null;
  }

  const listRect = listElement.getBoundingClientRect();
  const rowRect = rowElement.getBoundingClientRect();
  return rowRect.top - listRect.top;
}

function getAnchorSnapshot(input: {
  imageResult: number[];
  listElement: HTMLDivElement;
  visibleRange: { begin: number; end: number };
}) {
  const { imageResult, listElement, visibleRange } = input;
  const anchorImageId = imageResult[visibleRange.begin];
  if (typeof anchorImageId !== "number") {
    return null;
  }

  const anchorTop = getRowViewportTop(listElement, anchorImageId);
  if (anchorTop === null) {
    return null;
  }

  return {
    imageId: anchorImageId,
    top: anchorTop,
  } satisfies AnchorSnapshot;
}

function ReaderImageRow({
  ariaAttributes,
  hasPendingChapterGate,
  imageResult,
  index,
  style,
}: RowComponentProps<ReaderImageRowProps>) {
  if (hasPendingChapterGate && index === imageResult.length) {
    return (
      <div {...ariaAttributes} className="reader-image-row" style={style}>
        <div
          className="reader-page-surface reader-tail-gate-card"
          style={{ height: "100%" }}
        >
          <Loading />
        </div>
      </div>
    );
  }

  const imageIndex = imageResult[index];
  if (typeof imageIndex !== "number") {
    return null;
  }

  return (
    <div
      {...ariaAttributes}
      className="reader-image-row"
      data-image-id={imageIndex}
      style={style}
    >
      <ConnectedComicImage index={imageIndex} />
    </div>
  );
}

function ImageContainer({
  chapterLoadStatus,
  clearLeadingEvictionRestore: clearLeadingEvictionRestoreProp,
  fetchChapter: fetchChapterProp,
  hasPendingChapterGate,
  imageListKey,
  imageResult,
  innerHeight,
  leadingEvictionRestore,
  requestedChapter,
  updateVisibleImageRange: updateVisibleImageRangeProp,
}: ImageContainerProps) {
  const listRef = useRef<ListImperativeAPI | null>(null);
  const lastVisibleRangeRef = useRef(EMPTY_VISIBLE_RANGE);
  const prevImageResultRef = useRef(imageResult);
  const anchorSnapshotRef = useRef<AnchorSnapshot | null>(null);
  const pendingAnchorRestoreRef = useRef<AnchorSnapshot | null>(null);
  const pendingAppendRangeSuppressRef =
    useRef<AppendRangeSuppress | null>(null);
  const suppressedAppendLengthRef = useRef<number | null>(null);
  const appliedEvictionRestoreSequenceRef = useRef<number | null>(null);
  const restoreFrameRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  const rowHeights = useDynamicRowHeight({
    defaultRowHeight: READER_DEFAULT_ROW_HEIGHT,
    key: imageListKey,
  });
  const rowProps = useMemo<ReaderImageRowProps>(
    () => ({ hasPendingChapterGate, imageResult }),
    [hasPendingChapterGate, imageResult],
  );
  const listRowHeights = useMemo(
    () => ({
      getAverageRowHeight: rowHeights.getAverageRowHeight,
      getRowHeight: (index: number) =>
        hasPendingChapterGate && index === imageResult.length
          ? READER_PENDING_GATE_ROW_HEIGHT
          : rowHeights.getRowHeight(index),
      observeRowElements: rowHeights.observeRowElements,
      setRowHeight: rowHeights.setRowHeight,
    }),
    [hasPendingChapterGate, imageResult.length, rowHeights],
  );

  const handleRowsRendered = useCallback(
    (visibleRows: { startIndex: number; stopIndex: number }) => {
      const lastImageRowIndex = imageResult.length - 1;
      if (lastImageRowIndex < 0) {
        return;
      }
      if (
        pendingAnchorRestoreRef.current ||
        getLeadingTrimStartIndex(prevImageResultRef.current, imageResult) > 0
      ) {
        return;
      }

      const prevRange = lastVisibleRangeRef.current;
      const listElement = listRef.current?.element;
      const currentScrollTop = listElement?.scrollTop || 0;
      const hasScrolledSinceLastRange =
        Math.abs(currentScrollTop - lastScrollTopRef.current) > 1;
      const directAppendStartIndex = getAppendStartIndex(
        prevImageResultRef.current,
        imageResult,
      );
      const pendingAppendSuppress = pendingAppendRangeSuppressRef.current;
      const appendStartIndex =
        directAppendStartIndex > 0
          ? directAppendStartIndex
          : pendingAppendSuppress?.imageListLength === imageResult.length
            ? pendingAppendSuppress.startIndex
            : -1;

      if (
        appendStartIndex > 0 &&
        prevRange.begin >= 0 &&
        prevRange.end < appendStartIndex &&
        visibleRows.stopIndex >= appendStartIndex &&
        !hasScrolledSinceLastRange
      ) {
        suppressedAppendLengthRef.current = imageResult.length;
        pendingAppendRangeSuppressRef.current = null;
        return;
      }
      if (hasScrolledSinceLastRange) {
        pendingAppendRangeSuppressRef.current = null;
      }

      const nextRange = {
        begin: Math.min(lastImageRowIndex, visibleRows.startIndex),
        end: Math.min(lastImageRowIndex, visibleRows.stopIndex),
      };
      if (listElement) {
        const nextAnchorSnapshot = getAnchorSnapshot({
          imageResult,
          listElement,
          visibleRange: nextRange,
        });
        if (nextAnchorSnapshot) {
          anchorSnapshotRef.current = nextAnchorSnapshot;
        }
      }

      if (
        prevRange.begin === nextRange.begin &&
        prevRange.end === nextRange.end
      ) {
        return;
      }
      lastVisibleRangeRef.current = nextRange;
      lastScrollTopRef.current = currentScrollTop;
      updateVisibleImageRangeProp(nextRange.begin, nextRange.end);
    },
    [imageResult, updateVisibleImageRangeProp],
  );

  useLayoutEffect(() => {
    const appendStartIndex = getAppendStartIndex(
      prevImageResultRef.current,
      imageResult,
    );
    if (appendStartIndex > 0) {
      if (suppressedAppendLengthRef.current === imageResult.length) {
        suppressedAppendLengthRef.current = null;
      } else {
        pendingAppendRangeSuppressRef.current = {
          imageListLength: imageResult.length,
          startIndex: appendStartIndex,
        };
      }
      prevImageResultRef.current = imageResult;
      return undefined;
    }

    const trimStartIndex = getLeadingTrimStartIndex(
      prevImageResultRef.current,
      imageResult,
    );
    if (trimStartIndex <= 0) {
      prevImageResultRef.current = imageResult;
      return undefined;
    }

    const listElement = listRef.current?.element;
    const firstImageId = imageResult[0];
    const canApplyEvictionRestore =
      leadingEvictionRestore &&
      leadingEvictionRestore.firstRetainedImageId === firstImageId &&
      appliedEvictionRestoreSequenceRef.current !==
        leadingEvictionRestore.sequence;
    if (canApplyEvictionRestore && listElement) {
      listElement.scrollTop = Math.max(
        0,
        listElement.scrollTop - leadingEvictionRestore.removedScrollHeight,
      );
      lastScrollTopRef.current = listElement.scrollTop;
      appliedEvictionRestoreSequenceRef.current =
        leadingEvictionRestore.sequence;
      clearLeadingEvictionRestoreProp(leadingEvictionRestore.sequence);
    }

    const anchorSnapshot = anchorSnapshotRef.current;
    if (
      !anchorSnapshot ||
      !imageResult.includes(anchorSnapshot.imageId)
    ) {
      pendingAnchorRestoreRef.current = null;
      pendingAppendRangeSuppressRef.current = null;
      suppressedAppendLengthRef.current = null;
      prevImageResultRef.current = imageResult;
      lastVisibleRangeRef.current = EMPTY_VISIBLE_RANGE;
      return undefined;
    }

    let cancelled = false;
    pendingAnchorRestoreRef.current = anchorSnapshot;

    const finishRestore = () => {
      if (cancelled) {
        return;
      }
      pendingAnchorRestoreRef.current = null;
      prevImageResultRef.current = imageResult;
      lastVisibleRangeRef.current = EMPTY_VISIBLE_RANGE;
      restoreFrameRef.current = null;
    };

    const restoreAnchorPosition = (attempt = 0) => {
      if (cancelled) {
        return;
      }
      const currentListElement = listRef.current?.element;
      if (!currentListElement) {
        finishRestore();
        return;
      }

      const nextAnchorTop = getRowViewportTop(
        currentListElement,
        anchorSnapshot.imageId,
      );
      if (nextAnchorTop === null) {
        if (attempt < 2) {
          restoreFrameRef.current = window.requestAnimationFrame(() => {
            restoreAnchorPosition(attempt + 1);
          });
          return;
        }
        lastVisibleRangeRef.current = EMPTY_VISIBLE_RANGE;
        finishRestore();
        return;
      }

      currentListElement.scrollTop = Math.max(
        0,
        currentListElement.scrollTop + nextAnchorTop - anchorSnapshot.top,
      );
      lastScrollTopRef.current = currentListElement.scrollTop;
      finishRestore();
    };

    restoreAnchorPosition();

    return () => {
      cancelled = true;
      if (restoreFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreFrameRef.current);
        restoreFrameRef.current = null;
      }
    };
  }, [clearLeadingEvictionRestoreProp, imageResult, leadingEvictionRestore]);

  useLayoutEffect(() => () => {
    if (restoreFrameRef.current !== null) {
      window.cancelAnimationFrame(restoreFrameRef.current);
      restoreFrameRef.current = null;
    }
  }, []);

  if (imageResult.length === 0) {
    pendingAnchorRestoreRef.current = null;
    pendingAppendRangeSuppressRef.current = null;
    suppressedAppendLengthRef.current = null;
    appliedEvictionRestoreSequenceRef.current = null;
    anchorSnapshotRef.current = null;
    lastVisibleRangeRef.current = EMPTY_VISIBLE_RANGE;
    prevImageResultRef.current = imageResult;
  }

  if (imageResult.length === 0) {
    if (chapterLoadStatus === "failed" && requestedChapter) {
      return (
        <main className="reader-canvas reader-loading" aria-label="漫畫頁面">
          <p className="reader-paywall-title">載入失敗</p>
          <button
            type="button"
            className="ds-btn-secondary"
            onClick={() => fetchChapterProp(requestedChapter)}
          >
            重試
          </button>
        </main>
      );
    }

    return (
      <main className="reader-canvas reader-loading" aria-label="漫畫頁面">
        <Loading />
      </main>
    );
  }

  return (
    <List
      className="reader-canvas popup-scrollbar scrollbar-stable"
      listRef={listRef}
      onRowsRendered={handleRowsRendered}
      overscanCount={READER_LIST_OVERSCAN_COUNT}
      rowComponent={ReaderImageRow}
      rowCount={imageResult.length + (hasPendingChapterGate ? 1 : 0)}
      rowHeight={listRowHeights}
      rowProps={rowProps}
      style={{
        height: Math.max(320, innerHeight - READER_HEADER_HEIGHT),
        left: 0,
        position: "fixed",
        right: 0,
        top: READER_HEADER_HEIGHT,
        width: "100%",
      }}
    />
  );
}

function mapStateToProps({ comics }: { comics: ComicsState }) {
  const imageResult = comics.imageList.result;
  const firstImageIndex = imageResult[0];

  return {
    imageListKey:
      typeof firstImageIndex === "number"
        ? `reader-list-${firstImageIndex}`
        : comics.requestedChapter || comics.seriesKey || "reader-list",
    imageResult,
    hasPendingChapterGate: Boolean(comics.pendingChapterGate),
    innerHeight: comics.innerHeight,
    leadingEvictionRestore: comics.leadingEvictionRestore,
    chapterLoadStatus: comics.chapterLoadStatus,
    requestedChapter: comics.requestedChapter,
  };
}

export default connect(mapStateToProps, {
  clearLeadingEvictionRestore,
  fetchChapter,
  updateVisibleImageRange,
})(ImageContainer);
