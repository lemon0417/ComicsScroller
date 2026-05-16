import { render, screen } from "@testing-library/react";

import Button, { ButtonLink } from "./index";

describe("Button", () => {
  it("renders a secondary button by default", () => {
    render(<Button>管理</Button>);

    const button = screen.getByRole("button", { name: "管理" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("ds-btn-secondary");
  });

  it("maps variants to design-system classes", () => {
    const { rerender } = render(<Button variant="primary">閱讀</Button>);

    expect(screen.getByRole("button", { name: "閱讀" })).toHaveClass(
      "ds-btn-primary",
    );

    rerender(<Button variant="danger">重置資料</Button>);
    expect(screen.getByRole("button", { name: "重置資料" })).toHaveClass(
      "ds-btn-danger",
    );

    rerender(<Button variant="link">稍後</Button>);
    expect(screen.getByRole("button", { name: "稍後" })).toHaveClass(
      "ds-link-button",
    );
  });

  it("allows explicit button type and custom classes", () => {
    render(
      <Button type="submit" className="extra-class">
        送出
      </Button>,
    );

    const button = screen.getByRole("button", { name: "送出" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveClass("ds-btn-secondary", "extra-class");
  });
});

describe("ButtonLink", () => {
  it("renders an anchor with button styling", () => {
    render(
      <ButtonLink
        href="https://example.com"
        target="_blank"
        rel="noreferrer"
        variant="primary"
      >
        前往章節頁
      </ButtonLink>,
    );

    const link = screen.getByRole("link", { name: "前往章節頁" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
    expect(link).toHaveClass("ds-btn-primary");
  });
});
