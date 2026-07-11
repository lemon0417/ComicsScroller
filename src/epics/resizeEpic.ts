import { updateInnerHeight, updateInnerWidth } from "@domain/reducers/comics";
import { asyncScheduler, fromEvent } from "rxjs";
import { mergeMap, startWith, throttleTime } from "rxjs/operators";

import type { AppEpic } from "./types";

function fromResizeEvent() {
  return fromEvent(window, "resize").pipe(
    startWith(null),
    throttleTime(100, asyncScheduler, { leading: true, trailing: true }),
    mergeMap(() => [
      updateInnerHeight(window.innerHeight),
      updateInnerWidth(window.innerWidth),
    ]),
  );
}

const resizeEpic: AppEpic = () => fromResizeEvent();

export default resizeEpic;
