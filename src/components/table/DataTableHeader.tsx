"use client";

import FullTooltip from "@components/FullTooltip";
import { IconSortAscending, IconSortDescending } from "@tabler/icons-react";
import type { Column } from "@tanstack/table-core";
import { cn } from "@utils/helpers";
import React from "react";
import { useServerPagination } from "@/contexts/ServerPaginationProvider";

type Props = {
  column: Column<any>;
  children: React.ReactNode;
  tooltip?: string | React.ReactNode;
  center?: boolean;
  className?: string;
  sorting?: boolean;
  name?: string;
};
export default function DataTableHeader({
  children,
  column,
  tooltip,
  center,
  className,
  sorting = true,
  name,
}: Props) {
  const serverPagination = useOptionalServerPagination();

  const handleSort = () => {
    const direction = column.getIsSorted() === "asc" ? "desc" : "asc";
    column.toggleSorting(direction === "desc");
    if (name && serverPagination?.setSort) {
      serverPagination.setSort(name, direction);
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
            <IconSortAscending size={16} />
          ) : (
            <IconSortDescending size={16} />
          ))}
      </div>
    </FullTooltip>
  );
}

function useOptionalServerPagination() {
  try {
    return useServerPagination();
  } catch {
    return null;
  }
}
