import Button from "@components/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { Table } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandItem } from "cmdk";
import { Check, ChevronDown, RowsIcon } from "lucide-react";
import * as React from "react";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  disabled?: boolean;
}

const rowsSelection = [10, 25, 50, 100, 1000];

export function DataTableRowsPerPage<TData>({
  table,
  disabled,
}: DataTablePaginationProps<TData>) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"secondary"}
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-[200px] justify-between"
          >
            <RowsIcon size={15} className={"text-nb-gray-300"} />
            <div>
              <span className={"text-white"}>
                {table.getState().pagination.pageSize}
              </span>
              <span className={"text-nb-gray-300"}> rows per page</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" sideOffset={7}>
          <Command value={`${table.getState().pagination.pageSize}`}>
            <CommandGroup>
              {rowsSelection.map((val) => (
                <CommandItem
                  key={val}
                  value={val.toString()}
                  onSelect={(currentValue) => {
                    table.setPageSize(Number(currentValue));
                    setOpen(false);
                  }}
                >
                  <div
                    className={cn(
                      "cursor-pointer",
                      "flex gap-2 px-2 py-1.5 my-1 mx-1 rounded-md items-center hover:dark:bg-nb-gray-800 text-nb-gray-400 hover:text-white",
                      table.getState().pagination.pageSize === val
                        ? "text-white"
                        : "",
                    )}
                  >
                    <Check
                      size={15}
                      className={cn(
                        "text-white shrink-0",
                        table.getState().pagination.pageSize === val
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {val}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
