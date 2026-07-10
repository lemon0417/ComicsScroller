import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";

jest.mock("react-redux", () => ({
  connect: () => (Component: unknown) => Component,
}));

import App from "./index";

jest.mock("@infra/services/library/reader", () => ({
  getReaderSeriesSyncState: jest.fn(async () => ({
    exists: true,
    subscribed: true,
  })),
  subscribeToLibrarySignal: jest.fn(() => () => undefined),
}));

jest.mock("@containers/ImageContainer", () => ({
  __esModule: true,
  default: () => <div data-testid="image-container" />,
}));

jest.mock("@containers/ChapterList", () => ({
  __esModule: true,
  default: () => <div data-testid="chapter-list" />,
}));

const TestApp = App as unknown as ComponentType<any>;

describe("App", () => {
  beforeEach(() => {
    (global as any).chrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn(),
        },
      },
      tabs: {
        getCurrent: jest.fn(),
        remove: jest.fn(),
      },
    };
    window.history.replaceState({}, "", "/app.html");
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => null,
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: jest.fn(() => Promise.resolve()),
    });
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: jest.fn(() => Promise.resolve()),
    });
  });

  it("renders accessible reader header controls", () => {
    const startResize = jest.fn();

    const { container } = render(
      <TestApp
        startResize={startResize}
        fetchChapter={jest.fn()}
        updateSubscribe={jest.fn()}
        toggleSubscribe={jest.fn()}
        navigateChapter={jest.fn()}
        prevable={true}
        nextable={false}
        chapterTitle="Ch 1123"
        chapterList={["chapter-1123"]}
        title="One Piece"
        subscribe={true}
        url="https://dm5.com/one-piece"
        chapterNowIndex={0}
        site="dm5"
        comicsID="123"
        seriesKey="dm5:m123"
      />,
    );

    expect(startResize).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "開啟章節列表" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "上一章" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "下一章" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "取消追蹤" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "進入全螢幕" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "縮放 100%" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("toolbar", { name: "圖片縮放工具" }),
    ).not.toBeInTheDocument();
    expect(container.querySelector(".reader-zoom-mode")).toBeNull();
    expect(screen.getByRole("link", { name: "One Piece" })).toHaveAttribute(
      "href",
      "https://dm5.com/one-piece",
    );
    expect(screen.getByText("Ch 1123")).toBeInTheDocument();
  });

  it("toggles fullscreen from the reader header", async () => {
    const requestFullscreen = jest.fn(() => Promise.resolve());

    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: requestFullscreen,
    });

    render(
      <TestApp
        startResize={jest.fn()}
        fetchChapter={jest.fn()}
        updateSubscribe={jest.fn()}
        toggleSubscribe={jest.fn()}
        navigateChapter={jest.fn()}
        prevable={true}
        nextable={true}
        chapterTitle="Ch 1123"
        chapterList={["chapter-1123"]}
        title="One Piece"
        subscribe={false}
        url="https://dm5.com/one-piece"
        chapterNowIndex={0}
        site="dm5"
        comicsID="123"
        seriesKey="dm5:m123"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "進入全螢幕" }));

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it("opens and manually closes the secondary zoom toolbar", () => {
    render(
      <TestApp
        canUseSelectedReaderZoom={true}
        readerZoomPercent={90}
        startResize={jest.fn()}
        fetchChapter={jest.fn()}
        updateSubscribe={jest.fn()}
        toggleSubscribe={jest.fn()}
        navigateChapter={jest.fn()}
        prevable={true}
        nextable={true}
        chapterTitle="Ch 1123"
        chapterList={["chapter-1123"]}
        title="One Piece"
        subscribe={false}
        url="https://dm5.com/one-piece"
        chapterNowIndex={0}
        site="dm5"
        comicsID="123"
        seriesKey="dm5:m123"
      />,
    );

    const trigger = screen.getByRole("button", { name: "縮放 90%" });

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("toolbar", { name: "圖片縮放工具" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "關閉縮放工具" }));

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    screen.getByRole("button", { name: "關閉縮放工具" }).focus();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      screen.queryByRole("toolbar", { name: "圖片縮放工具" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("dispatches reader zoom actions from the header", () => {
    const adjustReaderImageScale = jest.fn();
    const resetReaderImageScale = jest.fn();
    const setReaderZoomTarget = jest.fn();

    render(
      <TestApp
        adjustReaderImageScale={adjustReaderImageScale}
        canDecreaseReaderZoom={true}
        canIncreaseReaderZoom={true}
        canUseSelectedReaderZoom={true}
        readerZoomPercent={90}
        readerZoomTarget="selected"
        resetReaderImageScale={resetReaderImageScale}
        setReaderZoomTarget={setReaderZoomTarget}
        startResize={jest.fn()}
        fetchChapter={jest.fn()}
        updateSubscribe={jest.fn()}
        toggleSubscribe={jest.fn()}
        navigateChapter={jest.fn()}
        prevable={true}
        nextable={true}
        chapterTitle="Ch 1123"
        chapterList={["chapter-1123"]}
        title="One Piece"
        subscribe={false}
        url="https://dm5.com/one-piece"
        chapterNowIndex={0}
        site="dm5"
        comicsID="123"
        seriesKey="dm5:m123"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "縮放 90%" }));

    fireEvent.click(screen.getByRole("button", { name: "全部" }));
    fireEvent.click(screen.getByRole("button", { name: "縮小圖片" }));
    fireEvent.click(screen.getByRole("button", { name: "放大圖片" }));
    fireEvent.click(
      screen.getByRole("button", { name: "重設圖片縮放，目前 90%" }),
    );

    expect(setReaderZoomTarget).toHaveBeenCalledWith("all");
    expect(adjustReaderImageScale).toHaveBeenCalledWith(-0.1);
    expect(adjustReaderImageScale).toHaveBeenCalledWith(0.1);
    expect(resetReaderImageScale).toHaveBeenCalledWith("selected");
  });

  it("only fetches the initial chapter once across rerenders", () => {
    const fetchChapter = jest.fn();

    window.history.replaceState({}, "", "/app.html?site=dm5&chapter=chapter-1123");

    const { rerender } = render(
      <TestApp
        startResize={jest.fn()}
        fetchChapter={fetchChapter}
        updateSubscribe={jest.fn()}
        toggleSubscribe={jest.fn()}
        navigateChapter={jest.fn()}
        prevable={true}
        nextable={false}
        chapterTitle="Ch 1123"
        chapterList={["chapter-1123"]}
        title="One Piece"
        subscribe={true}
        url="https://dm5.com/one-piece"
        chapterNowIndex={0}
        site="dm5"
        comicsID=""
        seriesKey=""
      />,
    );

    rerender(
      <TestApp
        startResize={jest.fn()}
        fetchChapter={fetchChapter}
        updateSubscribe={jest.fn()}
        toggleSubscribe={jest.fn()}
        navigateChapter={jest.fn()}
        prevable={true}
        nextable={false}
        chapterTitle="Ch 1123"
        chapterList={["chapter-1123"]}
        title="One Piece"
        subscribe={true}
        url="https://dm5.com/one-piece"
        chapterNowIndex={0}
        site="dm5"
        comicsID="123"
        seriesKey="dm5:m123"
      />,
    );

    expect(fetchChapter).toHaveBeenCalledTimes(1);
    expect(fetchChapter).toHaveBeenCalledWith("chapter-1123");
  });
});
