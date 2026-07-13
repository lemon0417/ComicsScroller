import type {
  LibraryUpdateRecord,
  SeriesKey,
  SiteKey,
} from "@domain/library";
import {
  buildSeriesKey,
  parseSeriesKey,
  SITE_KEYS,
  uniqueStrings,
} from "@domain/library";

import { HISTORY_LIMIT } from "./schema";

export type LibrarySyncChapterSummary = {
  title: string;
  href: string;
};

export type LibrarySyncSeriesStateV1 = {
  site: SiteKey;
  comicsID: string;
  title: string;
  cover: string;
  url: string;
  latestChapterID: string;
  lastReadChapterID: string;
  readChapterIDs: string[];
  chapterSummaries: Record<string, LibrarySyncChapterSummary>;
};

export type LibrarySyncStateV1 = {
  seriesByKey: Record<SeriesKey, LibrarySyncSeriesStateV1>;
  subscriptions: SeriesKey[];
  history: SeriesKey[];
  updates: LibraryUpdateRecord[];
};

export type LibrarySyncWireChapterV1 = {
  chapterID: string;
  title: string;
  href: string;
};

export type LibrarySyncWireSeriesV1 = {
  site: SiteKey;
  comicsID: string;
  title: string;
  cover: string;
  url: string;
  lastRead: string;
  chapters: LibrarySyncWireChapterV1[];
  read?: string[];
};

export type LibrarySyncWireRowsV1 = {
  series: LibrarySyncWireSeriesV1[];
  subscriptions: Array<{ seriesKey: string }>;
  history: string[];
  updates: LibraryUpdateRecord[];
};

type MergePreference = "local" | "remote";

function toRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  return input as Record<string, unknown>;
}

function normalizeChapterSummaries(input: unknown) {
  return Object.entries(toRecord(input)).reduce<
    Record<string, LibrarySyncChapterSummary>
  >((acc, [chapterID, summary]) => {
    if (!chapterID) return acc;
    const source = toRecord(summary);
    acc[chapterID] = {
      title: typeof source.title === "string" ? source.title : "",
      href: typeof source.href === "string" ? source.href : "",
    };
    return acc;
  }, {});
}

function normalizeSeriesState(
  input: Partial<LibrarySyncSeriesStateV1>,
): LibrarySyncSeriesStateV1 {
  const site = input.site as SiteKey;
  const comicsID = parseSeriesKey(
    buildSeriesKey(site, String(input.comicsID || "")),
  ).comicsID;
  const lastReadChapterID = String(input.lastReadChapterID || "");
  return {
    site,
    comicsID,
    title: String(input.title || ""),
    cover: String(input.cover || ""),
    url: String(input.url || ""),
    latestChapterID: String(input.latestChapterID || ""),
    lastReadChapterID,
    readChapterIDs: uniqueStrings([
      ...uniqueStrings(input.readChapterIDs),
      lastReadChapterID,
    ]),
    chapterSummaries: normalizeChapterSummaries(input.chapterSummaries),
  };
}

export function createEmptyLibrarySyncState(): LibrarySyncStateV1 {
  return {
    seriesByKey: {},
    subscriptions: [],
    history: [],
    updates: [],
  };
}

function mergeUpdates(
  primary: LibraryUpdateRecord[],
  secondary: LibraryUpdateRecord[],
) {
  const seen = new Set<string>();
  const result: LibraryUpdateRecord[] = [];
  for (const item of [...primary, ...secondary]) {
    const seriesKey = String(item?.seriesKey || "");
    const chapterID = String(item?.chapterID || "");
    const key = `${seriesKey}:${chapterID}`;
    if (!seriesKey || !chapterID || seen.has(key)) continue;
    seen.add(key);
    result.push({ seriesKey, chapterID });
  }
  return result;
}

