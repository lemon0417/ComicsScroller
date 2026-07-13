import type {
  LibrarySyncStatus,
  LibraryUpdateRecord,
  SeriesRecord,
} from "@domain/library";
import {
  createEmptyLibrarySyncStatus,
} from "@domain/library";

import type {
  LibraryDumpRowsV2,
  LibrarySnapshotV2,
} from "./schema";
import {
  buildSeriesKey,
  createEmptyLibrarySnapshot,
  getExtensionVersion,
  HISTORY_LIMIT,
  normalizeSeriesRecord,
  uniqueStrings,
} from "./schema";
import {
  compactDumpRowsToSnapshot,
} from "./shared";
import {
  applyLibrarySyncSnapshot,
  readLibrarySyncProjection,
} from "./syncPersistence";

export const LIBRARY_SYNC_STATE_KEY = "librarySyncState";
export const LIBRARY_SYNC_MAX_PAYLOAD_BYTES = 90 * 1024;

const LIBRARY_SYNC_MANIFEST_KEY = "librarySyncManifest";
const LIBRARY_SYNC_CHUNK_PREFIX = "librarySyncChunk:";
const LIBRARY_SYNC_PAYLOAD_FORMAT = "comic-scroller-library-sync";
const LIBRARY_SYNC_PAYLOAD_FORMAT_VERSION = 1;
const LIBRARY_SYNC_CHUNK_SIZE = 6000;

type StoredLibrarySyncState = {
  enabled?: boolean;
  deviceId?: string;
  lastSyncedAt?: number;
  lastRemoteUpdatedAt?: number;
  lastError?: string;
  payloadBytes?: number;
};

type LibrarySyncManifest = {
  format: typeof LIBRARY_SYNC_PAYLOAD_FORMAT;
  formatVersion: typeof LIBRARY_SYNC_PAYLOAD_FORMAT_VERSION;
  updatedAt: number;
  deviceId: string;
  chunkCount: number;
  payloadBytes: number;
};

type LibrarySyncPayload = {
  format: typeof LIBRARY_SYNC_PAYLOAD_FORMAT;
  formatVersion: typeof LIBRARY_SYNC_PAYLOAD_FORMAT_VERSION;
  updatedAt: number;
  deviceId: string;
  data: LibraryDumpRowsV2;
};

type RemoteLibrarySyncPayload = {
  manifest: LibrarySyncManifest;
  payload: LibrarySyncPayload;
  snapshot: LibrarySnapshotV2;
};

type MergePreference = "local" | "remote";

function toRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  return input as Record<string, unknown>;
}

function toPositiveNumber(input: unknown) {
  const value = Number(input || 0);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error || "同步失敗");
}

function getStorageArea(kind: "local" | "sync") {
  if (typeof chrome === "undefined") {
    return null;
  }
  return chrome.storage?.[kind] || null;
}

function getChromeStorageError() {
  if (typeof chrome === "undefined") {
    return "";
  }
  const error = (
    chrome.runtime as typeof chrome.runtime & { lastError?: unknown }
  )?.lastError;
  if (!error) {
    return "";
  }
  if (typeof error === "string") {
    return error;
  }
  const message = toRecord(error).message;
  return typeof message === "string" ? message : String(error);
}

function isStorageAvailable() {
  return Boolean(getStorageArea("local") && getStorageArea("sync"));
}

function storageGet(
  area: chrome.storage.StorageArea | null,
  keys: string | string[] | null,
): Promise<Record<string, unknown>> {
  if (!area) {
    return Promise.reject(new Error("Chrome storage is not available."));
  }
  return new Promise((resolve, reject) => {
    area.get(keys ?? undefined, (items) => {
      const error = getChromeStorageError();
      if (error) {
        reject(new Error(error));
        return;
      }
      resolve((items || {}) as Record<string, unknown>);
    });
  });
}

function storageSet(
  area: chrome.storage.StorageArea | null,
  items: Record<string, unknown>,
): Promise<void> {
  if (!area) {
    return Promise.reject(new Error("Chrome storage is not available."));
  }
  return new Promise((resolve, reject) => {
    area.set(items, () => {
      const error = getChromeStorageError();
      if (error) {
        reject(new Error(error));
        return;
      }
      resolve();
    });
  });
}

