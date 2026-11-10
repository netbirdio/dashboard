/** The options offered by the rows-per-page selector. */
export const rowsSelection = [25, 50, 100, 250, 500];

export const DEFAULT_PAGE_SIZE = 25;

/**
 * A table's own initial size stays valid,
 * so nested tables that show every row (e.g. `initialPageSize={rows.length}`) keep working.
 */
export const isAllowedPageSize = (pageSize: number, initialPageSize: number) =>
  pageSize === initialPageSize || rowsSelection.includes(pageSize);
