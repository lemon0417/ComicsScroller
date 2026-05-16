import { render, screen } from "@testing-library/react";

import CountBadge from "./index";

describe("CountBadge", () => {
  it("renders the shared count badge style", () => {
    render(
      <CountBadge className="extra-class" aria-label="更新數">
        78
      </CountBadge>,
    );

    const badge = screen.getByLabelText("更新數");
    expect(badge).toHaveTextContent("78");
    expect(badge).toHaveClass("ds-count-badge", "extra-class");
  });
});