function storageRemove(
  area: chrome.storage.StorageArea | null,
  keys: string[],
): Promise<void> {
  if (!area || keys.length === 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    area.remove(keys, () => {
      const error = getChromeStorageError();
      if (error) {
        reject(new Error(error));
        return;
      }
      resolve();
    });
  });
}

function normalizeStoredSyncState(input: unknown): StoredLibrarySyncState {
  const source = toRecord(input);
  return {
    enabled: Boolean(source.enabled),
    deviceId: typeof source.deviceId === "string" ? source.deviceId : "",
    lastSyncedAt: toPositiveNumber(source.lastSyncedAt),
    lastRemoteUpdatedAt: toPositiveNumber(source.lastRemoteUpdatedAt),
    lastError: typeof source.lastError === "string" ? source.lastError : "",
    payloadBytes: toPositiveNumber(source.payloadBytes),
  };
}

function compactStoredSyncState(state: StoredLibrarySyncState) {
  const result: StoredLibrarySyncState = {
    enabled: Boolean(state.enabled),
  };
  if (state.deviceId) result.deviceId = state.deviceId;
  if (state.lastSyncedAt) result.lastSyncedAt = state.lastSyncedAt;
  if (state.lastRemoteUpdatedAt) {
    result.lastRemoteUpdatedAt = state.lastRemoteUpdatedAt;
  }
  if (state.lastError) result.lastError = state.lastError;
  if (state.payloadBytes) result.payloadBytes = state.payloadBytes;
  return result;
}

async function readLocalSyncState() {
  const items = await storageGet(getStorageArea("local"), [LIBRARY_SYNC_STATE_KEY]);
  return normalizeStoredSyncState(items[LIBRARY_SYNC_STATE_KEY]);
}

async function writeLocalSyncState(state: StoredLibrarySyncState) {
  await storageSet(getStorageArea("local"), {
    [LIBRARY_SYNC_STATE_KEY]: compactStoredSyncState(state),
  });
}

function createDeviceId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureLocalSyncState() {
  const state = await readLocalSyncState();
  if (state.deviceId) {
    return state;
  }
  const next = {
    ...state,
    deviceId: createDeviceId(),
  };
  await writeLocalSyncState(next);
  return next;
}

function getUtf8ByteLength(input: string) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(input).length;
  }
  return unescape(encodeURIComponent(input)).length;
}

function chunkString(input: string) {
  const chunks: string[] = [];
  for (let index = 0; index < input.length; index += LIBRARY_SYNC_CHUNK_SIZE) {
    chunks.push(input.slice(index, index + LIBRARY_SYNC_CHUNK_SIZE));
  }
  return chunks.length > 0 ? chunks : [""];
}

function getChunkKey(index: number) {
  return `${LIBRARY_SYNC_CHUNK_PREFIX}${index}`;
}

function isLibrarySyncManifest(input: unknown): input is LibrarySyncManifest {
  const source = toRecord(input);
  return (
    source.format === LIBRARY_SYNC_PAYLOAD_FORMAT &&
    source.formatVersion === LIBRARY_SYNC_PAYLOAD_FORMAT_VERSION &&
    typeof source.deviceId === "string" &&
    Number.isFinite(Number(source.updatedAt)) &&
    Number.isFinite(Number(source.chunkCount)) &&
    Number.isFinite(Number(source.payloadBytes))
  );
}

function normalizeLibrarySyncManifest(input: unknown) {
  if (!isLibrarySyncManifest(input)) {
    return null;
  }
  return {
    format: LIBRARY_SYNC_PAYLOAD_FORMAT,
    formatVersion: LIBRARY_SYNC_PAYLOAD_FORMAT_VERSION,
    updatedAt: Number(input.updatedAt),
    deviceId: input.deviceId,
    chunkCount: Number(input.chunkCount),
    payloadBytes: Number(input.payloadBytes),
  } satisfies LibrarySyncManifest;
}

