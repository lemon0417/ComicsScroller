import { updateRead } from "@domain/actions/reader";
import comics, {
  updateChapterList,
  updateChapterNowIndex,
  updateChapters,
  updateSiteInfo,
  updateTitle,
} from "@domain/reducers/comics";
import { of } from "rxjs";

import readerLocationEpic from "./readerLocationEpic";

function createReaderState() {
  let state = comics(undefined, { type: "@@INIT" });
  state = comics(state, updateSiteInfo("dm5", "https://www.dm5.com"));
  state = comics(state, updateTitle("Demo"));
  state = comics(
    state,
    updateChapters({
      c2: { title: "Chapter 2" },
      c1: { title: "Chapter 1" },
    }),
  );
  state = comics(state, updateChapterList(["c2", "c1"]));
  return comics(state, updateChapterNowIndex(0));
}

describe("readerLocationEpic", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    window.history.replaceState({}, "", "/");
  });

  it.each([
    ["initial chapter resolution", updateChapterNowIndex(1)],
    ["read progress", updateRead(1)],
  ])("syncs the URL after %s", (_scenario, action) => {
    window.history.replaceState(
      {},
      "",
      "/app.html?site=dm5&chapter=c2",
    );
    document.title = "Demo Chapter 2";
    const state = comics(createReaderState(), action);
    const replaceState = jest.spyOn(window.history, "replaceState");

    const output$ = readerLocationEpic(of(action), {
      value: { comics: state },
    } as any);
    const emittedActions: unknown[] = [];
    output$.subscribe((outputAction) => emittedActions.push(outputAction));

    expect(emittedActions).toEqual([]);
    expect(replaceState).toHaveBeenCalledWith(
      {},
      "Demo Chapter 1",
      "?site=dm5&chapter=c1",
    );
    expect(window.location.search).toBe("?site=dm5&chapter=c1");
    expect(document.title).toBe("Demo Chapter 1");
  });
});
