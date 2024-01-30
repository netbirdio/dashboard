"use client";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import DataTableGlobalSearch from "@components/table/DataTableGlobalSearch";
import { DataTablePagination } from "@components/table/DataTablePagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/table/Table";
import NoResults from "@components/ui/NoResults";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@radix-ui/react-accordion";
import { RankingInfo } from "@tanstack/match-sorter-utils";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  Row,
  SortingState,
  Table as TanStackTable,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { FilterFn } from "@tanstack/table-core";
import { cn, removeAllSpaces } from "@utils/helpers";
import dayjs from "dayjs";
import { trim } from "lodash";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

declare module "@tanstack/table-core" {
  interface FilterFns {
    fuzzy: FilterFn<unknown>;
    dateRange: FilterFn<unknown>;
    exactMatch: FilterFn<unknown>;
    arrIncludesSomeExact: FilterFn<unknown>;
  }
  interface FilterMeta {
    itemRank: RankingInfo;
  }
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const val = row.getValue(columnId);
  if (!val) return false;
  if (typeof val !== "string") return false;
  const lowerCaseValue = removeAllSpaces(trim(value.toLowerCase()));
  return val.toLowerCase().includes(lowerCaseValue);
};

const exactMatch: FilterFn<any> = (row, columnId, value) => {
  return row.getValue(columnId) == value;
};

const isWithinRange: FilterFn<any> = (
  row,
  columnId,
  value: [start: Date, end: Date],
) => {
  const date = dayjs(row.getValue(columnId));
  const [start, end] = value;
  //If one filter defined and date is null filter it
  if ((start || end) && !date) return false;
  if (start && !end) {
    return date.isAfter(dayjs(start));
  } else if (!start && end) {
    return date.isBefore(dayjs(end));
  } else if (start && end) {
    return date.isAfter(dayjs(start)) && date.isBefore(dayjs(end));
  } else return true;
};

const arrIncludesSomeExact: FilterFn<any> = (
  row,
  columnId,
  value: string[],
) => {
  const rowValue = row.getValue(columnId);
  if (!rowValue) return false;
  return value.some((val) => val === rowValue);
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[] | undefined;
  children?: (table: TanStackTable<TData>) => React.ReactNode;
  aboveTable?: (table: TanStackTable<TData>) => React.ReactNode;
  searchPlaceholder?: string;
  columnVisibility?: VisibilityState;
  sorting?: SortingState;
  setSorting?: React.Dispatch<React.SetStateAction<SortingState>>;
  text?: string;
  onRowClick?: (row: Row<TData>, cell: string) => void;
  getStartedCard?: React.ReactNode;
  placeholders?: TData[];
  renderExpandedRow?: (row: TData) => React.ReactNode;
  minimal?: boolean;
  className?: string;
  inset?: boolean;
  isLoading?: boolean;
  as?: "div" | "table";
  paginationClassName?: string;
  rowClassName?: string;
  wrapperClassName?: string;
  tableClassName?: string;
  searchClassName?: string;
  showSearch?: boolean;
  rightSide?: (table: TanStackTable<TData>) => React.ReactNode;
  manualPagination?: boolean;
}

export function DataTable<TData, TValue>(props: DataTableProps<TData, TValue>) {
  if (props.isLoading) return <SkeletonTable withHeader={!props.minimal} />;
  return <DataTableContent {...props} />;
}