function isLibrarySyncPayload(input: unknown): input is LibrarySyncPayload {
  const source = toRecord(input);
  const data = source.data;
  return (
    source.format === LIBRARY_SYNC_PAYLOAD_FORMAT &&
    source.formatVersion === LIBRARY_SYNC_PAYLOAD_FORMAT_VERSION &&
    typeof source.deviceId === "string" &&
    Number.isFinite(Number(source.updatedAt)) &&
    Boolean(data && typeof data === "object" && !Array.isArray(data))
  );
}

async function readRemoteManifest() {
  const items = await storageGet(getStorageArea("sync"), [LIBRARY_SYNC_MANIFEST_KEY]);
  return normalizeLibrarySyncManifest(items[LIBRARY_SYNC_MANIFEST_KEY]);
}

async function readRemotePayload(): Promise<RemoteLibrarySyncPayload | null> {
  const manifest = await readRemoteManifest();
  if (!manifest || manifest.chunkCount <= 0) {
    return null;
  }

  const chunkKeys = Array.from({ length: manifest.chunkCount }, (_, index) =>
    getChunkKey(index),
  );
  const items = await storageGet(getStorageArea("sync"), chunkKeys);
  const payloadText = chunkKeys.map((key) => String(items[key] || "")).join("");
  if (!payloadText) {
    return null;
  }

  const parsed = JSON.parse(payloadText) as unknown;
  if (!isLibrarySyncPayload(parsed)) {
    return null;
  }

  return {
    manifest,
    payload: parsed,
    snapshot: compactDumpRowsToSnapshot(parsed.data),
  };
}

function pickSeriesScalar(
  local: SeriesRecord,
  remote: SeriesRecord,
  key: keyof Pick<SeriesRecord, "title" | "cover" | "url" | "lastRead">,
  preference: MergePreference,
) {
  const primary = preference === "remote" ? remote : local;
  const secondary = preference === "remote" ? local : remote;
  return primary[key] || secondary[key] || "";
}

function mergeSeriesRecord(
  local: SeriesRecord | undefined,
  remote: SeriesRecord | undefined,
  preference: MergePreference,
) {
  const fallback = local || remote;
  if (!fallback) {
    return null;
  }

  const localRecord = local
    ? normalizeSeriesRecord(local.site, local.comicsID, local)
    : normalizeSeriesRecord(fallback.site, fallback.comicsID, {});
  const remoteRecord = remote
    ? normalizeSeriesRecord(remote.site, remote.comicsID, remote)
    : normalizeSeriesRecord(fallback.site, fallback.comicsID, {});
  const site = localRecord.site || remoteRecord.site;
  const comicsID = localRecord.comicsID || remoteRecord.comicsID;
  const primary = preference === "remote" ? remoteRecord : localRecord;
  const secondary = preference === "remote" ? localRecord : remoteRecord;

  return normalizeSeriesRecord(site, comicsID, {
    title: pickSeriesScalar(localRecord, remoteRecord, "title", preference),
    cover: pickSeriesScalar(localRecord, remoteRecord, "cover", preference),
    url: pickSeriesScalar(localRecord, remoteRecord, "url", preference),
    lastRead: pickSeriesScalar(localRecord, remoteRecord, "lastRead", preference),
    chapterList: uniqueStrings([
      ...(primary.chapterList || []),
      ...(secondary.chapterList || []),
    ]),
    chapters: {
      ...(secondary.chapters || {}),
      ...(primary.chapters || {}),
    },
    read: uniqueStrings([
      ...(secondary.read || []),
      ...(primary.read || []),
    ]),
  });
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
    if (!seriesKey || !chapterID || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({ seriesKey, chapterID });
  }
  return result;
}

