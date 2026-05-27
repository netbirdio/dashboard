"use client";

import Button from "@components/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/Popover";
import { Table } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import { ChevronLeftIcon, ChevronsUpDown, FilterIcon, XIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";

// A TableFilterDef wires one TanStack column to the consolidated filter UI.
// Each filter renders its own picker — the framework just provides the
// popover container and chip row.
export type TableFilterDef<V = unknown> = {
  id: string; // tan-stack column id
  label: string;
  icon?: React.ReactNode;
  renderPicker: (props: {
    value: V | undefined;
    onChange: (next: V | undefined) => void;
    close: () => void;
  }) => React.ReactNode;
  // Returns the chip body. Null means no chip (filter inactive).
  formatChip: (value: V | undefined) => string | null;
};

type ButtonProps<TData> = {
  table: Table<TData>;
  filters: TableFilterDef[];
  disabled?: boolean;
};

export function TableFiltersButton<TData>({
  table,
  filters,
  disabled,
}: ButtonProps<TData>) {
  const [open, setOpen] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  const activeCount = filters.reduce((n, f) => {
    const v = table.getColumn(f.id)?.getFilterValue();
    return f.formatChip(v as never) !== null ? n + 1 : n;
  }, 0);

  const activeFilter = filters.find((f) => f.id === activeFilterId);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (!o) setActiveFilterId(null);
        setOpen(o);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant={"secondary"} disabled={disabled}>
          <FilterIcon size={16} className={"shrink-0"} />
          <span className={"flex items-center gap-1.5"}>
            Filters
            {activeCount > 0 && (
              <span
                className={
                  "inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-netbird text-white text-[10px] font-semibold leading-none px-1.5"
                }
              >
                {activeCount}
              </span>
            )}
          </span>
          <ChevronsUpDown size={16} className={"shrink-0"} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={"w-[280px] p-0 shadow-sm shadow-nb-gray-950"}
        align={"start"}
        sideOffset={7}
      >
        {activeFilter ? (
          <div className={"flex flex-col"}>
            <div
              className={
                "flex items-center gap-2 px-3 py-2 border-b border-nb-gray-900"
              }
            >
              <button
                aria-label={"Back"}
                className={
                  "text-nb-gray-400 hover:text-white p-1 -m-1 rounded transition-colors"
                }
                onClick={() => setActiveFilterId(null)}
              >
                <ChevronLeftIcon size={14} />
              </button>
              <span className={"text-sm font-medium text-nb-gray-100"}>
                {activeFilter.label}
              </span>
            </div>
            <div className={"p-2"}>
              {activeFilter.renderPicker({
                value: table.getColumn(activeFilter.id)?.getFilterValue() as never,
                onChange: (next) => {
                  table.setPageIndex(0);
                  table.getColumn(activeFilter.id)?.setFilterValue(next);
                },
                close: () => {
                  setOpen(false);
                  setActiveFilterId(null);
                },
              })}
            </div>
          </div>
        ) : (
          <div className={"py-1"}>
            {filters.map((f) => {
              const v = table.getColumn(f.id)?.getFilterValue();
              const chip = f.formatChip(v as never);
              return (
                <button
                  key={f.id}
                  className={
                    "w-full text-left px-3 py-2 hover:bg-nb-gray-900 text-sm flex items-center gap-2.5 text-nb-gray-200"
                  }
                  onClick={() => setActiveFilterId(f.id)}
                >
                  <span className={"shrink-0 text-nb-gray-400"}>{f.icon}</span>
                  <span className={"flex-1"}>{f.label}</span>
                  {chip && (
                    <span className={"text-xs text-nb-gray-400 truncate max-w-[110px]"}>
                      {chip}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

type ChipsProps<TData> = {
  table: Table<TData>;
  filters: TableFilterDef[];
  className?: string;
};

export function TableFilterChips<TData>({
  table,
  filters,
  className,
}: ChipsProps<TData>) {
  const active = filters
    .map((f) => {
      const value = table.getColumn(f.id)?.getFilterValue();
      const text = f.formatChip(value as never);
      if (!text) return null;
      return { def: f, text };
    })
    .filter((c): c is { def: TableFilterDef; text: string } => !!c);

  if (active.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 p-default pt-6",
        className,
      )}
    >
      {active.map(({ def, text }) => (
        <FilterChip key={def.id} def={def} text={text} table={table} />
      ))}
    </div>
  );
}

type FilterChipProps<TData> = {
  def: TableFilterDef;
  text: string;
  table: Table<TData>;
};

function FilterChip<TData>({ def, text, table }: FilterChipProps<TData>) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "flex items-stretch rounded-md border border-nb-gray-900",
          "bg-nb-gray-930/40 text-xs text-nb-gray-200 overflow-hidden",
          "hover:border-nb-gray-700 transition-colors",
        )}
      >
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 px-2.5 py-1",
              "hover:bg-nb-gray-900 transition-colors",
            )}
          >
            <span className={"text-nb-gray-400"}>{def.label}:</span>
            <span className={"font-medium"}>{text}</span>
          </button>
        </PopoverTrigger>
        <button
          aria-label={`Remove ${def.label} filter`}
          className={cn(
            "flex items-center justify-center px-1.5",
            "border-l border-nb-gray-900",
            "text-nb-gray-400 hover:bg-nb-gray-900 hover:text-white transition-colors",
          )}
          onClick={(e) => {
            e.stopPropagation();
            table.setPageIndex(0);
            table.getColumn(def.id)?.setFilterValue(undefined);
          }}
        >
          <XIcon size={12} />
        </button>
      </div>
      <PopoverContent
        className={"w-[280px] p-0 shadow-sm shadow-nb-gray-950"}
        align={"start"}
        sideOffset={6}
      >
        <div className={"flex flex-col"}>
          <div
            className={
              "flex items-center gap-2 px-3 py-2 border-b border-nb-gray-900"
            }
          >
            <span className={"shrink-0 text-nb-gray-400"}>{def.icon}</span>
            <span className={"text-sm font-medium text-nb-gray-100"}>
              {def.label}
            </span>
          </div>
          <div className={"p-2"}>
            {def.renderPicker({
              value: table.getColumn(def.id)?.getFilterValue() as never,
              onChange: (next) => {
                table.setPageIndex(0);
                table.getColumn(def.id)?.setFilterValue(next);
              },
              close: () => setOpen(false),
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}