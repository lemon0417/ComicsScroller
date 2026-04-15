import { imageLoadFailed, retryImage } from "@domain/actions/reader";

import comics, {
  concatImageList,
  MAX_IMAGE_AUTO_RETRY_COUNT,
  resetImg,
  updateCanPreloadPreviousChapter,
  updateChapterList,
  updateChapterNowIndex,
  updateChapters,
  updateComicsID,
  updateInnerHeight,
  updateInnerWidth,
  updateSiteInfo,
} from "./comics";

describe("comics reducer", () => {
  it("updates innerHeight", () => {
    const prevState = comics(undefined, { type: "@@INIT" } as any) as any;
    const nextState = comics(prevState, updateInnerHeight(720) as any);

    expect(nextState.innerHeight).toBe(720);
  });

  it("updates innerWidth", () => {
    const prevState = comics(undefined, { type: "@@INIT" } as any) as any;
    const nextState = comics(prevState, updateInnerWidth(1280) as any);

    expect(nextState.innerWidth).toBe(1280);
  });

  it("resets imageList on resetImg", () => {
    const seededState = {
      ...(comics(undefined, { type: "@@INIT" } as any) as any),
      imageList: {
        result: [0, 1],
        entity: {
          0: { src: "a", loading: false },
          1: { src: "b", loading: false },
        },
      },
    };

    const nextState = comics(seededState as any, resetImg() as any);

    expect(nextState.imageList).toEqual({ result: [], entity: {} });
  });

  it("builds a canonical seriesKey when site and comicsID are set", () => {
    const prevState = comics(undefined, { type: "@@INIT" } as any) as any;
    const withSite = comics(prevState, updateSiteInfo("dm5", "https://www.dm5.com") as any);
    const nextState = comics(withSite, updateComicsID("123") as any);

    expect(nextState.seriesKey).toBe("dm5:m123");
  });

  it("keeps DM5 series slugs unchanged when building seriesKey", () => {
    const prevState = comics(undefined, { type: "@@INIT" } as any) as any;
    const withSite = comics(
      prevState,
      updateSiteInfo("dm5", "https://www.dm5.com") as any,
    );
    const nextState = comics(
      withSite,
      updateComicsID("manhua-bailianchengshen") as any,
    );

    expect(nextState.seriesKey).toBe("dm5:manhua-bailianchengshen");
  });

  it("updates canPreloadPreviousChapter explicitly", () => {
    const prevState = comics(undefined, { type: "@@INIT" } as any) as any;
    const nextState = comics(
      prevState,
      updateCanPreloadPreviousChapter(false) as any,
    );

    expect(nextState.canPreloadPreviousChapter).toBe(false);
  });

  it("keeps paywall placeholder images non-loading", () => {
    const prevState = comics(undefined, { type: "@@INIT" } as any) as any;
    const nextState = comics(
      prevState,
      concatImageList([
        {
          chapter: "m1655813",
          href: "https://www.dm5.com/m1655813/",
          src: "",
          type: "paywall",
        },
      ]) as any,
    );

    expect(nextState.imageList.entity[0]).toEqual(
      expect.objectContaining({
        autoRetryCount: 0,
        chapter: "m1655813",
        href: "https://www.dm5.com/m1655813/",
        loadError: null,
        loading: false,
        requestSrc: "",
        type: "paywall",
      }),
    );
  });

  it("tracks request sources for retryable images", () => {
    const prevState = comics(undefined, { type: "@@INIT" } as any) as any;
    const nextState = comics(
      prevState,
      concatImageList([
        {
          chapter: "c1",
          src: "https://example.com/chapterfun.ashx?page=1",
        },
      ]) as any,
    );

    expect(nextState.imageList.entity[0]).toEqual(
      expect.objectContaining({
        autoRetryCount: 0,
        loadError: null,
        loading: true,
        requestSrc: "https://example.com/chapterfun.ashx?page=1",
        src: "https://example.com/chapterfun.ashx?page=1",
      }),
    );
  });

  it("keeps images in loading while auto retries remain", () => {
    const prevState = comics(
      comics(undefined, { type: "@@INIT" } as any) as any,
      concatImageList([
        {
          chapter: "c1",
          src: "https://example.com/chapterfun.ashx?page=1",
        },
      ]) as any,
    ) as any;

    const nextState = comics(prevState, imageLoadFailed(0, "resolve") as any);

    expect(nextState.imageList.entity[0]).toEqual(
      expect.objectContaining({
        autoRetryCount: 1,
        loadError: null,
        loading: true,
        src: "https://example.com/chapterfun.ashx?page=1",
      }),
    );
  });

  it("marks the image as failed after exhausting auto retries", () => {
    let nextState = comics(
      comics(undefined, { type: "@@INIT" } as any) as any,
      concatImageList([
        {
          chapter: "c1",
          src: "https://example.com/chapterfun.ashx?page=1",
        },
      ]) as any,
    ) as any;

    for (let attempt = 0; attempt <= MAX_IMAGE_AUTO_RETRY_COUNT; attempt += 1) {
      nextState = comics(nextState, imageLoadFailed(0, "image") as any);
    }

    expect(nextState.imageList.entity[0]).toEqual(
      expect.objectContaining({
        autoRetryCount: MAX_IMAGE_AUTO_RETRY_COUNT,
        loadError: "image",
        loading: false,
      }),
    );
  });

  it("resets terminal image failures on manual retry", () => {
    let nextState = comics(
      comics(undefined, { type: "@@INIT" } as any) as any,
      concatImageList([
        {
          chapter: "c1",
          src: "https://example.com/chapterfun.ashx?page=1",
        },
      ]) as any,
    ) as any;

    for (let attempt = 0; attempt <= MAX_IMAGE_AUTO_RETRY_COUNT; attempt += 1) {
      nextState = comics(nextState, imageLoadFailed(0, "image") as any);
    }
    nextState = comics(nextState, retryImage(0) as any);

    expect(nextState.imageList.entity[0]).toEqual(
      expect.objectContaining({
        autoRetryCount: 0,
        loadError: null,
        loading: true,
        src: "https://example.com/chapterfun.ashx?page=1",
      }),
    );
  });

  it("tracks currentChapterTitle from chapter metadata and navigation", () => {
    const prevState = comics(undefined, { type: "@@INIT" } as any) as any;
    const withChapters = comics(
      prevState,
      updateChapters({
        c1: { title: "Chapter 1" },
        c2: { title: "Chapter 2" },
      }) as any,
    );
    const withChapterList = comics(
      withChapters,
      updateChapterList(["c2", "c1"]) as any,
    );

    expect(withChapterList.currentChapterTitle).toBe("Chapter 2");

    const nextState = comics(
      withChapterList,
      updateChapterNowIndex(1) as any,
    );

    expect(nextState.currentChapterTitle).toBe("Chapter 1");
  });
});
