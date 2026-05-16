import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import Tabs from "./index";

function TabsHarness() {
  const [value, setValue] = useState("updates");

  return (
    <div>
      <Tabs value={value} onValueChange={setValue}>
        <Tabs.List>
          <Tabs.Trigger value="updates">更新</Tabs.Trigger>
          <Tabs.Trigger value="following">追蹤</Tabs.Trigger>
          <Tabs.Trigger value="history">紀錄</Tabs.Trigger>
        </Tabs.List>
      </Tabs>
      <div data-testid="active-tab">{value}</div>
    </div>
  );
}

describe("Tabs", () => {
  it("activates tabs on click", () => {
    render(<TabsHarness />);

    fireEvent.click(screen.getByRole("tab", { name: "追蹤" }));

    expect(screen.getByRole("tab", { name: "追蹤" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("active-tab")).toHaveTextContent("following");
  });

  it("moves focus and selection with arrow keys", () => {
    render(<TabsHarness />);

    const updatesTab = screen.getByRole("tab", { name: "更新" });
    const followingTab = screen.getByRole("tab", { name: "追蹤" });
    const historyTab = screen.getByRole("tab", { name: "紀錄" });

    updatesTab.focus();
    fireEvent.keyDown(updatesTab, { key: "ArrowRight" });
    expect(followingTab).toHaveFocus();
    expect(followingTab).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(followingTab, { key: "ArrowLeft" });
    expect(updatesTab).toHaveFocus();
    expect(updatesTab).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(updatesTab, { key: "ArrowLeft" });
    expect(historyTab).toHaveFocus();
    expect(historyTab).toHaveAttribute("aria-selected", "true");
  });

  it("supports Home and End keys", () => {
    render(<TabsHarness />);

    const updatesTab = screen.getByRole("tab", { name: "更新" });
    const followingTab = screen.getByRole("tab", { name: "追蹤" });
    const historyTab = screen.getByRole("tab", { name: "紀錄" });

    updatesTab.focus();
    fireEvent.keyDown(updatesTab, { key: "End" });
    expect(historyTab).toHaveFocus();
    expect(historyTab).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(historyTab, { key: "Home" });
    expect(updatesTab).toHaveFocus();
    expect(updatesTab).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(updatesTab, { key: "ArrowDown" });
    expect(followingTab).toHaveFocus();
    expect(followingTab).toHaveAttribute("aria-selected", "true");
  });
});