export function DataTableContent<TData, TValue>({
  columns,
  data,
  children,
  searchPlaceholder = "Search...",
  columnVisibility = {},
  sorting = [],
  setSorting,
  text = "rows",
  onRowClick,
  getStartedCard,
  renderExpandedRow,
  minimal,
  className,
  tableClassName,
  inset,
  isLoading = false,
  paginationClassName,
  rowClassName,
  wrapperClassName,
  as = "table",
  aboveTable,
  searchClassName,
  rightSide,
  manualPagination = false,
}: DataTableProps<TData, TValue>) {
  const path = usePathname();
  const [columnFilters, setColumnFilters] = useLocalStorage<ColumnFiltersState>(
    "netbird-table-columns" + path,
    [],
  );
  const [globalSearch, setGlobalSearch] = useLocalStorage(
    "netbird-table-search" + path,
    "",
  );

  const [paginationState, setPaginationState] =
    useLocalStorage<PaginationState>("netbird-table-pagination" + path, {
      pageIndex: 0,
      pageSize: 10,
    });

  const [tableColumnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(columnVisibility);

  const hasInitialData = !!(data && data.length > 0);

  const table = useReactTable({
    data: hasInitialData ? data : [],
    columns,
    filterFns: {
      fuzzy: fuzzyFilter,
      dateRange: isWithinRange,
      exactMatch,
      arrIncludesSomeExact,
    },
    autoResetPageIndex: false,
    autoResetAll: false,
    autoResetExpanded: false,
    manualPagination: manualPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility: tableColumnVisibility,
      globalFilter: globalSearch,
      pagination: paginationState,
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
    onSortingChange: setSorting,
    onPaginationChange: setPaginationState,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: fuzzyFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const [accordion, setAccordion] = useState<string[]>();

  const TableComponent = as === "table" ? Table : "div";
  const TableHeaderComponent = as === "table" ? TableHeader : "div";
  const TableBodyComponent = as === "table" ? TableBody : "div";
  const TableRowComponent = as === "table" ? TableRow : "div";
  const TableCellComponent = as === "table" ? TableCell : "div";
  const TableDataUnstyledComponent = as === "table" ? "td" : "div";
  const TableRowUnstyledComponent = as === "table" ? "tr" : "div";

  return (
    <div className={cn("relative table-fixed-scroll", className)}>
      {!minimal && (
        <div className={"flex gap-x-4 gap-y-6 p-default flex-wrap"}>
          <DataTableGlobalSearch
            className={searchClassName}
            disabled={!hasInitialData}
            globalSearch={globalSearch}
            setGlobalSearch={(val) => {
              table.setPageIndex(0);
              setGlobalSearch(val);
            }}
            placeholder={searchPlaceholder}
          />
          {children && children(table)}
          <div className={"flex gap-4 flex-wrap grow"}>
            <div className={"flex gap-4 flex-wrap"}></div>
            {rightSide && rightSide(table)}
          </div>
        </div>
      )}
      {aboveTable && aboveTable(table)}
      {!hasInitialData && !isLoading && getStartedCard}

      {hasInitialData && !isLoading && (
        <TableComponent
          className={cn("relative mt-8", tableClassName)}
          minimal={minimal}
        >
          {as == "table" && (
            <TableHeaderComponent minimal={minimal}>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRowComponent key={headerGroup.id} minimal={minimal}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        minimal={minimal}
                        inset={inset}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRowComponent>
              ))}
            </TableHeaderComponent>
          )}

          <Accordion
            asChild={true}
            type={"multiple"}
            value={accordion}
            onValueChange={setAccordion}
          >
            <TableBodyComponent
              className={cn(
                "relative",
                data == undefined && "blur-sm",
                wrapperClassName,
              )}
            >
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <AccordionItem
                    value={row.original.id}
                    asChild={true}
                    key={row.original.id}
                  >
                    <>
                      <TableRowComponent
                        minimal={minimal}
                        data-row-id={row.original.id}
                        className={cn(
                          (onRowClick || renderExpandedRow) &&
                            "cursor-pointer relative group/accordion",
                          rowClassName,
                        )}
                        data-state={row.getIsSelected() && "selected"}
                        data-accordion={
                          accordion?.includes(row.original.id)
                            ? "opened"
                            : "closed"
                        }
                        onClick={(e) => {
                          if (renderExpandedRow) {
                            e.preventDefault();
                            e.stopPropagation();
                            setAccordion((prev) => {
                              if (prev?.includes(row.original.id)) {
                                return prev.filter(
                                  (item) => item !== row.original.id,
                                );
                              } else {
                                return [...(prev ?? []), row.original.id];
                              }
                            });
                          }
                        }}
                      >
                        <>
                          {row.getVisibleCells().map((cell) => (
                            <TableCellComponent
                              key={cell.id}
                              className={"relative"}
                              minimal={minimal}
                              inset={inset}
                              onClick={() => {
                                onRowClick && onRowClick(row, cell.column.id);
                              }}
                            >
                              <div
                                className={
                                  "absolute left-0 top-0 w-full h-full z-0"
                                }
                              ></div>
                              <div className={"relative z-[1]"}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </div>
                            </TableCellComponent>
                          ))}
                        </>
                      </TableRowComponent>

                      {renderExpandedRow && (
                        <AccordionContent asChild={true}>
                          <TableRowComponent
                            data-row-id={row.id + "-expanded-row"}
                            key={row.id + "-expanded-row"}
                            minimal={minimal}
                            className={cn(
                              onRowClick && "cursor-pointer relative",
                            )}
                            data-state={row.getIsSelected() && "selected"}
                          >
                            <TableDataUnstyledComponent
                              className={"w-full"}
                              colSpan={row.getVisibleCells().length}
                            >
                              {renderExpandedRow(row.original)}
                            </TableDataUnstyledComponent>
                          </TableRowComponent>
                        </AccordionContent>
                      )}
                    </>
                  </AccordionItem>
                ))
              ) : (
                <TableRowUnstyledComponent>
                  <TableCellComponent
                    colSpan={columns.length}
                    className="!py-4 !px-0 text-center"
                  >
                    <NoResults />
                  </TableCellComponent>
                </TableRowUnstyledComponent>
              )}
            </TableBodyComponent>
          </Accordion>
        </TableComponent>
      )}

      <div className={paginationClassName}>
        <DataTablePagination table={table} text={text} />
      </div>
    </div>
  );
}
