import type { SyntheticEvent } from "react";

/**
 * For controls inside a table row that has `onRowClick`:
 * keeps their click from also triggering the row's action.
 * Menus and popovers need it on their content too,
 * because React events bubble out of portals to the row.
 */
export const stopRowClick = (event: SyntheticEvent) => event.stopPropagation();
