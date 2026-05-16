import { IMAGE_LOAD_FAILED } from "@domain/actions/reader";
import {
  appendPendingChapterGate,
  UPDATE_IMAGE_TYPE,
} from "@domain/reducers/comics";
import { ofType } from "redux-observable";
import { EMPTY, of } from "rxjs";
import { mergeMap } from "rxjs/operators";

import type { AppEpic } from "./types";

const pendingChapterGateEpic: AppEpic = (action$, state$) =>
  action$.pipe(
    ofType(UPDATE_IMAGE_TYPE, IMAGE_LOAD_FAILED),
    mergeMap(() => {
      const { pendingChapterGate, readyChapters } = state$.value.comics;
      if (
        !pendingChapterGate ||
        pendingChapterGate.status !== "queued" ||
        !pendingChapterGate.imgList?.length ||
        !readyChapters[pendingChapterGate.blockingChapterId]
      ) {
        return EMPTY;
      }

      return of(appendPendingChapterGate());
    }),
  );

export default pendingChapterGateEpic;
