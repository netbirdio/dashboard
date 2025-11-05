import Button from "@components/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@components/Tooltip";
import { Table } from "@tanstack/react-table";
import { FilterX } from "lucide-react";
import * as React from "react";
import { useState } from "react";

interface Props<TData> {
  table: Table<TData>;
  onClick: () => void;
  hasServerSideFilters?: boolean;
}

export default function DataTableResetFilterButton<TData>({
  table,
  onClick,
  hasServerSideFilters = undefined,
}: Props<TData>) {
  const [hovered, setHovered] = useState(false);

  const hasClientSideFilters =
    table.getState().globalFilter !== "" ||
    table.getState().columnFilters.length > 0;

  const showButton = hasServerSideFilters ?? hasClientSideFilters;

  return (
    showButton && (
      <Tooltip delayDuration={1}>
        <TooltipTrigger
          asChild={true}
          onMouseOver={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={(e) => {
            e.preventDefault();
          }}
        >
          <Button
            className={"h-[42px]"}
            variant={"secondary"}
            onClick={onClick}
          >
            <FilterX size={16} />
          </Button>
        </TooltipTrigger>

        <TooltipContent
          sideOffset={10}
          className={"px-3 py-2"}
          onPointerDownOutside={(event) => {
            if (hovered) event.preventDefault();
          }}
        >
          <span className={"text-xs text-neutral-300"}>
            Reset Filters & Search
          </span>
        </TooltipContent>
      </Tooltip>
    )
  );
}
