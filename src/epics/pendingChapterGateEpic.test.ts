import { of } from "rxjs";

import pendingChapterGateEpic from "./pendingChapterGateEpic";

describe("pendingChapterGateEpic", () => {
  it("appends a queued chapter after the blocking chapter becomes ready", (done) => {
    const { appendPendingChapterGate, updateImgType } = require("@domain/reducers/comics");
    const actions: any[] = [];
    const state$ = {
      value: {
        comics: {
          pendingChapterGate: {
            blockingChapterId: "c2",
            chapterId: "c1",
            chapterIndex: 0,
            status: "queued",
            imgList: [{ chapter: "c1", src: "https://example.com/c1-1.jpg" }],
          },
          readyChapters: {
            c2: true,
          },
        },
      },
    };

    pendingChapterGateEpic(
      of(updateImgType(1200, 0, "natural", 900, 1600)),
      state$ as any,
    ).subscribe({
      complete: () => {
        expect(actions).toEqual([appendPendingChapterGate()]);
        done();
      },
      next: (action) => actions.push(action),
    });
  });

  it("ignores updates when there is no queued chapter gate", (done) => {
    const { updateImgType } = require("@domain/reducers/comics");
    const actions: any[] = [];
    const state$ = {
      value: {
        comics: {
          pendingChapterGate: null,
          readyChapters: {
            c2: true,
          },
        },
      },
    };

    pendingChapterGateEpic(
      of(updateImgType(1200, 0, "natural", 900, 1600)),
      state$ as any,
    ).subscribe({
      complete: () => {
        expect(actions).toEqual([]);
        done();
      },
      next: (action) => actions.push(action),
    });
  });

  it("checks the gate after terminal image failures update chapter readiness", (done) => {
    const { imageLoadFailed } = require("@domain/actions/reader");
    const { appendPendingChapterGate } = require("@domain/reducers/comics");
    const actions: any[] = [];
    const state$ = {
      value: {
        comics: {
          pendingChapterGate: {
            blockingChapterId: "c2",
            chapterId: "c1",
            chapterIndex: 0,
            status: "queued",
            imgList: [{ chapter: "c1", src: "https://example.com/c1-1.jpg" }],
          },
          readyChapters: {
            c2: true,
          },
        },
      },
    };

    pendingChapterGateEpic(
      of(imageLoadFailed(0, "image")),
      state$ as any,
    ).subscribe({
      complete: () => {
        expect(actions).toEqual([appendPendingChapterGate()]);
        done();
      },
      next: (action) => actions.push(action),
    });
  });
});
