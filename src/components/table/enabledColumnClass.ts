/** Smallest viewport (Tailwind breakpoint) at which the toggle column shows. */
export type EnabledColumnBreakpoint = "xl" | "2xl";

/**
 * Column classes for the enable/disable toggle column. The column is a
 * shortcut for the Enable/Disable entry in each row's action menu, so it is
 * hidden on narrower viewports to keep the table from overflowing
 * horizontally. `xl` (1280px) suits most tables; the widest ones (legacy
 * routes) wait for `2xl` (1536px).
 */
export const ENABLED_COLUMN_CLASS: Record<EnabledColumnBreakpoint, string> = {
  xl: "hidden xl:table-cell",
  "2xl": "hidden 2xl:table-cell",
};
