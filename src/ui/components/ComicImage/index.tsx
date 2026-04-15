import {
  imageLoadFailed,
  type ReaderImageFailureStage,
  retryImage,
} from "@domain/actions/reader";
import {
  type ComicsImageRecord,
  type ComicsImageType,
  type ComicsState,
  updateImgType,
} from "@domain/reducers/comics";
import { getImageRenderMetrics } from "@domain/utils/readerLayout";
import { devLog } from "@utils/devLog";
import {
  type SyntheticEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { connect } from "react-redux";

type Props = {
  autoRetryCount?: number;
  chapter?: string;
  href?: string;
  loadError?: ReaderImageFailureStage | null;
  loading?: boolean;
  src?: string;
  type?: ComicsImageType;
  height?: number;
  innerHeight?: number;
  innerWidth?: number;
  naturalWidth?: number;
  naturalHeight?: number;
  renderHeight?: number;
  renderWidth?: number;
  index?: number;
  updateImgType?: (
    height: number,
    index: number,
    imgType: ComicsImageType,
    naturalWidth?: number,
    naturalHeight?: number,
  ) => void;
  imageLoadFailed?: (
    index: number,
    stage: ReaderImageFailureStage,
  ) => void;
  retryImage?: (index: number) => void;
};

function getImageHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function ComicImage(props: Props) {
  const {
    autoRetryCount,
    chapter,
    href,
    index,
    innerHeight,
    innerWidth,
    loadError,
    loading,
    naturalHeight,
    naturalWidth,
    height,
    renderHeight,
    renderWidth,
    retryImage: retryImageProp,
    src,
    type,
    imageLoadFailed: imageLoadFailedProp,
    updateImgType,
  } = props;
  const imageMetricsRef = useRef({ width: 0, height: 0 });
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    setShowImage(false);
  }, [index, loading, src]);

  const imgLoadHandler = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget) {
      const target = event.currentTarget;
      if (type === "image") {
        imageMetricsRef.current = {
          width: target.naturalWidth,
          height: target.naturalHeight,
        };
        const layout = getImageRenderMetrics({
          type: target.naturalWidth > target.naturalHeight ? "wide" : "natural",
          height: imageMetricsRef.current.height,
          naturalWidth: imageMetricsRef.current.width,
          naturalHeight: imageMetricsRef.current.height,
          innerWidth,
          innerHeight,
        });
        if (updateImgType && typeof index === "number") {
          updateImgType(
            layout.height,
            index,
            layout.type,
            imageMetricsRef.current.width,
            imageMetricsRef.current.height,
          );
        }
      } else if (
        updateImgType &&
        typeof index === "number" &&
        type &&
        type !== "end" &&
        type !== "paywall"
      ) {
        updateImgType(
          typeof height === "number" ? height : 0,
          index,
          type,
          naturalWidth,
          naturalHeight,
        );
      }
    }
    setShowImage(true);
  }, [
    height,
    index,
    innerHeight,
    innerWidth,
    naturalHeight,
    naturalWidth,
    type,
    updateImgType,
  ]);

  const imgErrorHandler = useCallback(() => {
    if (!imageLoadFailedProp || typeof index !== "number") {
      return;
    }
    devLog("reader:image:error", {
      attempt: (autoRetryCount || 0) + 1,
      chapter,
      host: getImageHost(src || ""),
      index,
      stage: "image",
    });
    imageLoadFailedProp(index, "image");
  }, [autoRetryCount, chapter, imageLoadFailedProp, index, src]);

  const retryHandler = useCallback(() => {
    if (!retryImageProp || typeof index !== "number") {
      return;
    }
    devLog("reader:image:retry-click", {
      chapter,
      host: getImageHost(src || ""),
      index,
    });
    retryImageProp(index);
  }, [chapter, index, retryImageProp, src]);

  const variant = type || "init";
  const paywallHref = href || "";
  const isEnd = type === "end";
  const isPaywall = type === "paywall";
  const isTerminalError = Boolean(loadError) && !loading && !isEnd && !isPaywall;
  const pageStyle =
    isEnd
      ? undefined
      : {
          width: renderWidth,
          height: renderHeight,
        };

  return (
    <div
      className={type === "end" ? "reader-end-marker" : "reader-page-surface"}
      data-variant={variant}
      style={pageStyle}
    >
      {isPaywall ? (
        <div className="reader-paywall-card">
          <p className="reader-paywall-title">此章節需要付費解鎖</p>
          <p className="reader-paywall-desc">
            DM5 未提供免費圖片頁面，請回原站完成購買或閱讀。
          </p>
          {paywallHref ? (
            <a
              className="ds-btn-primary"
              href={paywallHref}
              target="_blank"
              rel="noreferrer"
            >
              前往 DM5 章節頁
            </a>
          ) : undefined}
        </div>
      ) : undefined}
      {isTerminalError ? (
        <div className="reader-paywall-card">
          <p className="reader-paywall-title">載入失敗</p>
          <button
            type="button"
            className="ds-btn-secondary"
            onClick={retryHandler}
          >
            重試
          </button>
        </div>
      ) : undefined}
      {!showImage &&
      !isEnd &&
      !isPaywall &&
      !isTerminalError ? (
        <div className="reader-page-loading">
          <span className="text-sm font-medium text-comic-ink/45">
            Loading...
          </span>
        </div>
      ) : undefined}
      {!loading &&
      !isEnd &&
      !isPaywall &&
      !isTerminalError ? (
        <img
          style={showImage ? undefined : { display: "none" }}
          className="block h-full w-full object-contain"
          src={src}
          onLoad={imgLoadHandler}
          onError={imgErrorHandler}
          alt={String(index ?? "")}
        />
      ) : undefined}
      {isEnd ? "本 章 結 束" : undefined}
    </div>
  );
}

function createFallbackImageRecord(): ComicsImageRecord {
  return {
    autoRetryCount: 0,
    chapter: "",
    href: "",
    loadError: null,
    requestSrc: "",
    src: "",
    loading: true,
    height: 0,
    naturalHeight: 0,
    naturalWidth: 0,
    type: "image",
  };
}

function makeMapStateToProps(
  _state: { comics: ComicsState },
  props: { index: number },
) {
  const { index } = props;
  return function mapStateToProps({ comics }: { comics: ComicsState }) {
    const {
      chapter,
      href,
      src,
      loadError,
      autoRetryCount,
      loading,
      type,
      height,
      naturalWidth,
      naturalHeight,
    } = comics.imageList.entity[index] || createFallbackImageRecord();
    const layout = getImageRenderMetrics({
      type,
      height,
      naturalWidth,
      naturalHeight,
      innerWidth: comics.innerWidth,
      innerHeight: comics.innerHeight,
    });

    return {
      src,
      chapter,
      autoRetryCount,
      href,
      loadError,
      loading,
      type,
      height,
      naturalWidth,
      naturalHeight,
      innerHeight: comics.innerHeight,
      innerWidth: comics.innerWidth,
      renderHeight: layout.height,
      renderWidth: layout.width,
    };
  };
}

export default connect(makeMapStateToProps, {
  imageLoadFailed,
  retryImage,
  updateImgType,
})(ComicImage);
