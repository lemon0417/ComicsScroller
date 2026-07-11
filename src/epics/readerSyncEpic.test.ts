import { updateSubscribe } from "@domain/reducers/comics";
import { Subject } from "rxjs";

import readerSyncEpic from "./readerSyncEpic";

jest.mock("@infra/services/library/reader", () => ({
  getReaderSeriesSyncState: jest.fn(),
  subscribeToLibrarySignal: jest.fn(),
}));
jest.mock("@utils/devLog", () => ({
  devLog: jest.fn(),
}));
jest.mock("@utils/navigation", () => ({
  closeCurrentTab: jest.fn(),
}));

const { getReaderSeriesSyncState, subscribeToLibrarySignal } =
  jest.requireMock("@infra/services/library/reader");
const { closeCurrentTab } = jest.requireMock("@utils/navigation");

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function createSignal(seriesKeys: string[] = ["dm5:m123"]) {
  return {
    revision: "rev-1",
    changedAt: 1,
    source: "test",
    dbSchemaVersion: 1,
    scopes: ["updates"],
    seriesKeys,
  };
}

describe("readerSyncEpic", () => {
  let listener: ((signal: ReturnType<typeof createSignal>) => void) | null;
  let unsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    listener = null;
    unsubscribe = jest.fn();
    subscribeToLibrarySignal.mockImplementation((nextListener: typeof listener) => {
      listener = nextListener;
      return unsubscribe;
    });
    closeCurrentTab.mockResolvedValue(undefined);
  });

  it("ignores unrelated signals and updates subscription state for the current series", async () => {
    getReaderSeriesSyncState.mockResolvedValue({
      exists: true,
      subscribed: false,
    });
    const actions: unknown[] = [];
    const subscription = readerSyncEpic(new Subject(), {
      value: { comics: { seriesKey: "dm5:m123" } } as never,
    }).subscribe((action) => actions.push(action));

    listener?.(createSignal(["dm5:m999"]));
    expect(getReaderSeriesSyncState).not.toHaveBeenCalled();

    listener?.(createSignal());
    await flushPromises();

    expect(getReaderSeriesSyncState).toHaveBeenCalledWith("dm5:m123");
    expect(actions).toEqual([updateSubscribe(false)]);

    subscription.unsubscribe();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("recovers from query failures and closes the tab when the current series is removed", async () => {
    getReaderSeriesSyncState
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce({ exists: false, subscribed: false });
    const actions: unknown[] = [];
    const subscription = readerSyncEpic(new Subject(), {
      value: { comics: { seriesKey: "dm5:m123" } } as never,
    }).subscribe((action) => actions.push(action));

    listener?.(createSignal());
    await flushPromises();
    listener?.(createSignal());
    await flushPromises();

    expect(closeCurrentTab).toHaveBeenCalledTimes(1);
    expect(actions).toEqual([]);
    subscription.unsubscribe();
  });

  it("ignores an older query result after a newer signal", async () => {
    const first = createDeferred<{ exists: true; subscribed: boolean }>();
    const second = createDeferred<{ exists: true; subscribed: boolean }>();
    getReaderSeriesSyncState
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const actions: unknown[] = [];
    const subscription = readerSyncEpic(new Subject(), {
      value: { comics: { seriesKey: "dm5:m123" } } as never,
    }).subscribe((action) => actions.push(action));

    listener?.(createSignal());
    listener?.(createSignal());
    second.resolve({ exists: true, subscribed: false });
    await flushPromises();
    first.resolve({ exists: true, subscribed: true });
    await flushPromises();

    expect(actions).toEqual([updateSubscribe(false)]);
    subscription.unsubscribe();
  });

  it("keeps listening when closing a removed series tab fails", async () => {
    getReaderSeriesSyncState
      .mockResolvedValueOnce({ exists: false, subscribed: false })
      .mockResolvedValueOnce({ exists: true, subscribed: true });
    closeCurrentTab.mockRejectedValueOnce(new Error("cannot close"));
    const actions: unknown[] = [];
    const subscription = readerSyncEpic(new Subject(), {
      value: { comics: { seriesKey: "dm5:m123" } } as never,
    }).subscribe((action) => actions.push(action));

    listener?.(createSignal());
    await flushPromises();
    listener?.(createSignal());
    await flushPromises();

    expect(actions).toEqual([updateSubscribe(true)]);
    subscription.unsubscribe();
  });
});
