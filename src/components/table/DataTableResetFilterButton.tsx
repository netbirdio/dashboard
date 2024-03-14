import Button from "@components/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@components/Tooltip";
import { Table } from "@tanstack/react-table";
import { FilterX } from "lucide-react";
import * as React from "react";
import { useState } from "react";

interface Props<TData> {
  table: Table<TData>;
  onClick: () => void;
}

export default function DataTableResetFilterButton<TData>({
  table,
  onClick,
}: Props<TData>) {
  const [hovered, setHovered] = useState(false);
  const isDisabled =
    table.getState().columnFilters.length <= 0 &&
    table.getState().globalFilter === "";

  return !isDisabled ? (
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
          disabled={isDisabled}
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
  ) : null;
}
