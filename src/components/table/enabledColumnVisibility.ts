import { VisibilityState } from "@tanstack/react-table";
import { useMediaQuery } from "react-responsive";
import { ENABLED_COLUMN_ID } from "./disabledRowCells";

/**
 * Visibility for the enable/disable toggle column. The column is a shortcut
 * for the Enable/Disable entry in each row's action menu, so it can be dropped
 * on narrow viewports to keep the table from overflowing horizontally.
 */
export const enabledColumnVisibility = (isWide: boolean): VisibilityState => ({
  [ENABLED_COLUMN_ID]: isWide,
});

/** Smallest viewport (Tailwind breakpoint) at which the toggle column shows. */
export type EnabledColumnBreakpoint = "xl" | "2xl";

const MIN_WIDTH_QUERY: Record<EnabledColumnBreakpoint, string> = {
  xl: "(min-width: 1280px)",
  "2xl": "(min-width: 1536px)",
};

/**
 * Shows the toggle column from the given breakpoint upwards. `xl` (1280px)
 * suits most tables; the ~100px column makes the widest ones overflow next to
 * an expanded sidebar below that. Tables that are already close to the limit
 * at `xl` can wait for `2xl` (1536px) instead.
 */
export const useEnabledColumnVisibility = (
  breakpoint: EnabledColumnBreakpoint = "xl",
): VisibilityState => {
  const isWide = useMediaQuery({ query: MIN_WIDTH_QUERY[breakpoint] });
  return enabledColumnVisibility(isWide);
};
