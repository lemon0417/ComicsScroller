import { fireEvent, render, screen } from "@testing-library/react";

import CheckboxField from "./index";

describe("CheckboxField", () => {
  it("connects label, description, and change handling", () => {
    const onChange = jest.fn();

    render(
      <CheckboxField
        id="clear-series-data"
        descriptionId="clear-series-data-desc"
        label="一併清除閱讀紀錄與作品資料"
        description="勾選後會額外刪除這部作品的閱讀紀錄與快取。"
        checked={false}
        onChange={onChange}
      />,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: "一併清除閱讀紀錄與作品資料",
    });
    expect(checkbox).toHaveAttribute("aria-describedby", "clear-series-data-desc");
    expect(screen.getByText("勾選後會額外刪除這部作品的閱讀紀錄與快取。")).toHaveClass(
      "ds-checkbox-desc",
    );

    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("can be disabled while an action is busy", () => {
    render(
      <CheckboxField
        id="clear-series-data"
        descriptionId="clear-series-data-desc"
        label="一併清除閱讀紀錄與作品資料"
        description="此操作無法復原。"
        checked
        disabled
        onChange={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("checkbox", {
        name: "一併清除閱讀紀錄與作品資料",
      }),
    ).toBeDisabled();
  });
});
