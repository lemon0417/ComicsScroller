import {
  openLibraryDb,
  requestToPromise,
  transactionDone,
} from "./db";
import {
  createSeriesRow,
  loadRowsByPositionInTransaction,
  loadUpdatesInTransaction,
  writeOrderedSeriesKeysInTransaction,
} from "./rows";
import type {
  ChapterRow,
  HistoryRow,
  LibraryDumpRowsV2,
  LibraryDumpSeriesV2,
  LibrarySnapshotV2,
  ReadRow,
  SeriesRow,
  SubscriptionRow,
  UpdateRow,
} from "./schema";
import {
  CHAPTERS_STORE,
  HISTORY_LIMIT,
  HISTORY_STORE,
  READS_STORE,
  SERIES_STORE,
  SUBSCRIPTIONS_STORE,
  uniqueStrings,
  UPDATES_STORE,
} from "./schema";
import {
  emitLibrarySignal,
  ensureLibraryReady,
} from "./shared";

export type LibrarySyncProjection = {
  data: LibraryDumpRowsV2;
  subscriptionCheckedAtByKey: Record<string, number>;
};

function groupChapterIDsBySeriesKey(rows: ReadRow[] | UpdateRow[]) {
  return rows.reduce<Record<string, string[]>>((acc, row) => {
    if (!row.seriesKey || !row.chapterID) {
      return acc;
    }
    acc[row.seriesKey] = uniqueStrings([
      ...(acc[row.seriesKey] || []),
      row.chapterID,
    ]);
    return acc;
  }, {});
}

function buildChapterLookupKey(seriesKey: string, chapterID: string) {
  return `${seriesKey}::${chapterID}`;
}

function createProjectedSeries(
  row: SeriesRow,
  chapterIDs: string[],
  chaptersByKey: Record<string, ChapterRow>,
  readChapterIDs: string[],
): LibraryDumpSeriesV2 {
  return {
    site: row.site,
    comicsID: row.comicsID,
    title: row.title,
    cover: row.cover,
    url: row.url,
    lastRead: row.lastRead,
    chapters: chapterIDs.map((chapterID) => {
      const chapter = chaptersByKey[
        buildChapterLookupKey(row.seriesKey, chapterID)
      ];
      const isLatest = chapterID === row.latestChapterID;
      const isLastRead = chapterID === row.lastRead;
      return {
        chapterID,
        title:
          chapter?.title ||
          (isLatest ? row.latestChapterTitle : "") ||
          (isLastRead ? row.lastReadTitle : ""),
        href:
          chapter?.href ||
          (isLatest ? row.latestChapterHref : "") ||
          (isLastRead ? row.lastReadHref : ""),
      };
    }),
    ...(readChapterIDs.length > 0 ? { read: readChapterIDs } : {}),
  };
}

export async function readLibrarySyncProjection(): Promise<LibrarySyncProjection> {
  await ensureLibraryReady();
  const db = await openLibraryDb();
  const rowsTransaction = db.transaction(
    [SERIES_STORE, READS_STORE, SUBSCRIPTIONS_STORE, HISTORY_STORE, UPDATES_STORE],
    "readonly",
  );
  const rowsDone = transactionDone(rowsTransaction);
  const [series, reads, subscriptions, history, updates] = await Promise.all([
    requestToPromise<SeriesRow[]>(
      rowsTransaction.objectStore(SERIES_STORE).getAll(),
    ),
    requestToPromise<ReadRow[]>(rowsTransaction.objectStore(READS_STORE).getAll()),
    loadRowsByPositionInTransaction<SubscriptionRow>(
      rowsTransaction.objectStore(SUBSCRIPTIONS_STORE),
    ),
    loadRowsByPositionInTransaction<HistoryRow>(
      rowsTransaction.objectStore(HISTORY_STORE),
    ),
    loadUpdatesInTransaction(rowsTransaction.objectStore(UPDATES_STORE)),
  ]);
  await rowsDone;

  const readsBySeriesKey = groupChapterIDsBySeriesKey(reads);
  const updatesBySeriesKey = groupChapterIDsBySeriesKey(updates);
  const chapterIDsBySeriesKey = series.reduce<Record<string, string[]>>(
    (acc, row) => {
      acc[row.seriesKey] = uniqueStrings([
        row.latestChapterID,
        row.lastRead,
        ...(readsBySeriesKey[row.seriesKey] || []),
        ...(updatesBySeriesKey[row.seriesKey] || []),
      ]);
      return acc;
    },
    {},
  );
  const chapterLookups = Object.entries(chapterIDsBySeriesKey).flatMap(
    ([seriesKey, chapterIDs]) =>
      chapterIDs.map((chapterID) => ({ seriesKey, chapterID })),
  );
  const chaptersByKey: Record<string, ChapterRow> = {};

  if (chapterLookups.length > 0) {
    const chaptersTransaction = db.transaction([CHAPTERS_STORE], "readonly");
    const chaptersDone = transactionDone(chaptersTransaction);
    const chaptersStore = chaptersTransaction.objectStore(CHAPTERS_STORE);
    const chapterRows = await Promise.all(
      chapterLookups.map(({ seriesKey, chapterID }) =>
        requestToPromise<ChapterRow | undefined>(
          chaptersStore.get([seriesKey, chapterID]),
        ),
      ),
    );
    chapterRows.forEach((chapter) => {
      if (!chapter) return;
      chaptersByKey[
        buildChapterLookupKey(chapter.seriesKey, chapter.chapterID)
      ] = chapter;
    });
    await chaptersDone;
  }

  const knownSeriesKeys = new Set(series.map((row) => row.seriesKey));
  return {
    data: {
      series: series.map((row) =>
        createProjectedSeries(
          row,
          chapterIDsBySeriesKey[row.seriesKey] || [],
          chaptersByKey,
          readsBySeriesKey[row.seriesKey] || [],
        ),
      ),
      subscriptions: subscriptions
        .filter((row) => knownSeriesKeys.has(row.seriesKey))
        .map((row) => ({ seriesKey: row.seriesKey })),
      history: history
        .map((row) => row.seriesKey)
        .filter((seriesKey) => knownSeriesKeys.has(seriesKey))
        .slice(0, HISTORY_LIMIT),
      updates: updates
        .filter((row) => knownSeriesKeys.has(row.seriesKey))
        .map((row) => ({
          seriesKey: row.seriesKey,
          chapterID: row.chapterID,
        })),
    },
    subscriptionCheckedAtByKey: subscriptions.reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.seriesKey] = Number(row.checkedAt || 0);
        return acc;
      },
      {},
    ),
  };
}