export function mergeLibrarySyncSnapshots(
  local: LibrarySnapshotV2,
  remote: LibrarySnapshotV2,
  preference: MergePreference = "local",
): LibrarySnapshotV2 {
  const result = createEmptyLibrarySnapshot(
    local.version || remote.version || getExtensionVersion(),
  );
  const primary = preference === "remote" ? remote : local;
  const secondary = preference === "remote" ? local : remote;
  const seriesKeys = uniqueStrings([
    ...Object.keys(primary.seriesByKey || {}),
    ...Object.keys(secondary.seriesByKey || {}),
  ]);

  for (const seriesKey of seriesKeys) {
    const merged = mergeSeriesRecord(
      local.seriesByKey[seriesKey],
      remote.seriesByKey[seriesKey],
      preference,
    );
    if (merged) {
      result.seriesByKey[seriesKey] = merged;
    }
  }

  result.subscriptions = uniqueStrings([
    ...(primary.subscriptions || []),
    ...(secondary.subscriptions || []),
  ]).filter((seriesKey) => !!result.seriesByKey[seriesKey]);
  result.history = uniqueStrings([
    ...(primary.history || []),
    ...(secondary.history || []),
  ], HISTORY_LIMIT).filter((seriesKey) => !!result.seriesByKey[seriesKey]);
  result.updates = mergeUpdates(primary.updates || [], secondary.updates || [])
    .filter((item) => !!result.seriesByKey[item.seriesKey]);

  return result;
}

function toSyncRows(snapshot: LibrarySnapshotV2): LibraryDumpRowsV2 {
  const updatesBySeriesKey = (snapshot.updates || []).reduce<
    Record<string, string[]>
  >((acc, update) => {
    if (!update.seriesKey || !update.chapterID) {
      return acc;
    }
    acc[update.seriesKey] = uniqueStrings([
      ...(acc[update.seriesKey] || []),
      update.chapterID,
    ]);
    return acc;
  }, {});

  return {
    series: Object.values(snapshot.seriesByKey || {}).map((record) => {
      const normalized = normalizeSeriesRecord(record.site, record.comicsID, record);
      const seriesKey = buildSeriesKey(normalized.site, normalized.comicsID);
      const chapterIDs = uniqueStrings([
        normalized.chapterList[0],
        normalized.lastRead,
        ...(normalized.read || []),
        ...(updatesBySeriesKey[seriesKey] || []),
      ]);

      return {
        site: normalized.site,
        comicsID: normalized.comicsID,
        title: normalized.title,
        cover: normalized.cover,
        url: normalized.url,
        lastRead: normalized.lastRead,
        chapters: chapterIDs
          .map((chapterID) => ({
            chapterID,
            title: normalized.chapters[chapterID]?.title || "",
            href: normalized.chapters[chapterID]?.href || "",
          }))
          .filter((chapter) => !!chapter.chapterID),
        ...(normalized.read.length > 0
          ? { read: uniqueStrings(normalized.read) }
          : {}),
      };
    }),
    subscriptions: uniqueStrings(snapshot.subscriptions).map((seriesKey) => ({
      seriesKey,
    })),
    history: uniqueStrings(snapshot.history, HISTORY_LIMIT),
    updates: mergeUpdates(snapshot.updates || [], []),
  };
}

async function writeRemoteSnapshot(
  snapshot: LibrarySnapshotV2,
  state: StoredLibrarySyncState,
) {
  const now = Date.now();
  const deviceId = state.deviceId || createDeviceId();
  const payload: LibrarySyncPayload = {
    format: LIBRARY_SYNC_PAYLOAD_FORMAT,
    formatVersion: LIBRARY_SYNC_PAYLOAD_FORMAT_VERSION,
    updatedAt: now,
    deviceId,
    data: toSyncRows(snapshot),
  };
  const payloadText = JSON.stringify(payload);
  const payloadBytes = getUtf8ByteLength(payloadText);
  if (payloadBytes > LIBRARY_SYNC_MAX_PAYLOAD_BYTES) {
    throw new Error(
      `同步資料 ${payloadBytes} bytes 超過 Chrome Sync 安全配額 ${LIBRARY_SYNC_MAX_PAYLOAD_BYTES} bytes。`,
    );
  }

  const chunks = chunkString(payloadText);
  const previousManifest = await readRemoteManifest().catch(() => null);
  const syncItems = chunks.reduce<Record<string, unknown>>((acc, chunk, index) => {
    acc[getChunkKey(index)] = chunk;
    return acc;
  }, {});
  syncItems[LIBRARY_SYNC_MANIFEST_KEY] = {
    format: LIBRARY_SYNC_PAYLOAD_FORMAT,
    formatVersion: LIBRARY_SYNC_PAYLOAD_FORMAT_VERSION,
    updatedAt: now,
    deviceId,
    chunkCount: chunks.length,
    payloadBytes,
  } satisfies LibrarySyncManifest;

  await storageSet(getStorageArea("sync"), syncItems);

  const staleChunkKeys = Array.from(
    { length: previousManifest?.chunkCount || 0 },
    (_, index) => getChunkKey(index),
  ).filter((_, index) => index >= chunks.length);
  await storageRemove(getStorageArea("sync"), staleChunkKeys);

  const nextState = {
    ...state,
    deviceId,
    lastSyncedAt: now,
    lastRemoteUpdatedAt: now,
    lastError: "",
    payloadBytes,
  };
  await writeLocalSyncState(nextState);
  return getLibrarySyncStatus();
}

