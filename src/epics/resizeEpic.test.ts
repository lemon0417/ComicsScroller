import { updateInnerHeight, updateInnerWidth } from "@domain/reducers/comics";
import { NEVER } from "rxjs";

import resizeEpic from "./resizeEpic";

describe("resizeEpic", () => {
  it("emits the initial viewport and the latest trailing resize", () => {
    jest.useFakeTimers();

    Object.defineProperty(window, "innerHeight", {
      value: 700,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "innerWidth", {
      value: 1200,
      configurable: true,
      writable: true,
    });

    const output$ = resizeEpic(NEVER, {
      value: undefined as never,
    });

    const actions: any[] = [];
    const subscription = output$.subscribe((action: any) =>
      actions.push(action),
    );

    expect(actions).toEqual([
      updateInnerHeight(700),
      updateInnerWidth(1200),
    ]);

    window.innerHeight = 740;
    window.innerWidth = 1240;
    window.dispatchEvent(new Event("resize"));
    window.innerHeight = 777;
    window.innerWidth = 1280;
    window.dispatchEvent(new Event("resize"));
    jest.advanceTimersByTime(100);

    expect(actions.slice(-2)).toEqual([
      updateInnerHeight(777),
      updateInnerWidth(1280),
    ]);

    subscription.unsubscribe();
    jest.useRealTimers();
  });

  it("registers one listener and removes it on unsubscribe", () => {
    const addEventListener = jest.spyOn(window, "addEventListener");
    const removeEventListener = jest.spyOn(window, "removeEventListener");
    const subscription = resizeEpic(NEVER, {
      value: undefined as never,
    }).subscribe();

    expect(
      addEventListener.mock.calls.filter(([event]) => event === "resize"),
    ).toHaveLength(1);

    subscription.unsubscribe();

    expect(
      removeEventListener.mock.calls.filter(([event]) => event === "resize"),
    ).toHaveLength(1);
    addEventListener.mockRestore();
    removeEventListener.mockRestore();
  });
});