async function upsertProjectedChapters(
  chaptersStore: IDBObjectStore,
  seriesKey: string,
  chapterList: string[],
  chapters: LibrarySnapshotV2["seriesByKey"][string]["chapters"],
) {
  const existingRows = await requestToPromise<ChapterRow[]>(
    chaptersStore.index("seriesKey").getAll(seriesKey),
  );
  const existingByChapterID = new Map(
    existingRows.map((row) => [row.chapterID, row]),
  );
  let minOrderIndex = existingRows.reduce(
    (minimum, row) => Math.min(minimum, row.orderIndex),
    0,
  );
  let maxOrderIndex = existingRows.reduce(
    (maximum, row) => Math.max(maximum, row.orderIndex),
    -1,
  );

  for (let index = 0; index < chapterList.length; index += 1) {
    const chapterID = chapterList[index];
    const chapter = chapters[chapterID];
    const existing = existingByChapterID.get(chapterID);
    const orderIndex = existing
      ? existing.orderIndex
      : index === 0
        ? --minOrderIndex
        : ++maxOrderIndex;
    await requestToPromise(
      chaptersStore.put({
        seriesKey,
        chapterID,
        title: chapter?.title || existing?.title || "",
        href: chapter?.href || existing?.href || "",
        orderIndex,
      }),
    );
  }
}

export async function applyLibrarySyncSnapshot(
  snapshot: LibrarySnapshotV2,
  subscriptionCheckedAtByKey: Record<string, number>,
) {
  await ensureLibraryReady();
  const db = await openLibraryDb();
  const transaction = db.transaction(
    [SERIES_STORE, CHAPTERS_STORE, READS_STORE, SUBSCRIPTIONS_STORE, HISTORY_STORE, UPDATES_STORE],
    "readwrite",
  );
  const done = transactionDone(transaction);
  const seriesStore = transaction.objectStore(SERIES_STORE);
  const chaptersStore = transaction.objectStore(CHAPTERS_STORE);
  const readsStore = transaction.objectStore(READS_STORE);
  const subscriptionsStore = transaction.objectStore(SUBSCRIPTIONS_STORE);
  const historyStore = transaction.objectStore(HISTORY_STORE);
  const updatesStore = transaction.objectStore(UPDATES_STORE);

  for (const [seriesKey, record] of Object.entries(snapshot.seriesByKey)) {
    const previousRow = await requestToPromise<SeriesRow | undefined>(
      seriesStore.get(seriesKey),
    );
    await requestToPromise(
      seriesStore.put(createSeriesRow(seriesKey, record, { previousRow })),
    );
    await upsertProjectedChapters(
      chaptersStore,
      seriesKey,
      record.chapterList,
      record.chapters,
    );
    for (const chapterID of uniqueStrings(record.read)) {
      await requestToPromise(readsStore.put({ seriesKey, chapterID }));
    }
  }

  await writeOrderedSeriesKeysInTransaction(
    subscriptionsStore,
    snapshot.subscriptions,
    (seriesKey) => ({
      checkedAt: Number(subscriptionCheckedAtByKey[seriesKey] || 0),
    }),
  );
  await writeOrderedSeriesKeysInTransaction(
    historyStore,
    snapshot.history.slice(0, HISTORY_LIMIT),
  );
  await requestToPromise(updatesStore.clear());
  for (let position = 0; position < snapshot.updates.length; position += 1) {
    const update = snapshot.updates[position];
    await requestToPromise(
      updatesStore.put({
        seriesKey: update.seriesKey,
        chapterID: update.chapterID,
        position,
      }),
    );
  }

  await done;
  await emitLibrarySignal(
    "library-sync",
    ["series", "subscriptions", "history", "updates"],
    Object.keys(snapshot.seriesByKey),
  );
}
