"use client";
import { TableContentSkeleton } from "@components/skeletons/SkeletonTable";
import DataTableGlobalSearch from "@components/table/DataTableGlobalSearch";
import { DataTableHeadingPortal } from "@components/table/DataTableHeadingPortal";
import { DataTablePagination } from "@components/table/DataTablePagination";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@components/table/Table";
import NoResults from "@components/ui/NoResults";
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
  RowSelectionState,
  SortingFn,
  SortingState,
  Table as TanStackTable,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { FilterFn } from "@tanstack/table-core";
import { cn, removeAllSpaces } from "@utils/helpers";
import dayjs from "dayjs";
import { isEqual, trim } from "lodash";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
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
  interface SortingFns {
    checkbox: SortingFn<unknown>;
  }
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  try {
    const val = row.getValue(columnId);
    if (!val) return false;
    if (typeof val !== "string") return false;
    const lowerCaseValue = removeAllSpaces(trim(value.toLowerCase()));
    return val.toLowerCase().includes(lowerCaseValue);
  } catch (e) {
    return false;
  }
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
  if (!rowValue && rowValue !== 0) return false;
  return value.some((val) => val === rowValue);
};

const checkboxSort: SortingFn<any> = (rowA, rowB, columnId) => {
  const valueA =
    columnId === "select" ? rowA.getIsSelected() : rowA.getValue(columnId);
  const valueB =
    columnId === "select" ? rowB.getIsSelected() : rowB.getValue(columnId);
  if (valueA && !valueB) {
    return -1;
  }
  if (!valueA && valueB) {
    return 1;
  }
  return 0;
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[] | undefined;
  children?: (table: TanStackTable<TData>) => React.ReactNode;
  aboveTable?: (table: TanStackTable<TData>) => React.ReactNode;
  searchPlaceholder?: string;
  columnVisibility?: VisibilityState;
  setColumnVisibility?: React.Dispatch<React.SetStateAction<VisibilityState>>;
  sorting?: SortingState;
  setSorting?: React.Dispatch<React.SetStateAction<SortingState>>;
  text?: string;
  onRowClick?: (row: Row<TData>, cell: string) => void;
  getStartedCard?: React.ReactNode;
  placeholders?: TData[];
  renderExpandedRow?: (row: TData) => React.ReactNode;
  renderRow?: (row: TData, children: React.ReactNode) => React.ReactNode;
  minimal?: boolean;
  className?: string;
  inset?: boolean;
  isLoading?: boolean;
  isFetching?: boolean;
  as?: "div" | "table";
  paginationClassName?: string;
  rowClassName?: string | ((row: Row<TData>) => string);
  wrapperClassName?: string;
  tableClassName?: string;
  searchClassName?: string;
  showSearchAndFilters?: boolean;
  rightSide?: (table: TanStackTable<TData>) => React.ReactNode;
  manualPagination?: boolean;
  manualFiltering?: boolean;
  manualColumnFiltering?: boolean;
  showHeader?: boolean;
  rowSelection?: RowSelectionState;
  setRowSelection?: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  useRowId?: boolean;
  headingTarget?: HTMLHeadingElement | null;
  showResetFilterButton?: boolean;
  serverSidePagination?: boolean;
  hasServerSideFilters?: boolean;
  onFilterReset?: () => void;
  wrapperComponent?: React.ElementType;
  wrapperProps?: any;
  keepStateInLocalStorage?: boolean;
  paginationPaddingClassName?: string;
  tableCellClassName?: string;
  initialSelectionState?: RowSelectionState;
  initialPageSize?: number;
  uniqueKey?: string;
  resetRowSelectionOnSearch?: boolean;
  pageCount?: number;
  pagination?: { pageIndex: number; pageSize: number };
  onPaginationChange?: (pagination: {
    pageIndex: number;
    pageSize: number;
  }) => void;
  totalRecords?: number;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  initialFilters?: ColumnFiltersState;
  initialSearch?: string;
  onSearchClick?: () => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  children,
  searchPlaceholder = "Search...",
  columnVisibility = {},
  setColumnVisibility,
  sorting = [],
  setSorting,
  text = "rows",
  onRowClick,
  getStartedCard,
  renderExpandedRow,
  renderRow,
  minimal,
  className,
  tableClassName,
  inset,
  isLoading = false,
  isFetching = false,
  paginationClassName,
  rowClassName,
  wrapperClassName,
  as = "table",
  aboveTable,
  searchClassName,
  rightSide,
  manualPagination = false,
  manualFiltering = false,
  manualColumnFiltering = false,
  showHeader = true,
  rowSelection,
  setRowSelection,
  useRowId,
  headingTarget,
  showResetFilterButton = true,
  serverSidePagination = false,
  hasServerSideFilters,
  onFilterReset,
  showSearchAndFilters = true,
  wrapperProps,
  wrapperComponent,
  keepStateInLocalStorage = true,
  paginationPaddingClassName,
  tableCellClassName,
  initialPageSize = 10,
  uniqueKey,
  resetRowSelectionOnSearch = true,
  pageCount,
  pagination,
  onPaginationChange,
  totalRecords,
  globalFilter,
  onGlobalFilterChange,
  columnFilters: externalColumnFilters,
  onColumnFiltersChange: externalOnColumnFiltersChange,
  initialFilters,
  initialSearch,
  onSearchClick,
}: Readonly<DataTableProps<TData, TValue>>) {
  const path = usePathname();
  const isInitialRender = useRef(true);

  const [showOverlay, setShowOverlay] = useState(false);
  const overlayTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!serverSidePagination) return;
    if (isFetching && !isLoading) {
      overlayTimer.current = setTimeout(() => setShowOverlay(true), 500);
    } else {
      clearTimeout(overlayTimer.current);
      setShowOverlay(false);
    }
    return () => clearTimeout(overlayTimer.current);
  }, [serverSidePagination, isFetching, isLoading]);

  const [localColumnFilters, setLocalColumnFilters] =
    useLocalStorage<ColumnFiltersState>(
      `netbird-table-columns${uniqueKey ? "/" + (uniqueKey as string) : path}`,
      [],
      keepStateInLocalStorage && !manualColumnFiltering,
      initialFilters,
    );
  const [localGlobalSearch, setLocalGlobalSearch] = useLocalStorage(
    `netbird-table-search${uniqueKey ? "/" + (uniqueKey as string) : path}`,
    globalFilter || "",
    keepStateInLocalStorage && !manualFiltering,
    initialSearch,
  );

  const [paginationState, setPaginationState] =
    useLocalStorage<PaginationState>(
      `netbird-table-pagination${
        uniqueKey ? "/" + (uniqueKey as string) : path
      }`,
      {
        pageIndex: pagination?.pageIndex ?? 0,
        pageSize: pagination?.pageSize ?? initialPageSize,
      },
      keepStateInLocalStorage && !manualPagination,
    );

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
    manualSorting: serverSidePagination,
    manualFiltering: manualFiltering || manualColumnFiltering,
    pageCount: pageCount,
    state: {
      sorting,
      rowSelection: rowSelection ?? {},
      columnFilters: manualColumnFiltering
        ? externalColumnFilters || []
        : localColumnFilters,
      columnVisibility: columnVisibility,
      globalFilter: manualFiltering ? globalFilter : localGlobalSearch,
      pagination: manualPagination
        ? {
            pageIndex: pagination?.pageIndex ?? 0,
            pageSize: pagination?.pageSize ?? initialPageSize,
          }
        : paginationState,
    },
    initialState: {
      pagination: {
        pageIndex: pagination?.pageIndex ?? 0,
        pageSize: pagination?.pageSize ?? initialPageSize,
      },
      columnFilters: initialFilters,
      globalFilter: initialSearch,
    },
    sortingFns: {
      checkbox: checkboxSort,
    },
    getRowId: useRowId ? (row) => row.id : undefined,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      if (manualPagination) {
        if (isInitialRender.current) {
          isInitialRender.current = false;
          return;
        }
        if (typeof updater === "function") {
          const newState = updater(pagination!);
          onPaginationChange?.(newState);
        } else {
          onPaginationChange?.(updater);
        }
      } else {
        setPaginationState(updater);
      }
    },
    onColumnFiltersChange: (filters) => {
      if (manualColumnFiltering) {
        externalOnColumnFiltersChange?.(filters as ColumnFiltersState);
      } else {
        setLocalColumnFilters(filters as ColumnFiltersState);
      }
    },
    onGlobalFilterChange: (value) => {
      if (manualFiltering) {
        onGlobalFilterChange?.(value);
      } else {
        setLocalGlobalSearch(value);
      }
    },
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

  /**
   * Reset all filters, search & set pagination to first page
   */
  const resetFilters = () => {
    table.setPageIndex(0);
    if (manualColumnFiltering) {
      externalOnColumnFiltersChange?.([]);
    } else {
      setLocalColumnFilters([]);
    }
    if (manualFiltering) {
      onGlobalFilterChange?.("");
    } else {
      setLocalGlobalSearch("");
    }
    setRowSelection?.({});
    onFilterReset?.();
    setSearchKey((prev) => (prev === 0 ? 1 : 0));
  };

  const [searchKey, setSearchKey] = useState(0);

  useEffect(() => {
    if (manualPagination && pagination) {
      const currentPagination = table.getState().pagination;
      if (isEqual(currentPagination, pagination)) return;

      table.setPagination({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
      });
    }
  }, [manualPagination, pagination, table]);

  useEffect(() => {
    if (manualFiltering && globalFilter !== undefined) {
      const currentGlobalFilter = table.getState().globalFilter;
      if (currentGlobalFilter !== globalFilter) {
        table.setGlobalFilter(globalFilter);
      }
    }
  }, [manualFiltering, globalFilter, table]);

  useEffect(() => {
    if (manualColumnFiltering && externalColumnFilters) {
      const currentFilters = table.getState().columnFilters;
      if (!isEqual(currentFilters, externalColumnFilters)) {
        table.setColumnFilters(externalColumnFilters);
      }
    }
  }, [manualColumnFiltering, externalColumnFilters, table]);

  return (
    <div className={cn("relative table-fixed-scroll", className)}>
      {showSearchAndFilters && (
        <div className={cn("flex gap-x-4 gap-y-6", !minimal && "p-default")}>
          <DataTableGlobalSearch
            className={searchClassName}
            disabled={false} // Never disable the search input
            key={searchKey}
            onClick={onSearchClick}
            isLoading={isLoading}
            globalSearch={
              manualFiltering ? globalFilter || "" : localGlobalSearch
            }
            setGlobalSearch={(val) => {
              table.setPageIndex(0);
              if (manualFiltering) {
                onGlobalFilterChange?.(val);
              } else {
                setLocalGlobalSearch(val);
              }
              resetRowSelectionOnSearch && setRowSelection?.({});
            }}
            placeholder={searchPlaceholder}
          />
          {children?.(table)}
          {showResetFilterButton && (
            <DataTableResetFilterButton
              onClick={resetFilters}
              table={table}
              hasServerSideFilters={hasServerSideFilters}
            />
          )}
          <div className={"flex gap-4 grow"}>
            <div className={"flex gap-4"}></div>
            {rightSide?.(table)}
          </div>
        </div>
      )}

      {aboveTable?.(table)}

      <div className="relative">
        {showOverlay && (
          <div className="absolute inset-0 bg-nb-gray-950/60 z-10 rounded-md animate-pulse" />
        )}
        <TableWrapper
          wrapperComponent={wrapperComponent}
          wrapperProps={wrapperProps}
        >
          {isLoading ? (
            <TableContentSkeleton />
          ) : !hasInitialData && !hasServerSideFilters ? (
            getStartedCard
          ) : (
            <TableComponent
              className={cn("relative mt-6", tableClassName)}
              minimal={minimal}
            >
              {showHeader && as == "table" && (
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

              <TableBodyComponent
                className={cn(
                  "relative",
                  data == undefined && "blur-sm",
                  wrapperClassName,
                )}
              >
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => {
                    const expandedRow = renderExpandedRow?.(row.original);
                    const rowId = row.original.id ?? row.id;
                    const isExpanded = accordion?.includes(rowId);
                    const rowContent = (
                      <React.Fragment key={row.id}>
                        <TableRowComponent
                          minimal={minimal}
                          data-row-id={rowId}
                          className={cn(
                            (onRowClick || renderExpandedRow) &&
                              "relative group/accordion",
                            (onRowClick || expandedRow) && "cursor-pointer",
                            typeof rowClassName === "function"
                              ? rowClassName(row)
                              : rowClassName,
                          )}
                          data-state={row.getIsSelected() && "selected"}
                          data-accordion={isExpanded ? "opened" : "closed"}
                          onClick={(e) => {
                            if (expandedRow) {
                              e.preventDefault();
                              e.stopPropagation();
                              setAccordion((prev) => {
                                if (prev?.includes(rowId)) {
                                  return prev.filter((item) => item !== rowId);
                                } else {
                                  return [...(prev ?? []), rowId];
                                }
                              });
                            }
                          }}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCellComponent
                              key={cell.id}
                              className={cn("relative", tableCellClassName)}
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
                        </TableRowComponent>

                        {expandedRow && isExpanded && (
                          <TableRowComponent
                            data-row-id={row.id + "-expanded-row"}
                            minimal={minimal}
                            className={cn(
                              onRowClick && "cursor-pointer relative",
                              typeof rowClassName === "function"
                                ? rowClassName(row)
                                : rowClassName,
                            )}
                            data-state={row.getIsSelected() && "selected"}
                          >
                            <TableDataUnstyledComponent
                              className={"w-full"}
                              colSpan={row.getVisibleCells().length}
                            >
                              {expandedRow}
                            </TableDataUnstyledComponent>
                          </TableRowComponent>
                        )}
                      </React.Fragment>
                    );

                    return renderRow
                      ? renderRow(row.original, rowContent)
                      : rowContent;
                  })
                ) : (
                  <TableRowUnstyledComponent>
                    <TableCellComponent
                      colSpan={columns.length}
                      className="!py-0 !px-0 text-center"
                    >
                      <NoResults className={"py-4"} />
                    </TableCellComponent>
                  </TableRowUnstyledComponent>
                )}
              </TableBodyComponent>
            </TableComponent>
          )}
        </TableWrapper>
      </div>

      <div className={paginationClassName}>
        <DataTablePagination
          table={table}
          text={text}
          paginationPadding={paginationPaddingClassName}
          totalRecords={totalRecords}
        />
      </div>

      <DataTableHeadingPortal
        table={table}
        headingTarget={headingTarget}
        totalRecords={totalRecords}
        manualPagination={manualPagination}
        hasActiveFilters={hasServerSideFilters}
      />
    </div>
  );
}
