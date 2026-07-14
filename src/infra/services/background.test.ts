import { NEVER, of } from "rxjs";

import {
  ensureBackgroundAlarms,
  EXTENSION_RELEASE_ALARM_NAME,
  handleExtensionInstalled,
  handleNotificationClick,
  handlePingBackgroundMessage,
  LIBRARY_REFRESH_ALARM_NAME,
  resolveReaderRedirect,
  runBackgroundReleaseCheck,
  runBackgroundUpdateSummary,
} from "./background";

const UPDATE_NOTIFICATION_ID = "Comics Scroller Update";

describe("background service", () => {
  it("preserves existing background alarm schedules", async () => {
    const createAlarm = jest.fn();
    const getAlarm = jest.fn(async (name: string) => ({
      name,
      scheduledTime: 999,
    }) as chrome.alarms.Alarm);

    await ensureBackgroundAlarms({ createAlarm, getAlarm }, () => 123);

    expect(getAlarm).toHaveBeenCalledWith(LIBRARY_REFRESH_ALARM_NAME);
    expect(getAlarm).toHaveBeenCalledWith(EXTENSION_RELEASE_ALARM_NAME);
    expect(createAlarm).not.toHaveBeenCalled();
  });

  it("creates only missing background alarms", async () => {
    const createAlarm = jest.fn();
    const getAlarm = jest.fn(async (name: string) =>
      name === EXTENSION_RELEASE_ALARM_NAME
        ? ({ name, scheduledTime: 999 } as chrome.alarms.Alarm)
        : undefined,
    );

    await ensureBackgroundAlarms({ createAlarm, getAlarm }, () => 123);

    expect(createAlarm).toHaveBeenCalledTimes(1);
    expect(createAlarm).toHaveBeenCalledWith(LIBRARY_REFRESH_ALARM_NAME, {
      when: 123,
      periodInMinutes: 10,
    });
  });

  it("shares an active background update across concurrent callers", async () => {
    let resolveSubscriptions: (seriesKeys: string[]) => void = () => undefined;
    const subscriptionsPromise = new Promise<string[]>((resolve) => {
      resolveSubscriptions = resolve;
    });
    const listSubscriptionKeys = jest.fn(() => subscriptionsPromise);
    const deps = {
      applyBackgroundSeriesRefresh: jest.fn(),
      clearNotification: jest.fn(),
      createNotification: jest.fn(),
      getFetchChapterPage: jest.fn(),
      getManifestVersion: jest.fn(() => "4.0.99"),
      getRuntimeUrl: jest.fn((path: string) => `chrome-extension:///${path}`),
      getBackgroundSeriesState: jest.fn(),
      getUpdateCount: jest.fn().mockResolvedValue(0),
      listSubscriptionKeys,
      markSubscriptionCheckedByKey: jest.fn(),
      openTab: jest.fn(),
      parseSeriesKey: jest.fn(),
      reconcileExtensionReleaseState: jest.fn(),
      refreshExtensionReleaseState: jest.fn(),
      resetLibrary: jest.fn(),
      setBadge: jest.fn(),
      setLibraryVersion: jest.fn(),
    };

    const firstRun = runBackgroundUpdateSummary(deps);
    const overlappingRun = runBackgroundUpdateSummary(deps);

    expect(overlappingRun).toBe(firstRun);
    expect(listSubscriptionKeys).toHaveBeenCalledTimes(1);

    resolveSubscriptions([]);
    await expect(Promise.all([firstRun, overlappingRun])).resolves.toEqual([
      {
        checked: 0,
        updated: 0,
        errors: 0,
        diff: { before: 0, after: 0, added: 0 },
      },
      {
        checked: 0,
        updated: 0,
        errors: 0,
        diff: { before: 0, after: 0, added: 0 },
      },
    ]);
  });

  it("allows a background update retry after the active run fails", async () => {
    const listSubscriptionKeys = jest
      .fn()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce([]);
    const deps = {
      applyBackgroundSeriesRefresh: jest.fn(),
      clearNotification: jest.fn(),
      createNotification: jest.fn(),
      getFetchChapterPage: jest.fn(),
      getManifestVersion: jest.fn(() => "4.0.99"),
      getRuntimeUrl: jest.fn((path: string) => `chrome-extension:///${path}`),
      getBackgroundSeriesState: jest.fn(),
      getUpdateCount: jest.fn().mockResolvedValue(0),
      listSubscriptionKeys,
      markSubscriptionCheckedByKey: jest.fn(),
      openTab: jest.fn(),
      parseSeriesKey: jest.fn(),
      reconcileExtensionReleaseState: jest.fn(),
      refreshExtensionReleaseState: jest.fn(),
      resetLibrary: jest.fn(),
      setBadge: jest.fn(),
      setLibraryVersion: jest.fn(),
    };

    await expect(runBackgroundUpdateSummary(deps)).rejects.toThrow(
      "temporary failure",
    );
    await expect(runBackgroundUpdateSummary(deps)).resolves.toEqual({
      checked: 0,
      updated: 0,
      errors: 0,
      diff: { before: 0, after: 0, added: 0 },
    });
    expect(listSubscriptionKeys).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["an empty chapter list", { chapterList: [], chapters: {} }],
    [
      "duplicate chapter IDs",
      {
        chapterList: ["m1", "m1"],
        chapters: {
          m1: { title: "Ch 1", href: "https://www.dm5.com/m1/" },
        },
      },
    ],
    ["a missing chapter record", { chapterList: ["m1"], chapters: {} }],
    [
      "a chapter without an href",
      {
        chapterList: ["m1"],
        chapters: { m1: { title: "Ch 1", href: "" } },
      },
    ],
  ])("reports %s as invalid background metadata", async (_label, meta) => {
    const applyBackgroundSeriesRefresh = jest.fn();
    const markSubscriptionCheckedByKey = jest.fn();
    const summary = await runBackgroundUpdateSummary(
      {
        applyBackgroundSeriesRefresh,
        clearNotification: jest.fn(),
        createNotification: jest.fn(),
        getFetchChapterPage: jest.fn(() => () => of(meta as any)),
        getManifestVersion: jest.fn(() => "4.0.99"),
        getRuntimeUrl: jest.fn((path: string) => `chrome-extension:///${path}`),
        getBackgroundSeriesState: jest.fn().mockResolvedValue({
          url: "https://www.dm5.com/m123/",
          cover: "cover.jpg",
          latestChapterID: "m0",
        }),
        getUpdateCount: jest.fn().mockResolvedValue(0),
        listSubscriptionKeys: jest.fn().mockResolvedValue(["dm5:m123"]),
        markSubscriptionCheckedByKey,
        openTab: jest.fn(),
        parseSeriesKey: jest.fn(() => ({ site: "dm5", comicsID: "m123" })),
        reconcileExtensionReleaseState: jest.fn(),
        refreshExtensionReleaseState: jest.fn(),
        resetLibrary: jest.fn(),
        setBadge: jest.fn(),
        setLibraryVersion: jest.fn(),
      },
      { now: () => 456 },
    );

    expect(summary).toEqual({
      checked: 1,
      updated: 0,
      errors: 1,
      diff: { before: 0, after: 0, added: 0 },
    });
    expect(applyBackgroundSeriesRefresh).not.toHaveBeenCalled();
    expect(markSubscriptionCheckedByKey).toHaveBeenCalledWith("dm5:m123", 456);
  });

  it("summarizes background updates and refreshes badge", async () => {
    const setBadge = jest.fn();
    const markSubscriptionCheckedByKey = jest.fn().mockResolvedValue(undefined);
    const applyBackgroundSeriesRefresh = jest.fn().mockResolvedValue({
      updatesCount: 2,
    });
    const fetchChapterPage = jest.fn(
      (_url: string, options?: { includeCover?: boolean }) =>
        of({
          title: "Demo",
          chapterList: ["m2", "m1"],
          ...(options?.includeCover ? { cover: "cover.jpg" } : {}),
          chapters: {
            m1: { title: "Ch 1", href: "https://www.dm5.com/m123//1" },
            m2: { title: "Ch 2", href: "https://www.dm5.com/m123//2" },
          },
        }),
    );

    const summary = await runBackgroundUpdateSummary({
      applyBackgroundSeriesRefresh,
      clearNotification: jest.fn(),
      createNotification: jest.fn(),
      getFetchChapterPage: jest.fn(() => fetchChapterPage),
      getManifestVersion: jest.fn(() => "4.0.99"),
      getRuntimeUrl: jest.fn((path: string) => `chrome-extension:///${path}`),
      getBackgroundSeriesState: jest.fn().mockResolvedValue({
        url: "https://www.dm5.com/m123/",
        cover: "persisted-cover.jpg",
        latestChapterID: "m1",
      }),
      getUpdateCount: jest
        .fn()
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2),
      listSubscriptionKeys: jest.fn().mockResolvedValue(["dm5:m123"]),
      markSubscriptionCheckedByKey,
      openTab: jest.fn(),
      parseSeriesKey: jest.fn(() => ({ site: "dm5", comicsID: "m123" })),
      reconcileExtensionReleaseState: jest.fn(),
      refreshExtensionReleaseState: jest.fn(),
      resetLibrary: jest.fn(),
      setBadge,
      setLibraryVersion: jest.fn(),
    }, {
      batchSize: 12,
      concurrency: 2,
      timeoutMs: 3000,
      now: () => 12345,
    });

    expect(summary).toEqual({
      checked: 1,
      updated: 1,
      errors: 0,
      diff: {
        before: 1,
        after: 2,
        added: 1,
      },
    });
    expect(applyBackgroundSeriesRefresh).toHaveBeenCalledWith(
      "dm5",
      "m123",
      expect.objectContaining({
        title: "Demo",
        url: "https://www.dm5.com/m123/",
      }),
      ["m2"],
    );
    expect(setBadge).toHaveBeenCalledWith(2);
    expect(fetchChapterPage).toHaveBeenCalledWith(
      "https://www.dm5.com/m123/",
      { includeCover: false },
    );
    expect(markSubscriptionCheckedByKey).toHaveBeenCalledWith(
      "dm5:m123",
      12345,
    );
  });

  it("establishes a baseline without reporting updates when the checkpoint is unavailable", async () => {
    const applyBackgroundSeriesRefresh = jest.fn().mockResolvedValue({
      updatesCount: 0,
    });
    const fetchChapterPage = jest.fn(() =>
      of({
        title: "Demo",
        chapterList: ["m3", "m2", "m1"],
        chapters: {
          m1: { title: "Ch 1", href: "https://www.dm5.com/m1/" },
          m2: { title: "Ch 2", href: "https://www.dm5.com/m2/" },
          m3: { title: "Ch 3", href: "https://www.dm5.com/m3/" },
        },
      }),
    );
    const getBackgroundSeriesState = jest
      .fn()
      .mockResolvedValueOnce({
        url: "https://www.dm5.com/empty/",
        cover: "",
        latestChapterID: "",
      })
      .mockResolvedValueOnce({
        url: "https://www.dm5.com/missing/",
        cover: "",
        latestChapterID: "m404",
      });

    const summary = await runBackgroundUpdateSummary({
      applyBackgroundSeriesRefresh,
      clearNotification: jest.fn(),
      createNotification: jest.fn(),
      getFetchChapterPage: jest.fn(() => fetchChapterPage),
      getManifestVersion: jest.fn(() => "4.0.99"),
      getRuntimeUrl: jest.fn((path: string) => `chrome-extension:///${path}`),
      getBackgroundSeriesState,
      getUpdateCount: jest.fn().mockResolvedValue(0),
      listSubscriptionKeys: jest
        .fn()
        .mockResolvedValue(["dm5:empty", "dm5:missing"]),
      markSubscriptionCheckedByKey: jest.fn(),
      openTab: jest.fn(),
      parseSeriesKey: jest.fn((seriesKey: string) => ({
        site: "dm5",
        comicsID: seriesKey.split(":")[1],
      })),
      reconcileExtensionReleaseState: jest.fn(),
      refreshExtensionReleaseState: jest.fn(),
      resetLibrary: jest.fn(),
      setBadge: jest.fn(),
      setLibraryVersion: jest.fn(),
    });

    expect(summary.updated).toBe(0);
    expect(applyBackgroundSeriesRefresh).toHaveBeenCalledTimes(2);
    expect(applyBackgroundSeriesRefresh).toHaveBeenCalledWith(
      "dm5",
      "empty",
      expect.objectContaining({ chapterList: ["m3", "m2", "m1"] }),
      [],
    );
    expect(applyBackgroundSeriesRefresh).toHaveBeenCalledWith(
      "dm5",
      "missing",
      expect.objectContaining({ chapterList: ["m3", "m2", "m1"] }),
      [],
    );
  });

  it("ignores chapters discovered behind the latest checkpoint", async () => {
    const applyBackgroundSeriesRefresh = jest.fn();
    const summary = await runBackgroundUpdateSummary({
      applyBackgroundSeriesRefresh,
      clearNotification: jest.fn(),
      createNotification: jest.fn(),
      getFetchChapterPage: jest.fn(() => () =>
        of({
          title: "Demo",
          chapterList: ["m3", "m2-backfill", "m2", "m1"],
          chapters: {
            m1: { title: "Ch 1", href: "https://www.dm5.com/m1/" },
            m2: { title: "Ch 2", href: "https://www.dm5.com/m2/" },
            "m2-backfill": {
              title: "Ch 2 extra",
              href: "https://www.dm5.com/m2-backfill/",
            },
            m3: { title: "Ch 3", href: "https://www.dm5.com/m3/" },
          },
        }),
      ),
      getManifestVersion: jest.fn(() => "4.0.99"),
      getRuntimeUrl: jest.fn((path: string) => `chrome-extension:///${path}`),
      getBackgroundSeriesState: jest.fn().mockResolvedValue({
        url: "https://www.dm5.com/m123/",
        cover: "cover.jpg",
        latestChapterID: "m3",
      }),
      getUpdateCount: jest.fn().mockResolvedValue(0),
      listSubscriptionKeys: jest.fn().mockResolvedValue(["dm5:m123"]),
      markSubscriptionCheckedByKey: jest.fn(),
      openTab: jest.fn(),
      parseSeriesKey: jest.fn(() => ({ site: "dm5", comicsID: "m123" })),
      reconcileExtensionReleaseState: jest.fn(),
      refreshExtensionReleaseState: jest.fn(),
      resetLibrary: jest.fn(),
      setBadge: jest.fn(),
      setLibraryVersion: jest.fn(),
    });

    expect(summary.updated).toBe(0);
    expect(applyBackgroundSeriesRefresh).not.toHaveBeenCalled();
  });

  it("times out a stalled subscription fetch and keeps processing the batch", async () => {
    const markSubscriptionCheckedByKey = jest.fn().mockResolvedValue(undefined);
    const fetchChapterPage = jest.fn((url: string) =>
      url.includes("m-stuck")
        ? NEVER
        : of({
            title: "Demo",
            chapterList: ["m2", "m1"],
            chapters: {
              m1: { title: "Ch 1", href: "https://www.dm5.com/m-ok/1" },
              m2: { title: "Ch 2", href: "https://www.dm5.com/m-ok/2" },
            },
          }),
    );
    const getBackgroundSeriesState = jest
      .fn()
      .mockResolvedValueOnce({
        url: "https://www.dm5.com/m-stuck/",
        cover: "",
        latestChapterID: "",
      })
      .mockResolvedValueOnce({
        url: "https://www.dm5.com/m-ok/",
        cover: "",
        latestChapterID: "m1",
      });
    const applyBackgroundSeriesRefresh = jest.fn().mockResolvedValue({
      updatesCount: 1,
    });

    const summary = await runBackgroundUpdateSummary(
      {
        applyBackgroundSeriesRefresh,
        clearNotification: jest.fn(),
        createNotification: jest.fn(),
        getFetchChapterPage: jest.fn(() => fetchChapterPage),
        getManifestVersion: jest.fn(() => "4.0.99"),
        getRuntimeUrl: jest.fn((path: string) => `chrome-extension:///${path}`),
        getBackgroundSeriesState,
        getUpdateCount: jest
          .fn()
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(1),
        listSubscriptionKeys: jest
          .fn()
          .mockResolvedValue(["dm5:m-stuck", "dm5:m-ok"]),
        markSubscriptionCheckedByKey,
        openTab: jest.fn(),
        parseSeriesKey: jest.fn((seriesKey: string) => ({
          site: "dm5",
          comicsID: seriesKey.split(":")[1],
        })),
        reconcileExtensionReleaseState: jest.fn(),
        refreshExtensionReleaseState: jest.fn(),
        resetLibrary: jest.fn(),
        setBadge: jest.fn(),
        setLibraryVersion: jest.fn(),
      },
      {
        batchSize: 10,
        concurrency: 2,
        timeoutMs: 1,
        now: () => 999,
      },
    );

    expect(summary).toEqual({
      checked: 2,
      updated: 1,
      errors: 1,
      diff: {
        before: 0,
        after: 1,
        added: 1,
      },
    });
    expect(applyBackgroundSeriesRefresh).toHaveBeenCalledWith(
      "dm5",
      "m-ok",
      expect.objectContaining({
        title: "Demo",
        url: "https://www.dm5.com/m-ok/",
      }),
      ["m2"],
    );
    expect(markSubscriptionCheckedByKey).toHaveBeenCalledWith(
      "dm5:m-stuck",
      999,
    );
    expect(markSubscriptionCheckedByKey).toHaveBeenCalledWith("dm5:m-ok", 999);
  });

  it("handles install and update lifecycle actions", async () => {
    const resetLibrary = jest.fn();
    const setLibraryVersion = jest.fn();
    const reconcileExtensionReleaseState = jest.fn();
    const createNotification = jest.fn();
    const deps = {
      applyBackgroundSeriesRefresh: jest.fn(),
      clearNotification: jest.fn(),
      createNotification,
      getFetchChapterPage: jest.fn(),
      getManifestVersion: jest.fn(() => "4.0.99"),
      getRuntimeUrl: jest.fn((path: string) => `chrome-extension:///${path}`),
      getBackgroundSeriesState: jest.fn(),
      getUpdateCount: jest.fn(),
      listSubscriptionKeys: jest.fn(),
      markSubscriptionCheckedByKey: jest.fn(),
      openTab: jest.fn(),
      parseSeriesKey: jest.fn(),
      reconcileExtensionReleaseState,
      refreshExtensionReleaseState: jest.fn(),
      resetLibrary,
      setBadge: jest.fn(),
      setLibraryVersion,
    };

    await handleExtensionInstalled({ reason: "install" }, deps);
    await handleExtensionInstalled({ reason: "update" }, deps);

    expect(resetLibrary).toHaveBeenCalledTimes(1);
    expect(setLibraryVersion).toHaveBeenCalledWith("4.0.99");
    expect(reconcileExtensionReleaseState).toHaveBeenCalledWith("4.0.99");
    expect(createNotification).toHaveBeenCalledWith(
      UPDATE_NOTIFICATION_ID,
      expect.objectContaining({
        title: UPDATE_NOTIFICATION_ID,
      }),
    );
  });

  it("notifies once when a newer extension release is available", async () => {
    const createNotification = jest.fn();

    const summary = await runBackgroundReleaseCheck(
      {
        applyBackgroundSeriesRefresh: jest.fn(),
        clearNotification: jest.fn(),
        createNotification,
        getFetchChapterPage: jest.fn(),
        getManifestVersion: jest.fn(() => "4.1.0"),
        getRuntimeUrl: jest.fn((path: string) => `chrome-extension:///${path}`),
        getBackgroundSeriesState: jest.fn(),
        getUpdateCount: jest.fn(),
        listSubscriptionKeys: jest.fn(),
        markSubscriptionCheckedByKey: jest.fn(),
        openTab: jest.fn(),
        parseSeriesKey: jest.fn(),
        reconcileExtensionReleaseState: jest.fn(),
        refreshExtensionReleaseState: jest.fn().mockResolvedValue({
          checkedAt: 123,
          latest: {
            version: "4.2.0",
            publishedAt: "2026-04-09T12:00:00.000Z",
            releaseUrl:
              "https://github.com/lemon0417/comic-scroller/releases/tag/v4.2.0",
          },
          notice: {
            latestVersion: "4.2.0",
            releaseUrl:
              "https://github.com/lemon0417/comic-scroller/releases/tag/v4.2.0",
            instructionsUrl:
              "https://lemon0417.github.io/comic-scroller/install/",
            publishedAt: "2026-04-09T12:00:00.000Z",
          },
          shouldNotify: true,
        }),
        resetLibrary: jest.fn(),
        setBadge: jest.fn(),
        setLibraryVersion: jest.fn(),
      },
      { now: () => 123 },
    );

    expect(summary).toEqual({
      updateAvailable: true,
      latestVersion: "4.2.0",
      notified: true,
    });
    expect(createNotification).toHaveBeenCalledWith(
      "https://github.com/lemon0417/comic-scroller/releases/tag/v4.2.0",
      expect.objectContaining({
        title: "Comics Scroller 有新版本",
      }),
    );
  });

  it("responds to dev ping messages with a background summary", async () => {
    const sendResponse = jest.fn();
    const runSummary = jest.fn().mockResolvedValue({ checked: 1 });

    const handled = handlePingBackgroundMessage(
      { msg: "PING_BACKGROUND" },
      sendResponse,
      {
        isDev: true,
        now: () => 123,
        runBackgroundUpdateSummary: runSummary as any,
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handled).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      at: 123,
      summary: { checked: 1 },
    });
  });

  it("responds when a dev ping background summary fails", async () => {
    const sendResponse = jest.fn();
    const runSummary = jest.fn().mockRejectedValue(new Error("boom"));

    const handled = handlePingBackgroundMessage(
      { msg: "PING_BACKGROUND" },
      sendResponse,
      {
        isDev: true,
        runBackgroundUpdateSummary: runSummary as any,
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handled).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      reason: "update-check-failed",
    });
  });

  it("resolves reader redirects and notification clicks", () => {
    const openTab = jest.fn();
    const clearNotification = jest.fn();

    const redirect = resolveReaderRedirect(
      "https://www.dm5.com/m123/",
      (path) => `chrome-extension:///${path}`,
    );
    handleNotificationClick("https://example.com/comic", {
      openTab,
      clearNotification,
    });
    handleNotificationClick(UPDATE_NOTIFICATION_ID, {
      openTab,
      clearNotification,
    });

    expect(redirect).toBe("chrome-extension:///app.html?site=dm5&chapter=m123");
    expect(openTab).toHaveBeenCalledWith({
      url: "https://example.com/comic",
    });
    expect(clearNotification).toHaveBeenCalledTimes(2);
  });

  it("only redirects supported DM5 hosts and chapter paths", () => {
    expect(
      resolveReaderRedirect(
        "https://tel.dm5.com/m1655813/",
        (path) => `chrome-extension:///${path}`,
      ),
    ).toBe("chrome-extension:///app.html?site=dm5&chapter=m1655813");

    expect(
      resolveReaderRedirect(
        "https://.dm5.com/m1655813/",
        (path) => `chrome-extension:///${path}`,
      ),
    ).toBe("");

    expect(
      resolveReaderRedirect(
        "https://www.dm5.com/manhua-demo/",
        (path) => `chrome-extension:///${path}`,
      ),
    ).toBe("");
  });

  it("does not redirect DM5 chapter links with the native-reader bypass marker", () => {
    expect(
      resolveReaderRedirect(
        "https://www.dm5.com/m1655813/?cs_open_native=1",
        (path) => `chrome-extension:///${path}`,
      ),
    ).toBe("");
  });
});
