/**
 * Smallest viewport (Tailwind breakpoint) at which a column is shown. Columns
 * that only duplicate an entry of the row's action menu — the Active toggle,
 * for instance — can be dropped on narrow viewports so the table does not
 * overflow into a horizontal scrollbar.
 */
export type ColumnBreakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

/** Breakpoint per column id, for a single table. */
export type ColumnBreakpoints = Partial<Record<string, ColumnBreakpoint>>;

// Spelled out rather than built from the breakpoint name so Tailwind's
// scanner finds every class.
const SHOW_FROM: Record<ColumnBreakpoint, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
  "2xl": "hidden 2xl:table-cell",
};

/** Classes hiding the given column below its breakpoint, if it has one. */
export const showColumnFromClass = (
  breakpoints: ColumnBreakpoints | undefined,
  columnId: string,
): string | undefined => {
  const breakpoint = breakpoints?.[columnId];
  return breakpoint && SHOW_FROM[breakpoint];
};
