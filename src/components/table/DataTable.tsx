"use client";
import { TableContentSkeleton } from "@components/skeletons/SkeletonTable";
import { DataTableInstanceProvider } from "@components/table/DataTableContext";
import DataTableGlobalSearch from "@components/table/DataTableGlobalSearch";
import { DataTableHeadingPortal } from "@components/table/DataTableHeadingPortal";
import { DataTablePagination } from "@components/table/DataTablePagination";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import { DataTableRow } from "@components/table/DataTableRow";
import {
  DEFAULT_PAGE_SIZE,
  isAllowedPageSize,
} from "@components/table/pageSizes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@components/table/Table";
import { useVirtualRows } from "@components/table/useVirtualRows";
import NoResults from "@components/ui/NoResults";
import { RankingInfo } from "@tanstack/match-sorter-utils";
import {
  Cell,
  Column,
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  Row,
  RowData,
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
import { useCallback, useEffect, useRef, useState } from "react";
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
    datetime: SortingFn<unknown>;
  }
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Classes applied to both the header and body cells of the column. */
    className?: string;
    /** `false` leaves the column blank in the loading skeleton, e.g. for a column that is mostly empty. */
    skeleton?: false;
  }
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  try {
    const val = row.getValue(columnId);
    if (!val) return false;
    if (typeof val !== "string") return false;
    // Strip spaces from BOTH the query and the value so multi-word searches
    // ("OpenAI API") match values that contain spaces ("openai api …").
    // Previously only the query was stripped, so any multi-word search failed.
    const needle = removeAllSpaces(trim(value.toLowerCase()));
    const haystack = removeAllSpaces(val.toLowerCase());
    return haystack.includes(needle);
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

const datetimeSort: SortingFn<any> = (rowA, rowB, columnId) => {
  const aConnected = rowA.original?.connected;
  const bConnected = rowB.original?.connected;
  if (aConnected !== bConnected) return aConnected ? 1 : -1;
  const a = dayjs(rowA.getValue(columnId)).valueOf();
  const b = dayjs(rowB.getValue(columnId)).valueOf();
  return a - b;
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

/**
 * Rows are not required to carry an `id`, and some carry a nullable one, so
 * read it defensively rather than asserting it exists. Rows without a usable id
 * fall back to `fallbackRowId` — previously they silently got `undefined` as the
 * row key under `useRowId`, which breaks row selection.
 */
function readRowId(row: unknown): string | undefined {
  if (typeof row !== "object" || row === null || !("id" in row)) return;
  const id = (row as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
}

/**
 * Stands in for the rows scrolled out of view, so the scrollbar keeps the full page height.
 * It paints loading skeleton rows with one bar per visible column (see `.table-skeleton-row`),
 * which is what fast scrolling shows until the real rows are rendered.
 */
function VirtualSpacerRow<TData>({
  height,
  rowHeight,
  align,
  columns,
  minimal,
  inset,
  tableCellClassName,
}: {
  height: number;
  rowHeight: number;
  align: "top" | "bottom";
  columns: Column<TData>[];
  minimal?: boolean;
  inset?: boolean;
  tableCellClassName?: string;
}) {
  return (
    <tr
      aria-hidden
      className={"table-skeleton-row"}
      data-align={align}
      style={
        {
          height,
          "--skeleton-row-height": `${rowHeight}px`,
        } as React.CSSProperties
      }
    >
      {columns.map((column) => (
        <TableCell
          key={column.id}
          minimal={minimal}
          inset={inset}
          data-empty={column.columnDef.meta?.skeleton === false || undefined}
          className={cn(
            "table-skeleton-cell",
            tableCellClassName,
            column.columnDef.meta?.className,
            "py-0",
          )}
        />
      ))}
    </tr>
  );
}

/**
 * After a page change the new rows start at the table's top,
 * so a reader who scrolled past it is brought back to it.
 */
function scrollTableIntoView(element: HTMLElement | null) {
  if (!element) return;
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const { overflowY } = getComputedStyle(parent);
    const scrollable = overflowY === "auto" || overflowY === "scroll";
    if (scrollable && parent.scrollHeight > parent.clientHeight) break;
    parent = parent.parentElement;
  }
  const top = element.getBoundingClientRect().top;
  if (parent && parent !== document.body) {
    const offset = top - parent.getBoundingClientRect().top;
    if (offset < 0) parent.scrollTop += offset;
  } else if (top < 0) {
    window.scrollBy(0, top);
  }
}

/** Namespaced so an id-less row cannot collide with a real id like "1". */
const fallbackRowId = (index: number) => `row-${index}`;

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
  cellClassName?: (cell: Cell<TData, unknown>) => string;
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
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean);
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
  tableHeadClassName?: string;
  initialSelectionState?: RowSelectionState;
  initialPageSize?: number;
  uniqueKey?: string;
  resetRowSelectionOnSearch?: boolean;
  resetRowSelectionOnFilter?: boolean;
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
  cellClassName,
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
  enableRowSelection,
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
  tableHeadClassName,
  initialPageSize = DEFAULT_PAGE_SIZE,
  uniqueKey,
  resetRowSelectionOnSearch = true,
  resetRowSelectionOnFilter = false,
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

  // Page sizes saved before the rows-per-page options changed fall back to the default.
  const localPagination = isAllowedPageSize(
    paginationState.pageSize,
    initialPageSize,
  )
    ? paginationState
    : { pageIndex: 0, pageSize: initialPageSize };

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
        : localPagination,
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
      datetime: datetimeSort,
    },
    getRowId: useRowId
      ? (row, index) => readRowId(row) ?? fallbackRowId(index)
      : undefined,
    enableRowSelection,
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
      // Rows hidden by a filter stay in the selection map, so tables whose bulk
      // actions are destructive opt into clearing it whenever filters change.
      if (resetRowSelectionOnFilter) setRowSelection?.({});
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
  const toggleExpanded = useCallback((rowId: string) => {
    setAccordion((prev) =>
      prev?.includes(rowId)
        ? prev.filter((item) => item !== rowId)
        : [...(prev ?? []), rowId],
    );
  }, []);

  const pageRows = table.getRowModel().rows;
  const visibleColumnIds = table
    .getVisibleLeafColumns()
    .map((column) => column.id)
    .join();
  const virtualRows = useVirtualRows(pageRows, as === "table");

  const TableComponent = as === "table" ? Table : "div";
  const TableHeaderComponent = as === "table" ? TableHeader : "div";
  const TableBodyComponent = as === "table" ? TableBody : "div";
  const TableRowComponent = as === "table" ? TableRow : "div";
  const TableCellComponent = as === "table" ? TableCell : "div";
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

  const rootRef = useRef<HTMLDivElement>(null);
  const { pageIndex, pageSize } = table.getState().pagination;
  const previousPage = useRef({ pageIndex, pageSize });
  useEffect(() => {
    const previous = previousPage.current;
    previousPage.current = { pageIndex, pageSize };
    if (previous.pageIndex === pageIndex && previous.pageSize === pageSize) {
      return;
    }
    scrollTableIntoView(rootRef.current);
  }, [pageIndex, pageSize]);

  const content = (
    <div ref={rootRef} className={cn("relative table-fixed-scroll", className)}>
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
                            className={cn(
                              tableHeadClassName,
                              header.column.columnDef.meta?.className,
                            )}
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
                ref={virtualRows.bodyRef}
                className={cn(
                  "relative",
                  data == undefined && "blur-sm",
                  wrapperClassName,
                )}
              >
                {virtualRows.isVirtualized && virtualRows.paddingTop > 0 && (
                  <VirtualSpacerRow
                    height={virtualRows.paddingTop}
                    rowHeight={virtualRows.rowHeight}
                    align={"bottom"}
                    columns={table.getVisibleLeafColumns()}
                    minimal={minimal}
                    inset={inset}
                    tableCellClassName={tableCellClassName}
                  />
                )}
                {pageRows.length ? (
                  virtualRows.visibleRows.map((row, i) => {
                    const rowId = readRowId(row.original) ?? row.id;
                    return (
                      <DataTableRow
                        key={row.id}
                        row={row}
                        rowId={rowId}
                        isSelected={row.getIsSelected()}
                        isExpanded={!!accordion?.includes(rowId)}
                        visibleColumnIds={visibleColumnIds}
                        columns={columns}
                        as={as}
                        minimal={minimal}
                        inset={inset}
                        rowClassName={rowClassName}
                        cellClassName={cellClassName}
                        tableCellClassName={tableCellClassName}
                        onRowClick={onRowClick}
                        onToggleExpanded={toggleExpanded}
                        renderExpandedRow={renderExpandedRow}
                        renderRow={renderRow}
                        {...(virtualRows.isVirtualized && {
                          virtualIndex: virtualRows.virtualItems[i].index,
                          measureRef: virtualRows.measureRow,
                          expandedRowRef: virtualRows.expandedRowRef,
                        })}
                      />
                    );
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
                {virtualRows.isVirtualized && virtualRows.paddingBottom > 0 && (
                  <VirtualSpacerRow
                    height={virtualRows.paddingBottom}
                    rowHeight={virtualRows.rowHeight}
                    align={"top"}
                    columns={table.getVisibleLeafColumns()}
                    minimal={minimal}
                    inset={inset}
                    tableCellClassName={tableCellClassName}
                  />
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
          onPageChange={() => scrollTableIntoView(rootRef.current)}
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

  return (
    <DataTableInstanceProvider table={table}>
      {content}
    </DataTableInstanceProvider>
  );
}
