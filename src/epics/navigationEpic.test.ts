import {
  fetchImgList,
  navigateChapter,
  updateRead,
} from "@domain/actions/reader";
import { resetImg, updateChapterLatestIndex } from "@domain/reducers/comics";
import { of } from "rxjs";

import navigationEpic from "./navigationEpic";

describe("navigationEpic", () => {
  it("dispatches the expected navigation sequence", () => {
    const action$ = of(navigateChapter(3));
    const output$ = navigationEpic(action$, {
      value: undefined as never,
    });

    const actions: any[] = [];
    output$.subscribe((action: any) => actions.push(action));

    expect(actions).toEqual([
      resetImg(),
      updateRead(3),
      updateChapterLatestIndex(3),
      fetchImgList(3),
    ]);
  });
});