function mergeChapterSummaries(
  primary: Record<string, LibrarySyncChapterSummary>,
  secondary: Record<string, LibrarySyncChapterSummary>,
) {
  return uniqueStrings([
    ...Object.keys(secondary),
    ...Object.keys(primary),
  ]).reduce<Record<string, LibrarySyncChapterSummary>>((acc, chapterID) => {
    acc[chapterID] = {
      title: primary[chapterID]?.title || secondary[chapterID]?.title || "",
      href: primary[chapterID]?.href || secondary[chapterID]?.href || "",
    };
    return acc;
  }, {});
}

function mergeSeriesState(
  local: LibrarySyncSeriesStateV1 | undefined,
  remote: LibrarySyncSeriesStateV1 | undefined,
  preference: MergePreference,
) {
  const fallback = local || remote;
  if (!fallback) return null;

  const empty = normalizeSeriesState({
    site: fallback.site,
    comicsID: fallback.comicsID,
  });
  const localState = local ? normalizeSeriesState(local) : empty;
  const remoteState = remote ? normalizeSeriesState(remote) : empty;
  const primary = preference === "remote" ? remoteState : localState;
  const secondary = preference === "remote" ? localState : remoteState;
  const lastReadChapterID =
    primary.lastReadChapterID || secondary.lastReadChapterID;

  return normalizeSeriesState({
    site: primary.site || secondary.site,
    comicsID: primary.comicsID || secondary.comicsID,
    title: primary.title || secondary.title,
    cover: primary.cover || secondary.cover,
    url: primary.url || secondary.url,
    latestChapterID:
      primary.latestChapterID || secondary.latestChapterID,
    lastReadChapterID,
    readChapterIDs: uniqueStrings([
      ...secondary.readChapterIDs,
      ...primary.readChapterIDs,
      lastReadChapterID,
    ]),
    chapterSummaries: mergeChapterSummaries(
      primary.chapterSummaries,
      secondary.chapterSummaries,
    ),
  });
}

export function mergeLibrarySyncStates(
  local: LibrarySyncStateV1,
  remote: LibrarySyncStateV1,
  preference: MergePreference = "local",
): LibrarySyncStateV1 {
  const result = createEmptyLibrarySyncState();
  const primary = preference === "remote" ? remote : local;
  const secondary = preference === "remote" ? local : remote;
  const seriesKeys = uniqueStrings([
    ...Object.keys(primary.seriesByKey || {}),
    ...Object.keys(secondary.seriesByKey || {}),
  ]);

  for (const seriesKey of seriesKeys) {
    const merged = mergeSeriesState(
      local.seriesByKey[seriesKey],
      remote.seriesByKey[seriesKey],
      preference,
    );
    if (merged) result.seriesByKey[seriesKey] = merged;
  }

  result.subscriptions = uniqueStrings([
    ...(primary.subscriptions || []),
    ...(secondary.subscriptions || []),
  ]).filter((seriesKey) => Boolean(result.seriesByKey[seriesKey]));
  result.history = uniqueStrings(
    [...(primary.history || []), ...(secondary.history || [])],
    HISTORY_LIMIT,
  ).filter((seriesKey) => Boolean(result.seriesByKey[seriesKey]));
  result.updates = mergeUpdates(
    primary.updates || [],
    secondary.updates || [],
  ).filter((item) => Boolean(result.seriesByKey[item.seriesKey]));

  return result;
}

