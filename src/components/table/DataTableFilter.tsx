import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import { DropdownInfoText } from "@components/DropdownInfoText";
import { DropdownInput } from "@components/DropdownInput";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { VirtualScrollAreaList } from "@components/VirtualScrollAreaList";
import { useSearch } from "@hooks/useSearch";
import { Table } from "@tanstack/react-table";
import { concat, sortBy, uniqBy } from "lodash";
import { FilterIcon } from "lucide-react";
import * as React from "react";
import { useCallback, useMemo, useState } from "react";

interface Props<TData> {
  table: Table<TData>;
  filters: Filter<TData>[];
  disabled?: boolean;
}

/**
 * Filter
 * @param columnId - Column ID to filter
 * @param group - Group name for the filter
 * @param item - Function to render the filter item
 */
interface Filter<TData> {
  columnId: keyof TData | string;
  group?: string;
  item: (item: TData, value: string) => string | React.ReactNode;
  exclude?: string[];
}

interface FilterItem<TData> {
  id: string;
  value: string;
  showGroupHeading: boolean;
  columnId: keyof TData | string;
  group?: string;
  original: TData;
  renderItem: () => React.ReactNode;
}

type SearchPredicate<TData> = (
  item: FilterItem<TData>,
  query: string,
) => boolean;

const searchPredicate: SearchPredicate<any> = (item, query) => {
  const lowerCaseQuery = query.toLowerCase();
  let itemValue = String(item?.value || "").toLowerCase();
  return itemValue.includes(lowerCaseQuery);
};

/**
 * @desc Generic filter button. Filters are based on the table data and are displayed in a popover with search functionality.
 * @param table - Table instance from tanstack/react-table
 * @param filters - Array of filters to display
 * @param filters.columnId Id of the column to filter. This column must have a filterFn: "arrIncludesSomeExact" in the column definition of the table.
 * @param filters.group - Group name for the filter
 * @param filters.item - Function to render the filter item
 * @param disabled - Disable the filter button
 * @returns React.ReactNode
 * @example
 * <DataTableFilter table={table} disabled={false}
 *  filters={[{
 *    columnId: "name",
 *    group: "Users",
 *    item: (item) => item.name,
 *    }]}
 *  />
 */
export function DataTableFilter<TData>({
  table,
  filters,
  disabled = false,
}: Readonly<Props<TData>>) {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const options = useMemo(
    () =>
      filters.flatMap((filter) => {
        const getTableColumnValues = (columnId: string) => {
          return [
            ...new Set(
              table
                .getPreFilteredRowModel()
                .rows.map((row) => {
                  return {
                    value: row?.getValue(columnId),
                    original: row.original,
                  };
                })
                .filter((value) => value !== undefined),
            ),
          ];
        };

        // Get unique values from table rows
        let tableRows = uniqBy(
          getTableColumnValues(filter.columnId as string),
          "value",
        );

        // Filter out excluded values
        if (filter.exclude) {
          tableRows = tableRows.filter(
            (row) => !filter.exclude?.includes(row.value as string),
          );
        }

        // Sort values
        tableRows = sortBy(tableRows, (row) => {
          return isNaN(Number(row?.value)) ? row?.value : Number(row?.value);
        });

        const groupCounts: Record<string, number> = {};
        return tableRows.map((row) => {
          const groupKey = filter?.group ?? "Ungrouped";
          groupCounts[groupKey] = (groupCounts[groupKey] || 0) + 1;

          return {
            id: `${String(filter.columnId)}-${row.value}`,
            value: row.value,
            showGroupHeading: groupCounts[groupKey] === 1,
            columnId: filter.columnId,
            group: filter?.group,
            original: row.original,
            renderItem: () => filter?.item(row.original, String(row.value)),
          } as FilterItem<TData>;
        });
      }),
    [],
  );

  const [filteredItems, search, setSearch] = useSearch<FilterItem<TData>>(
    options,
    searchPredicate,
    {
      filter: true,
      debounce: 150,
    },
  );

  const onOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setTimeout(() => {
        setSearch("");
      }, 100);
    }
    setOpen(isOpen);
  };

  const getCurrentTableFilters = useCallback((columnId: string) => {
    return table.getColumn(columnId)?.getFilterValue() as string[] | undefined;
  }, []);

  const onSelect = (item: FilterItem<TData>) => {
    table.setPageIndex(0);

    const currentFilters = getCurrentTableFilters(item.columnId as string);
    const column = table.getColumn(item.columnId as string);

    const newFilters = currentFilters?.includes(item.value)
      ? currentFilters.filter((f) => f !== item.value)
      : concat(currentFilters ?? [], item.value);

    if (newFilters.length == 0) {
      column?.setFilterValue(undefined);
    } else {
      column?.setFilterValue(newFilters);
    }

    searchRef.current?.focus();
  };

  const activeFiltersCount = useMemo(() => {
    let columnIds = filters.map((filter) => filter.columnId as string);
    let activeFilters = columnIds.map((columnId) => {
      return getCurrentTableFilters(columnId);
    });
    return activeFilters.flat().filter((filter) => filter !== undefined).length;
  }, [filters, getCurrentTableFilters]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild={true}>
        <Button variant={"secondary"} disabled={disabled}>
          <FilterIcon size={15} className={"shrink-0"} />
          <span>
            <span className={"text-white"}>
              {activeFiltersCount > 0 && activeFiltersCount}
            </span>
            {activeFiltersCount > 0 ? ` Filter(s)` : "Filter"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        hideWhenDetached={false}
        className="w-full p-0 shadow-sm shadow-nb-gray-950"
        style={{
          width: "400px",
        }}
        align="start"
        side={"bottom"}
        sideOffset={10}
      >
        <div className={"w-full"}>
          <DropdownInput
            ref={searchRef}
            value={search}
            onChange={setSearch}
            placeholder={"Search filters..."}
            hideEnterIcon={true}
          />

          {filteredItems.length == 0 && search != "" && (
            <DropdownInfoText className={"mb-4"}>
              There are no filters matching your search.
            </DropdownInfoText>
          )}

          <VirtualScrollAreaList
            items={filteredItems}
            maxHeight={270}
            scrollAreaClassName={"pt-0"}
            renderItem={(option) => {
              const currentTableFilters = getCurrentTableFilters(
                option.columnId as string,
              );
              const isActive = currentTableFilters?.includes(option.value);

              return (
                <div
                  className={
                    "text-neutral-500 dark:text-nb-gray-300 font-medium flex items-center gap-2 justify-between w-full"
                  }
                  key={option.id}
                >
                  <div
                    className={
                      "flex items-center gap-2 whitespace-nowrap text-xs font-normal tracking-wide"
                    }
                  >
                    <div>{option?.renderItem()}</div>
                  </div>
                  <Checkbox checked={isActive} />
                </div>
              );
            }}
            onSelect={onSelect}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

const ListItemHeading = ({
  children,
  show = false,
}: {
  children: React.ReactNode;
  show: boolean;
}) => {
  if (!show) return null;
  return (
    <p
      className={
        "!text-nb-gray-400 text-xs uppercase font-medium tracking-wider pb-1 pl-5 mb-.5 mt-4"
      }
    >
      {children}
    </p>
  );
};
