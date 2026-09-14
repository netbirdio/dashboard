"use client";

import FullTooltip from "@components/FullTooltip";
import { useOptionalDataTable } from "@components/table/DataTableContext";
import { IconSortAscending, IconSortDescending } from "@tabler/icons-react";
import type { Column } from "@tanstack/table-core";
import { cn } from "@utils/helpers";
import React from "react";
import { useOptionalServerPagination } from "@/contexts/ServerPaginationProvider";

type Props = {
  column: Column<any>;
  children: React.ReactNode;
  tooltip?: string | React.ReactNode;
  center?: boolean;
  className?: string;
  sorting?: boolean;
  onSort?: () => void;
  name?: string;
};
export default function DataTableHeader({
  children,
  column,
  tooltip,
  center,
  className,
  sorting = true,
  onSort,
  name,
}: Props) {
  const serverPagination = useOptionalServerPagination();
  const table = useOptionalDataTable();

  const handleSort = () => {
    // A click replaces the sort with this column alone. The direction only
    // flips while the column already leads the sort; clicking any other column
    // starts ascending. column.toggleSorting() cannot express this: when the
    // column is the lowest-priority entry of an existing multi-sort it toggles
    // in place, which leaves the visible order unchanged.
    const leadsSort = table?.getState().sorting[0]?.id === column.id;
    const desc = leadsSort ? column.getIsSorted() !== "desc" : false;

    if (onSort) {
      onSort();
    } else if (table) {
      table.setSorting([{ id: column.id, desc }]);
    } else {
      column.toggleSorting(desc);
    }

    if (name && serverPagination?.setSort) {
      serverPagination.setSort(name, desc ? "desc" : "asc");
    }
  };

  return (
    <FullTooltip content={tooltip} disabled={!tooltip}>
      <div
        onClick={sorting ? handleSort : undefined}
        className={cn(
          "flex items-center whitespace-nowrap gap-2 dark:text-gray-400 transition-all select-none text-xs tracking-wide",
          sorting &&
            "cursor-pointer dark:hover:text-gray-300 hover:text-nb-gray",
          center && "justify-center w-full",
          className,
        )}
      >
        {children}
        {sorting &&
          (column.getIsSorted() === "desc" ? (
            <IconSortDescending size={16} />
          ) : (
            <IconSortAscending size={16} />
          ))}
      </div>
    </FullTooltip>
  );
}
