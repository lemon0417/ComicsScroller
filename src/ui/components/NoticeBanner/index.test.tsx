import { fireEvent, render, screen } from "@testing-library/react";

import NoticeBanner from "./index";

describe("NoticeBanner", () => {
  it("announces error notices assertively", () => {
    render(<NoticeBanner tone="error" message="匯入失敗" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("匯入失敗");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });

  it("announces success and info notices politely", () => {
    const { rerender } = render(
      <NoticeBanner tone="success" message="匯出完成" />,
    );

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");

    rerender(<NoticeBanner tone="info" message="目前沒有更新" />);
    expect(screen.getByRole("status")).toHaveTextContent("目前沒有更新");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("calls dismiss when the close action is clicked", () => {
    const onDismiss = jest.fn();

    render(
      <NoticeBanner
        tone="info"
        message="目前沒有更新"
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "關閉" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
