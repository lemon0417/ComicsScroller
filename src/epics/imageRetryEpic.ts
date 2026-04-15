import {
  fetchImgSrc,
  IMAGE_LOAD_FAILED,
  type ReaderImageFailureStage,
  RETRY_IMAGE,
} from "@domain/actions/reader";
import {
  type ComicsImageRecord,
  type ComicsState,
  MAX_IMAGE_AUTO_RETRY_COUNT,
} from "@domain/reducers/comics";
import { devLog } from "@utils/devLog";
import { ofType } from "redux-observable";
import { EMPTY, of, timer } from "rxjs";
import { mergeMap } from "rxjs/operators";

import type { AppEpic } from "./types";

type RetryAction = {
  type?: string;
  index: number;
};

type ImageLoadFailedAction = RetryAction & {
  stage: ReaderImageFailureStage;
};

const IMAGE_AUTO_RETRY_DELAYS_MS = [800, 1600];

function getRequestHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function getRetryableImageRecord(
  comics: ComicsState,
  index: number,
): ComicsImageRecord | null {
  const imageRecord = comics.imageList.entity[index];
  if (
    !imageRecord ||
    imageRecord.type === "end" ||
    imageRecord.type === "paywall"
  ) {
    return null;
  }
  return imageRecord;
}

const imageRetryEpic: AppEpic = (action$, state$) =>
  action$.pipe(
    ofType(IMAGE_LOAD_FAILED, RETRY_IMAGE),
    mergeMap((action) => {
      const typedAction = action as RetryAction;
      const { index } = typedAction;
      const imageRecord = getRetryableImageRecord(state$.value.comics, index);
      if (!imageRecord) {
        return EMPTY;
      }

      if (typedAction.type === RETRY_IMAGE) {
        devLog("reader:image:manual-retry", {
          attempt: 1,
          chapter: imageRecord.chapter,
          host: getRequestHost(imageRecord.requestSrc || imageRecord.src || ""),
          index,
        });
        return of(fetchImgSrc(index, index));
      }

      const { stage } = typedAction as ImageLoadFailedAction;
      if (imageRecord.loadError || !imageRecord.loading) {
        return EMPTY;
      }

      const attempt = imageRecord.autoRetryCount;
      if (
        attempt <= 0 ||
        attempt > MAX_IMAGE_AUTO_RETRY_COUNT ||
        attempt > IMAGE_AUTO_RETRY_DELAYS_MS.length
      ) {
        return EMPTY;
      }

      const delayMs = IMAGE_AUTO_RETRY_DELAYS_MS[attempt - 1];
      const requestSrc = imageRecord.requestSrc;

      devLog("reader:image:auto-retry-scheduled", {
        attempt,
        chapter: imageRecord.chapter,
        host: getRequestHost(requestSrc || imageRecord.src || ""),
        index,
        stage,
      });

      return timer(delayMs).pipe(
        mergeMap(() => {
          const latestImageRecord = getRetryableImageRecord(
            state$.value.comics,
            index,
          );
          if (
            !latestImageRecord ||
            latestImageRecord.requestSrc !== requestSrc ||
            !latestImageRecord.loading ||
            latestImageRecord.loadError !== null ||
            latestImageRecord.autoRetryCount !== attempt
          ) {
            return EMPTY;
          }

          devLog("reader:image:auto-retry-run", {
            attempt,
            chapter: latestImageRecord.chapter,
            host: getRequestHost(requestSrc || latestImageRecord.src || ""),
            index,
            stage,
          });
          return of(fetchImgSrc(index, index));
        }),
      );
    }),
  );

export default imageRetryEpic;
