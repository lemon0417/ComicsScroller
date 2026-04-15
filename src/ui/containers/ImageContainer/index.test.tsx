import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";

jest.mock("react-redux", () => ({
  connect: () => (Component: unknown) => Component,
}));

import ImageContainer from "./index";

jest.mock("@components/ComicImage", () => ({
  __esModule: true,
  default: ({ index }: { index: number }) => (
    <div data-testid={`comic-image-${index}`}>{index}</div>
  ),
}));

type ImageContainerProps = {
  chapterLoadStatus: "failed" | "idle" | "loading" | "ready";
  fetchChapter: jest.Mock;
  imageListKey: string;
  imageResult: number[];
  innerHeight: number;
  requestedChapter: string;
  updateVisibleImageRange: jest.Mock;
};

const TestImageContainer = ImageContainer as unknown as ComponentType<ImageContainerProps>;

describe("ImageContainer", () => {
  it("renders a loading state when no images are available", () => {
    render(
      <TestImageContainer
        chapterLoadStatus="loading"
        fetchChapter={jest.fn()}
        imageListKey="reader-list"
        imageResult={[]}
        innerHeight={900}
        requestedChapter="m100"
        updateVisibleImageRange={jest.fn()}
      />,
    );

    expect(screen.getByText("載入中...")).toBeInTheDocument();
  });

  it("virtualizes image rows and reports the visible range", () => {
    const updateVisibleImageRange = jest.fn();
    const imageResult = Array.from({ length: 200 }, (_, index) => index);

    render(
      <TestImageContainer
        chapterLoadStatus="ready"
        fetchChapter={jest.fn()}
        imageListKey="m1"
        imageResult={imageResult}
        innerHeight={900}
        requestedChapter="m100"
        updateVisibleImageRange={updateVisibleImageRange}
      />,
    );

    expect(screen.getAllByTestId(/^comic-image-/).length).toBeLessThan(
      imageResult.length,
    );
    expect(updateVisibleImageRange).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("shows a retry button when the current chapter failed to load", () => {
    const fetchChapter = jest.fn();

    render(
      <TestImageContainer
        chapterLoadStatus="failed"
        fetchChapter={fetchChapter}
        imageListKey="reader-list"
        imageResult={[]}
        innerHeight={900}
        requestedChapter="m100"
        updateVisibleImageRange={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "重試" }));

    expect(screen.getByText("載入失敗")).toBeInTheDocument();
    expect(fetchChapter).toHaveBeenCalledWith("m100");
  });
});
