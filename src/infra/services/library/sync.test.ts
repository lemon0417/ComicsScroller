import type { LibrarySnapshotV2, SeriesRecord } from "./schema";
import {
  buildSeriesKey,
  createEmptyLibrarySnapshot,
} from "./schema";
import { mergeLibrarySyncSnapshots } from "./sync";

function createSeriesRecord(
  overrides: Partial<SeriesRecord> = {},
): SeriesRecord {
  return {
    site: "dm5",
    comicsID: "m1",
    title: "Demo",
    cover: "cover.jpg",
    url: "https://dm5.com/m1",
    chapterList: [],
    chapters: {},
    lastRead: "",
    read: [],
    ...overrides,
  };
}

function createSnapshot(version = "1.0.0"): LibrarySnapshotV2 {
  return createEmptyLibrarySnapshot(version);
}

describe("library sync merge", () => {
  it("prefers newer remote fields while preserving local reading data", () => {
    const seriesKey = buildSeriesKey("dm5", "m1");
    const remoteOnlyKey = buildSeriesKey("dm5", "m2");
    const local = createSnapshot();
    local.seriesByKey[seriesKey] = createSeriesRecord({
      title: "Local title",
      lastRead: "c2",
      chapterList: ["c2"],
      chapters: {
        c2: {
          title: "Chapter 2",
          href: "https://dm5.com/c2",
        },
      },
      read: ["c2"],
    });
    local.subscriptions = [seriesKey];
    local.history = [seriesKey];
    local.updates = [{ seriesKey, chapterID: "c2" }];

    const remote = createSnapshot();
    remote.seriesByKey[seriesKey] = createSeriesRecord({
      title: "Remote title",
      lastRead: "c3",
      chapterList: ["c3"],
      chapters: {
        c3: {
          title: "Chapter 3",
          href: "https://dm5.com/c3",
        },
      },
      read: ["c3"],
    });
    remote.seriesByKey[remoteOnlyKey] = createSeriesRecord({
      comicsID: "m2",
      title: "Remote only",
    });
    remote.subscriptions = [remoteOnlyKey];
    remote.history = [remoteOnlyKey];
    remote.updates = [{ seriesKey, chapterID: "c3" }];

    const merged = mergeLibrarySyncSnapshots(local, remote, "remote");

    expect(merged.seriesByKey[seriesKey]).toMatchObject({
      title: "Remote title",
      lastRead: "c3",
      chapters: {
        c2: {
          title: "Chapter 2",
          href: "https://dm5.com/c2",
        },
        c3: {
          title: "Chapter 3",
          href: "https://dm5.com/c3",
        },
      },
      read: ["c2", "c3"],
    });
    expect(merged.seriesByKey[seriesKey].chapterList).toEqual(["c3", "c2"]);
    expect(merged.seriesByKey[remoteOnlyKey]?.title).toBe("Remote only");
    expect(merged.subscriptions).toEqual([remoteOnlyKey, seriesKey]);
    expect(merged.history).toEqual([remoteOnlyKey, seriesKey]);
    expect(merged.updates).toEqual([
      { seriesKey, chapterID: "c3" },
      { seriesKey, chapterID: "c2" },
    ]);
  });
});
