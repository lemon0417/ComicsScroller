import { fetchImgSrc, imageLoadFailed } from "@domain/actions/reader";
import { loadImgSrc } from "@domain/reducers/comics";
import { lastValueFrom, NEVER, of, Subject } from "rxjs";
import { ajax } from "rxjs/ajax";
import { toArray } from "rxjs/operators";

import { DM5_IMAGE_REQUEST_TIMEOUT_MS, fetchImgSrcEpic } from "./dm5";

jest.mock("rxjs/ajax", () => ({
  ajax: jest.fn(),
}));

describe("dm5 fetchImgSrcEpic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("dedupes in-flight chapterfun requests for the same image", async () => {
    const response$ = new Subject<{ response: string }>();
    const ajaxMock = ajax as unknown as jest.Mock;
    ajaxMock.mockReturnValue(response$);

    const state$ = {
      value: {
        comics: {
          imageList: {
            result: [0],
            entity: {
              0: {
                autoRetryCount: 0,
                requestSrc:
                  "https://www.dm5.com/manhua-demo/chapterfun.ashx?cid=1&page=1",
                src: "https://www.dm5.com/manhua-demo/chapterfun.ashx?cid=1&page=1",
                loading: true,
                loadError: null,
                type: "image",
                cid: "1",
                key: "deadbeef",
              },
            },
          },
        },
      },
    };

    const outputPromise = lastValueFrom(
      fetchImgSrcEpic(
        of(fetchImgSrc(0, 0), fetchImgSrc(0, 0)),
        state$ as any,
      ).pipe(toArray()),
    );

    expect(ajaxMock).toHaveBeenCalledTimes(1);

    response$.next({
      response:
        "var d=['/1_4253.jpg']; var base='https://example.com/85/84472/1753397';",
    });
    response$.complete();

    await expect(outputPromise).resolves.toEqual([
      loadImgSrc(
        "https://example.com/85/84472/1753397/1_4253.jpg?cid=1&key=deadbeef",
        0,
      ),
    ]);
  });

  it("surfaces a resolve failure so the retry flow can recover", async () => {
    const ajaxMock = ajax as unknown as jest.Mock;
    ajaxMock.mockReturnValueOnce(
      of({
        response: "",
      }),
    );

    const state$ = {
      value: {
        comics: {
          imageList: {
            result: [0],
            entity: {
              0: {
                autoRetryCount: 0,
                requestSrc:
                  "https://www.dm5.com/manhua-demo/chapterfun.ashx?cid=1&page=1",
                src: "https://www.dm5.com/manhua-demo/chapterfun.ashx?cid=1&page=1",
                loading: true,
                loadError: null,
                type: "image",
                cid: "1",
                key: "deadbeef",
              },
            },
          },
        },
      },
    };

    await expect(
      lastValueFrom(
        fetchImgSrcEpic(of(fetchImgSrc(0, 0)), state$ as any).pipe(toArray()),
      ),
    ).resolves.toEqual([imageLoadFailed(0, "resolve")]);
  });

  it("times out stalled chapterfun requests", async () => {
    jest.useFakeTimers();
    try {
      const ajaxMock = ajax as unknown as jest.Mock;
      ajaxMock.mockReturnValueOnce(NEVER);

      const state$ = {
        value: {
          comics: {
            imageList: {
              result: [0],
              entity: {
                0: {
                  autoRetryCount: 0,
                  requestSrc:
                    "https://www.dm5.com/manhua-demo/chapterfun.ashx?cid=1&page=1",
                  src: "https://www.dm5.com/manhua-demo/chapterfun.ashx?cid=1&page=1",
                  loading: true,
                  loadError: null,
                  type: "image",
                  cid: "1",
                  key: "deadbeef",
                },
              },
            },
          },
        },
      };

      const outputPromise = lastValueFrom(
        fetchImgSrcEpic(of(fetchImgSrc(0, 0)), state$ as any).pipe(toArray()),
      );

      await jest.advanceTimersByTimeAsync(DM5_IMAGE_REQUEST_TIMEOUT_MS);

      await expect(outputPromise).resolves.toEqual([
        imageLoadFailed(0, "resolve"),
      ]);
    } finally {
      jest.useRealTimers();
    }
  });
});
