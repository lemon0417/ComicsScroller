import { render, screen } from "@testing-library/react";

import Button from "../Button";
import ReaderStateCard from "./index";

describe("ReaderStateCard", () => {
  it("renders title, description, and actions", () => {
    render(
      <ReaderStateCard
        title="載入失敗"
        description="請稍後再試。"
      >
        <Button>重試</Button>
      </ReaderStateCard>,
    );

    expect(screen.getByText("載入失敗")).toHaveClass("reader-paywall-title");
    expect(screen.getByText("請稍後再試。")).toHaveClass("reader-paywall-desc");
    expect(screen.getByRole("button", { name: "重試" })).toBeInTheDocument();
  });

  it("does not render an empty description node", () => {
    const { container } = render(<ReaderStateCard title="載入失敗" />);

    expect(screen.getByText("載入失敗")).toBeInTheDocument();
    expect(container.querySelector(".reader-paywall-desc")).not.toBeInTheDocument();
  });
});
