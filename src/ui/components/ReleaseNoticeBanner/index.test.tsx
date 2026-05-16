import { fireEvent, render, screen } from "@testing-library/react";

import ReleaseNoticeBanner from "./index";

jest.mock("@utils/navigation", () => ({
  openExternalUrl: jest.fn(),
}));

const { openExternalUrl } = jest.requireMock("@utils/navigation") as {
  openExternalUrl: jest.Mock;
};

const releaseNotice = {
  latestVersion: "4.2.0",
  releaseUrl:
    "https://github.com/lemon0417/comic-scroller/releases/tag/v4.2.0",
  instructionsUrl: "https://lemon0417.github.io/comic-scroller/install/",
  publishedAt: "2026-04-09T12:00:00.000Z",
};

describe("ReleaseNoticeBanner", () => {
  beforeEach(() => {
    openExternalUrl.mockClear();
  });

  it("renders popup copy and supports update instructions and dismiss", () => {
    const onDismiss = jest.fn();

    render(
      <ReleaseNoticeBanner
        density="popup"
        notice={releaseNotice}
        onDismiss={onDismiss}
      />,
    );

    expect(
      screen.getByText("Comics Scroller 4.2.0 已發布，請手動更新擴充套件。"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "更新說明" }));
    fireEvent.click(screen.getByRole("button", { name: "稍後" }));

    expect(openExternalUrl).toHaveBeenCalledWith(releaseNotice.instructionsUrl);
    expect(onDismiss).toHaveBeenCalledWith("4.2.0");
  });

  it("falls back to the release URL when instructions are missing", () => {
    render(
      <ReleaseNoticeBanner
        density="popup"
        notice={{ ...releaseNotice, instructionsUrl: "" }}
        onDismiss={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: "更新說明" }));

    expect(openExternalUrl).toHaveBeenCalledWith(releaseNotice.releaseUrl);
  });

  it("renders manage copy and opens the GitHub Release link", () => {
    const onDismiss = jest.fn();

    render(
      <ReleaseNoticeBanner
        className="mb-4"
        density="manage"
        notice={releaseNotice}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText("Comics Scroller 4.2.0 已發布")).toBeInTheDocument();
    expect(
      screen.getByText(
        "目前需手動更新，請前往更新說明或 GitHub Release 重新安裝最新版。",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "GitHub Release" }));
    fireEvent.click(screen.getByRole("button", { name: "稍後提醒" }));

    expect(openExternalUrl).toHaveBeenCalledWith(releaseNotice.releaseUrl);
    expect(onDismiss).toHaveBeenCalledWith("4.2.0");
  });
});
