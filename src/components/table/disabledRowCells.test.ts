import { Cell } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import {
  ACTIONS_COLUMN_ID,
  ENABLED_COLUMN_ID,
  fadeDisabledRowCells,
  isInteractiveCell,
} from "./disabledRowCells";

// Contract: cells of a disabled row fade out, except the toggle and actions
// cells, which must stay fully visible so the row can be re-enabled or removed.
type Row = { enabled: boolean };

const cellOf = (enabled: boolean, columnId: string) =>
  ({
    row: { original: { enabled } },
    column: { id: columnId },
  }) as unknown as Cell<Row, unknown>;

describe("fadeDisabledRowCells", () => {
  it("fades a regular cell of a disabled row", () => {
    expect(fadeDisabledRowCells(cellOf(false, "name"))).toBe("opacity-50");
  });

  it("keeps the toggle cell of a disabled row fully visible", () => {
    expect(fadeDisabledRowCells(cellOf(false, ENABLED_COLUMN_ID))).toBe("");
  });

  it("keeps the actions cell of a disabled row fully visible", () => {
    expect(fadeDisabledRowCells(cellOf(false, ACTIONS_COLUMN_ID))).toBe("");
  });

  it("reports toggle and actions columns as interactive, others not", () => {
    expect(isInteractiveCell(ENABLED_COLUMN_ID)).toBe(true);
    expect(isInteractiveCell(ACTIONS_COLUMN_ID)).toBe(true);
    expect(isInteractiveCell("name")).toBe(false);
  });

  it("does not fade any cell of an enabled row", () => {
    expect(fadeDisabledRowCells(cellOf(true, "name"))).toBe("");
    expect(fadeDisabledRowCells(cellOf(true, ENABLED_COLUMN_ID))).toBe("");
    expect(fadeDisabledRowCells(cellOf(true, ACTIONS_COLUMN_ID))).toBe("");
  });
});
