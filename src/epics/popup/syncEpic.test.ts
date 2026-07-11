import { requestPopupData } from "@domain/actions/popup";
import {
  hydratePopupFeed,
  setPopupNotice,
} from "@domain/reducers/popupState";
import { Subject } from "rxjs";

import popupSyncEpic from "./syncEpic";

jest.mock("@infra/services/library/popup", () => ({
  getPopupFeedSnapshot: jest.fn(),
  subscribeToLibrarySignal: jest.fn(),
}));
jest.mock("@infra/services/extensionRelease", () => ({
  getExtensionReleaseNotice: jest.fn(() => Promise.resolve(null)),
  subscribeToExtensionReleaseState: jest.fn(),
}));

const { getPopupFeedSnapshot, subscribeToLibrarySignal } = jest.requireMock(
  "@infra/services/library/popup",
);
const { subscribeToExtensionReleaseState } = jest.requireMock(
  "@infra/services/extensionRelease",
);

const emptyFeed = {
  update: [],
  subscribe: [],
  history: [],
  continueReading: null,
};

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

describe("popupSyncEpic", () => {
  let libraryListener: (() => void) | null;
  let unsubscribeLibrary: jest.Mock;
  let unsubscribeRelease: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    libraryListener = null;
    unsubscribeLibrary = jest.fn();
    unsubscribeRelease = jest.fn();
    subscribeToLibrarySignal.mockImplementation((listener: () => void) => {
      libraryListener = listener;
      return unsubscribeLibrary;
    });
    subscribeToExtensionReleaseState.mockImplementation(() => unsubscribeRelease);
  });

  it("refreshes the popup feed with the popup limit and cleans up listeners", async () => {
    getPopupFeedSnapshot.mockResolvedValue(emptyFeed);
    const action$ = new Subject<any>();
    const actions: unknown[] = [];
    const subscription = popupSyncEpic(action$, { value: {} as never }).subscribe(
      (action) => actions.push(action),
    );

    action$.next(requestPopupData("popup"));
    action$.next(requestPopupData("manage"));
    libraryListener?.();
    await flushPromises();

    expect(subscribeToLibrarySignal).toHaveBeenCalledTimes(1);
    expect(subscribeToExtensionReleaseState).toHaveBeenCalledTimes(1);
    expect(getPopupFeedSnapshot).toHaveBeenCalledWith({ updateLimit: 50 });
    expect(actions).toEqual([hydratePopupFeed(emptyFeed, "load")]);

    subscription.unsubscribe();
    expect(unsubscribeLibrary).toHaveBeenCalledTimes(1);
    expect(unsubscribeRelease).toHaveBeenCalledTimes(1);
  });

  it("emits an error notice and remains subscribed after a refresh failure", async () => {
    getPopupFeedSnapshot
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce(emptyFeed);
    const action$ = new Subject<any>();
    const actions: unknown[] = [];
    const subscription = popupSyncEpic(action$, { value: {} as never }).subscribe(
      (action) => actions.push(action),
    );

    action$.next(requestPopupData("manage"));
    libraryListener?.();
    await flushPromises();
    libraryListener?.();
    await flushPromises();

    expect(actions).toEqual([
      setPopupNotice("目前無法載入書庫資料，請稍後再試。"),
      hydratePopupFeed(emptyFeed, "load"),
    ]);
    subscription.unsubscribe();
  });

  it("ignores an older refresh result after a newer signal", async () => {
    const first = createDeferred<typeof emptyFeed>();
    const second = createDeferred<typeof emptyFeed>();
    const newerFeed = { ...emptyFeed, updatesTruncated: true };
    getPopupFeedSnapshot
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const action$ = new Subject<any>();
    const actions: unknown[] = [];
    const subscription = popupSyncEpic(action$, { value: {} as never }).subscribe(
      (action) => actions.push(action),
    );

    action$.next(requestPopupData("manage"));
    libraryListener?.();
    libraryListener?.();
    second.resolve(newerFeed);
    await flushPromises();
    first.resolve(emptyFeed);
    await flushPromises();

    expect(actions).toEqual([hydratePopupFeed(newerFeed, "load")]);
    subscription.unsubscribe();
  });
});
