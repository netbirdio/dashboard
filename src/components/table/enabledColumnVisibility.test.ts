import { describe, expect, it } from "vitest";
import { ENABLED_COLUMN_ID } from "./disabledRowCells";
import { enabledColumnVisibility } from "./enabledColumnVisibility";

// Contract: the Active toggle column costs ~100px of table width. On narrow
// viewports it is hidden so the table does not overflow into a horizontal
// scrollbar; the row's action menu still offers Enable/Disable there.
describe("enabledColumnVisibility", () => {
  it("shows the toggle column on wide viewports", () => {
    expect(enabledColumnVisibility(true)).toEqual({
      [ENABLED_COLUMN_ID]: true,
    });
  });

  it("hides the toggle column on narrow viewports", () => {
    expect(enabledColumnVisibility(false)).toEqual({
      [ENABLED_COLUMN_ID]: false,
    });
  });

  it("merges with a table's other visibility settings without clobbering them", () => {
    const merged = { search: false, ...enabledColumnVisibility(false) };
    expect(merged).toEqual({ search: false, [ENABLED_COLUMN_ID]: false });
  });
});
