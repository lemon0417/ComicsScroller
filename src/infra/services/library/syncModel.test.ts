import { buildSeriesKey } from "./schema";
import type {
  LibrarySyncSeriesStateV1,
  LibrarySyncStateV1,
} from "./syncModel";
import {
  createEmptyLibrarySyncState,
  mergeLibrarySyncStates,
  syncStateToWireRows,
  syncWireRowsToState,
} from "./syncModel";

function createSeriesState(
  overrides: Partial<LibrarySyncSeriesStateV1> = {},
): LibrarySyncSeriesStateV1 {
  return {
    site: "dm5",
    comicsID: "m1",
    title: "Demo",
    cover: "cover.jpg",
    url: "https://dm5.com/m1",
    latestChapterID: "",
    lastReadChapterID: "",
    readChapterIDs: [],
    chapterSummaries: {},
    ...overrides,
  };
}

function createState(): LibrarySyncStateV1 {
  return createEmptyLibrarySyncState();
}

describe("library sync model", () => {
  it("round-trips the v1 wire shape while keeping latest chapter explicit", () => {
    const seriesKey = buildSeriesKey("dm5", "m1");
    const state = createState();
    state.seriesByKey[seriesKey] = createSeriesState({
      latestChapterID: "c3",
      lastReadChapterID: "c2",
      readChapterIDs: ["c2", "c1"],
      chapterSummaries: {
        c3: { title: "Chapter 3", href: "https://dm5.com/c3" },
        c2: { title: "Chapter 2", href: "https://dm5.com/c2" },
        c1: { title: "Chapter 1", href: "https://dm5.com/c1" },
        cached: { title: "Cached", href: "https://dm5.com/cached" },
      },
    });
    state.subscriptions = [seriesKey];
    state.history = [seriesKey];
    state.updates = [{ seriesKey, chapterID: "c3" }];

    const wire = syncStateToWireRows(state);
    expect(wire.series[0].chapters.map((chapter) => chapter.chapterID)).toEqual([
      "c3",
      "c2",
      "c1",
    ]);
    expect(wire.series[0].chapters).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ chapterID: "cached" }),
      ]),
    );

    const restored = syncWireRowsToState(wire);
    expect(restored.seriesByKey[seriesKey]).toMatchObject({
      latestChapterID: "c3",
      lastReadChapterID: "c2",
      readChapterIDs: ["c2", "c1"],
      chapterSummaries: {
        c3: { title: "Chapter 3", href: "https://dm5.com/c3" },
        c2: { title: "Chapter 2", href: "https://dm5.com/c2" },
        c1: { title: "Chapter 1", href: "https://dm5.com/c1" },
      },
    });
  });

  it("prefers newer remote fields while preserving local reading data", () => {
    const seriesKey = buildSeriesKey("dm5", "m1");
    const remoteOnlyKey = buildSeriesKey("dm5", "m2");
    const local = createState();
    local.seriesByKey[seriesKey] = createSeriesState({
      title: "Local title",
      latestChapterID: "c2",
      lastReadChapterID: "c2",
      readChapterIDs: ["c2"],
      chapterSummaries: {
        c2: { title: "Chapter 2", href: "https://dm5.com/c2" },
      },
    });
    local.subscriptions = [seriesKey];
    local.history = [seriesKey];
    local.updates = [{ seriesKey, chapterID: "c2" }];

    const remote = createState();
    remote.seriesByKey[seriesKey] = createSeriesState({
      title: "Remote title",
      latestChapterID: "c3",
      lastReadChapterID: "c3",
      readChapterIDs: ["c3"],
      chapterSummaries: {
        c2: { title: "", href: "" },
        c3: { title: "Chapter 3", href: "https://dm5.com/c3" },
      },
    });
    remote.seriesByKey[remoteOnlyKey] = createSeriesState({
      comicsID: "m2",
      title: "Remote only",
    });
    remote.subscriptions = [remoteOnlyKey];
    remote.history = [remoteOnlyKey];
    remote.updates = [{ seriesKey, chapterID: "c3" }];

    const merged = mergeLibrarySyncStates(local, remote, "remote");

    expect(merged.seriesByKey[seriesKey]).toMatchObject({
      title: "Remote title",
      latestChapterID: "c3",
      lastReadChapterID: "c3",
      readChapterIDs: ["c2", "c3"],
      chapterSummaries: {
        c2: { title: "Chapter 2", href: "https://dm5.com/c2" },
        c3: { title: "Chapter 3", href: "https://dm5.com/c3" },
      },
    });
    expect(merged.seriesByKey[remoteOnlyKey]?.title).toBe("Remote only");
    expect(merged.subscriptions).toEqual([remoteOnlyKey, seriesKey]);
    expect(merged.history).toEqual([remoteOnlyKey, seriesKey]);
    expect(merged.updates).toEqual([
      { seriesKey, chapterID: "c3" },
      { seriesKey, chapterID: "c2" },
    ]);
  });
});