export function syncWireRowsToState(input: unknown): LibrarySyncStateV1 {
  const source = toRecord(input);
  const result = createEmptyLibrarySyncState();
  const wireSeries = Array.isArray(source.series) ? source.series : [];

  for (const item of wireSeries) {
    const series = toRecord(item);
    const site = String(series.site || "") as SiteKey;
    const comicsID = String(series.comicsID || "");
    if (!SITE_KEYS.includes(site) || !comicsID) continue;

    const chapters = (Array.isArray(series.chapters) ? series.chapters : [])
      .map((chapter) => {
        const row = toRecord(chapter);
        return {
          chapterID: String(row.chapterID || ""),
          title: String(row.title || ""),
          href: String(row.href || ""),
        };
      })
      .filter((chapter) => Boolean(chapter.chapterID));
    const lastReadChapterID = String(series.lastRead || "");
    const seriesKey = buildSeriesKey(site, comicsID);
    result.seriesByKey[seriesKey] = normalizeSeriesState({
      site,
      comicsID,
      title: String(series.title || ""),
      cover: String(series.cover || ""),
      url: String(series.url || ""),
      latestChapterID: chapters[0]?.chapterID || "",
      lastReadChapterID,
      readChapterIDs: uniqueStrings([
        ...uniqueStrings(series.read),
        lastReadChapterID,
      ]),
      chapterSummaries: chapters.reduce<
        Record<string, LibrarySyncChapterSummary>
      >((acc, chapter) => {
        acc[chapter.chapterID] = {
          title: chapter.title,
          href: chapter.href,
        };
        return acc;
      }, {}),
    });
  }

  const knownSeriesKeys = new Set(Object.keys(result.seriesByKey));
  const subscriptions = Array.isArray(source.subscriptions)
    ? source.subscriptions
    : [];
  result.subscriptions = uniqueStrings(
    subscriptions.map((item) => String(toRecord(item).seriesKey || "")),
  ).filter((seriesKey) => knownSeriesKeys.has(seriesKey));
  result.history = uniqueStrings(source.history, HISTORY_LIMIT).filter(
    (seriesKey) => knownSeriesKeys.has(seriesKey),
  );
  result.updates = (Array.isArray(source.updates) ? source.updates : [])
    .map((item) => {
      const update = toRecord(item);
      return {
        seriesKey: String(update.seriesKey || ""),
        chapterID: String(update.chapterID || ""),
      };
    })
    .filter(
      (item) =>
        Boolean(item.chapterID) && knownSeriesKeys.has(item.seriesKey),
    );

  return result;
}

export function syncStateToWireRows(
  state: LibrarySyncStateV1,
): LibrarySyncWireRowsV1 {
  const updatesBySeriesKey = (state.updates || []).reduce<
    Record<string, string[]>
  >((acc, update) => {
    if (!update.seriesKey || !update.chapterID) return acc;
    acc[update.seriesKey] = uniqueStrings([
      ...(acc[update.seriesKey] || []),
      update.chapterID,
    ]);
    return acc;
  }, {});

  const knownSeriesKeys = new Set(Object.keys(state.seriesByKey || {}));
  return {
    series: Object.entries(state.seriesByKey || {}).map(
      ([seriesKey, rawSeries]) => {
        const series = normalizeSeriesState(rawSeries);
        const chapterIDs = uniqueStrings([
          series.latestChapterID,
          series.lastReadChapterID,
          ...series.readChapterIDs,
          ...(updatesBySeriesKey[seriesKey] || []),
        ]);
        return {
          site: series.site,
          comicsID: series.comicsID,
          title: series.title,
          cover: series.cover,
          url: series.url,
          lastRead: series.lastReadChapterID,
          chapters: chapterIDs.map((chapterID) => ({
            chapterID,
            title: series.chapterSummaries[chapterID]?.title || "",
            href: series.chapterSummaries[chapterID]?.href || "",
          })),
          ...(series.readChapterIDs.length > 0
            ? { read: series.readChapterIDs }
            : {}),
        };
      },
    ),
    subscriptions: uniqueStrings(state.subscriptions)
      .filter((seriesKey) => knownSeriesKeys.has(seriesKey))
      .map((seriesKey) => ({ seriesKey })),
    history: uniqueStrings(state.history, HISTORY_LIMIT).filter((seriesKey) =>
      knownSeriesKeys.has(seriesKey),
    ),
    updates: mergeUpdates(state.updates || [], []).filter((item) =>
      knownSeriesKeys.has(item.seriesKey),
    ),
  };
}
