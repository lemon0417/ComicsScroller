import {
  getImageRenderMetrics,
  getReaderImageRowHeight,
  READER_HEADER_HEIGHT,
  READER_IMAGE_GAP,
} from "./readerLayout";

describe("readerLayout", () => {
  it("caps wide image height to the viewport-aware maximum", () => {
    const layout = getImageRenderMetrics({
      type: "wide",
      naturalWidth: 1200,
      naturalHeight: 1000,
      innerWidth: 1280,
      innerHeight: 900,
    });

    expect(layout).toEqual({
      width: 974,
      height: 812,
      type: "wide",
    });
  });

  it("reserves full-screen height for paywall cards", () => {
    const layout = getImageRenderMetrics({
      type: "paywall",
      height: 0,
      innerWidth: 1024,
      innerHeight: 900,
    });

    expect(layout.height).toBe(900 - READER_HEADER_HEIGHT - 40);
    expect(layout.width).toBe(976);
    expect(layout.type).toBe("paywall");
  });

  it("scales natural image width and height", () => {
    const layout = getImageRenderMetrics({
      type: "natural",
      naturalWidth: 1000,
      naturalHeight: 2000,
      innerWidth: 1280,
      innerHeight: 900,
      imageScale: 0.5,
    });

    expect(layout).toEqual({
      width: 560,
      height: 1120,
      type: "natural",
    });
  });

  it("caps enlarged images to the viewport width", () => {
    const layout = getImageRenderMetrics({
      type: "natural",
      naturalWidth: 1000,
      naturalHeight: 1500,
      innerWidth: 1280,
      innerHeight: 900,
      imageScale: 1.25,
    });

    expect(layout.width).toBe(1280);
    expect(layout.height).toBe(1920);
  });

  it("does not scale terminal cards", () => {
    const layout = getImageRenderMetrics({
      type: "paywall",
      height: 0,
      innerWidth: 1024,
      innerHeight: 900,
      imageScale: 0.5,
    });

    expect(layout.height).toBe(900 - READER_HEADER_HEIGHT - 40);
    expect(layout.width).toBe(976);
  });

  it("uses rendered card height when calculating virtual row height", () => {
    expect(
      getReaderImageRowHeight({
        type: "paywall",
        height: 320,
        innerWidth: 1024,
        innerHeight: 900,
      }),
    ).toBe(900 - READER_HEADER_HEIGHT - 40 + READER_IMAGE_GAP * 2);
    expect(
      getReaderImageRowHeight({
        type: "end",
        height: 72,
        innerWidth: 1024,
        innerHeight: 900,
      }),
    ).toBe(72 + READER_IMAGE_GAP * 2);
  });
});
