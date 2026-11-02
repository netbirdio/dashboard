import { Cell } from "@tanstack/react-table";

/** Column id shared by the enable/disable toggle column across tables. */
export const ENABLED_COLUMN_ID = "enabled";

/** Column id shared by the "three dots" action column across tables. */
export const ACTIONS_COLUMN_ID = "actions";

const ALWAYS_VISIBLE_COLUMN_IDS: ReadonlyArray<string> = [
  ENABLED_COLUMN_ID,
  ACTIONS_COLUMN_ID,
];

const FADED_CELL_CLASS = "opacity-50";

/**
 * Whether a column hosts its own control (toggle, action menu). Tables that
 * open an editor on row click should ignore clicks landing in these cells.
 */
export const isInteractiveCell = (columnId: string): boolean =>
  ALWAYS_VISIBLE_COLUMN_IDS.includes(columnId);

type Toggleable = { enabled: boolean };

/**
 * Cell class for tables whose rows can be switched off: every cell of a
 * disabled row fades out except the toggle and actions cells, which stay
 * fully visible so the row can still be re-enabled or removed.
 */
export const fadeDisabledRowCells = <TData extends Toggleable>(
  cell: Cell<TData, unknown>,
): string => {
  if (cell.row.original.enabled) return "";
  if (isInteractiveCell(cell.column.id)) return "";
  return FADED_CELL_CLASS;
};
