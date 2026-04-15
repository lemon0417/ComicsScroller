import { fetchImgSrc,imageLoadFailed, retryImage  } from "@domain/actions/reader";
import { lastValueFrom, of } from "rxjs";
import { toArray } from "rxjs/operators";

import imageRetryEpic from "./imageRetryEpic";

describe("imageRetryEpic", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("schedules an automatic retry for failed images", async () => {
    const state$ = {
      value: {
        comics: {
          imageList: {
            entity: {
              0: {
                chapter: "c1",
                requestSrc: "https://example.com/c1-1.jpg",
                src: "https://example.com/c1-1.jpg",
                loadError: null,
                loading: true,
                autoRetryCount: 1,
                type: "image",
              },
            },
          },
        },
      },
    };

    const outputPromise = lastValueFrom(
      imageRetryEpic(of(imageLoadFailed(0, "image")), state$ as any).pipe(
        toArray(),
      ),
    );

    await jest.advanceTimersByTimeAsync(800);

    await expect(outputPromise).resolves.toEqual([fetchImgSrc(0, 0)]);
  });

  it("retries immediately when the user asks to reload a page", async () => {
    const state$ = {
      value: {
        comics: {
          imageList: {
            entity: {
              0: {
                chapter: "c1",
                requestSrc: "https://example.com/c1-1.jpg",
                src: "https://example.com/c1-1.jpg",
                loadError: null,
                loading: true,
                autoRetryCount: 0,
                type: "image",
              },
            },
          },
        },
      },
    };

    await expect(
      lastValueFrom(
        imageRetryEpic(of(retryImage(0)), state$ as any).pipe(toArray()),
      ),
    ).resolves.toEqual([fetchImgSrc(0, 0)]);
  });

  it("cancels stale automatic retries after the image state changes", async () => {
    const state$ = {
      value: {
        comics: {
          imageList: {
            entity: {
              0: {
                chapter: "c1",
                requestSrc: "https://example.com/c1-1.jpg",
                src: "https://example.com/c1-1.jpg",
                loadError: null,
                loading: true,
                autoRetryCount: 1,
                type: "image",
              },
            },
          },
        },
      },
    };

    const outputPromise = lastValueFrom(
      imageRetryEpic(of(imageLoadFailed(0, "resolve")), state$ as any).pipe(
        toArray(),
      ),
    );

    state$.value.comics.imageList.entity[0].loading = false;
    await jest.advanceTimersByTimeAsync(800);

    await expect(outputPromise).resolves.toEqual([]);
  });
});
