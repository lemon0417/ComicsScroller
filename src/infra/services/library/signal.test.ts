import {
  emitLibrarySignal,
  withBatchedLibrarySignals,
} from "./shared";
import { subscribeToLibrarySignal } from "./signal";

describe("library signal", () => {
  let addListener: jest.Mock;
  let removeListener: jest.Mock;
  let setLocal: jest.Mock;
  let handler: ((changes: any, areaName: string) => void) | null;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = null;
    addListener = jest.fn((listener) => {
      handler = listener;
    });
    removeListener = jest.fn();
    setLocal = jest.fn((_items, callback) => callback?.());
    (global as any).chrome = {
      storage: {
        local: {
          set: setLocal,
        },
        onChanged: {
          addListener,
          removeListener,
        },
      },
    };
  });

  it("forwards library signals from chrome.storage.onChanged", () => {
    const listener = jest.fn();

    const unsubscribe = subscribeToLibrarySignal(listener);

    expect(addListener).toHaveBeenCalledTimes(1);
    handler?.(
      {
        librarySignal: {
          newValue: {
            revision: "rev-1",
            changedAt: 1,
            source: "test",
            dbSchemaVersion: 1,
            scopes: ["updates"],
            seriesKeys: ["dm5:m123"],
          },
        },
      },
      "local",
    );

    expect(listener).toHaveBeenCalledWith({
      revision: "rev-1",
      changedAt: 1,
      source: "test",
      dbSchemaVersion: 1,
      scopes: ["updates"],
      seriesKeys: ["dm5:m123"],
    });

    unsubscribe();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it("merges concurrent invalidations into one library signal", async () => {
    await withBatchedLibrarySignals(async () => {
      await Promise.all([
        emitLibrarySignal("backgroundRefresh", ["series"], ["dm5:m1"]),
        emitLibrarySignal("backgroundRefresh", ["updates"], ["dm5:m2"]),
      ]);
    });

    expect(setLocal).toHaveBeenCalledTimes(1);
    expect(setLocal.mock.calls[0][0].librarySignal).toMatchObject({
      source: "backgroundRefresh",
      scopes: ["series", "updates"],
      seriesKeys: ["dm5:m1", "dm5:m2"],
    });
  });

  it("flushes successful invalidations when a batched operation fails", async () => {
    await expect(
      withBatchedLibrarySignals(async () => {
        await emitLibrarySignal(
          "backgroundRefresh",
          ["series", "updates"],
          ["dm5:m1"],
        );
        throw new Error("later refresh failed");
      }),
    ).rejects.toThrow("later refresh failed");

    expect(setLocal).toHaveBeenCalledTimes(1);
    expect(setLocal.mock.calls[0][0].librarySignal).toMatchObject({
      scopes: ["series", "updates"],
      seriesKeys: ["dm5:m1"],
    });
  });
});