async function recordSyncError(
  error: unknown,
  state?: StoredLibrarySyncState,
) {
  const currentState =
    state || (await readLocalSyncState().catch(() => normalizeStoredSyncState({})));
  await writeLocalSyncState({
    ...currentState,
    lastError: toErrorMessage(error),
  });
  return getLibrarySyncStatus();
}

export async function getLibrarySyncStatus(): Promise<LibrarySyncStatus> {
  const available = isStorageAvailable();
  const state = await readLocalSyncState()
    .catch(() => normalizeStoredSyncState({}));
  const manifest = available
    ? await readRemoteManifest().catch(() => null)
    : null;

  return createEmptyLibrarySyncStatus({
    enabled: Boolean(state.enabled),
    available,
    lastSyncedAt: state.lastSyncedAt,
    remoteUpdatedAt: manifest?.updatedAt || state.lastRemoteUpdatedAt,
    lastError: state.lastError,
    payloadBytes: manifest?.payloadBytes || state.payloadBytes,
    quotaBytes: LIBRARY_SYNC_MAX_PAYLOAD_BYTES,
  });
}

export async function setLibrarySyncEnabled(enabled: boolean) {
  const state = await ensureLocalSyncState();
  await writeLocalSyncState({
    ...state,
    enabled,
    lastError: "",
  });
  return getLibrarySyncStatus();
}

export async function syncLibraryNow() {
  const state = await ensureLocalSyncState();
  if (!state.enabled) {
    return getLibrarySyncStatus();
  }

  try {
    const localProjection = await readLibrarySyncProjection();
    const localSnapshot = compactDumpRowsToSnapshot(localProjection.data);
    const remotePayload = await readRemotePayload();
    const remoteIsNewer = Boolean(
      remotePayload?.manifest.updatedAt &&
      remotePayload.manifest.updatedAt > (state.lastRemoteUpdatedAt || 0),
    );
    const mergedSnapshot = remotePayload
      ? mergeLibrarySyncSnapshots(
          localSnapshot,
          remotePayload.snapshot,
          remoteIsNewer ? "remote" : "local",
        )
      : localSnapshot;

    if (remotePayload) {
      await applyLibrarySyncSnapshot(
        mergedSnapshot,
        localProjection.subscriptionCheckedAtByKey,
      );
    }

    return writeRemoteSnapshot(mergedSnapshot, {
      ...state,
      lastRemoteUpdatedAt: remotePayload?.manifest.updatedAt || state.lastRemoteUpdatedAt,
    });
  } catch (error) {
    return recordSyncError(error, state);
  }
}

export async function pushLibrarySyncIfEnabled() {
  const state = await readLocalSyncState()
    .catch(() => normalizeStoredSyncState({}));
  if (!state.enabled) {
    return getLibrarySyncStatus();
  }

  try {
    const projection = await readLibrarySyncProjection();
    return writeRemoteSnapshot(compactDumpRowsToSnapshot(projection.data), {
      ...state,
      deviceId: state.deviceId || createDeviceId(),
    });
  } catch (error) {
    return recordSyncError(error, state);
  }
}
