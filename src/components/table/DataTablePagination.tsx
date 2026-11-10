import ButtonGroup from "@components/ButtonGroup";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { rowsSelection } from "@components/table/pageSizes";
import { Table } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import * as React from "react";
import { useOptimistic, useRef, useTransition } from "react";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  text?: string;
  paginationPadding?: string;
  totalRecords?: number;
  /** Called as soon as a page change is requested, before the new rows have rendered. */
  onPageChange?: () => void;
}

/**
 * Runs a pagination action on mouse press rather than release,
 * which starts rendering the next page a click's duration earlier.
 * Keyboard and touch activation still go through `click`.
 */
function usePressAction() {
  const pressedAt = useRef(0);
  return (action: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      pressedAt.current = performance.now();
      action();
    },
    onClick: () => {
      // The press already ran the action for this click.
      if (performance.now() - pressedAt.current < 1000) return;
      action();
    },
  });
}

export function DataTablePagination<TData>({
  table,
  text = "rows",
  paginationPadding = "px-8 py-8",
  totalRecords,
  onPageChange,
}: DataTablePaginationProps<TData>) {
  const pagination = table.getState().pagination;
  const totalRows =
    totalRecords !== undefined
      ? totalRecords
      : table.getFilteredRowModel().rows.length;

  /**
   * Rendering a new page of rows takes a moment, so the controls show the
   * requested page straight away and the rows follow in a transition,
   * which keeps clicks on the controls responsive while the rows render.
   */
  const [, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(pagination);
  const pageCount =
    shown.pageSize === pagination.pageSize
      ? table.getPageCount()
      : Math.max(1, Math.ceil(totalRows / shown.pageSize));

  const goToPage = (pageIndex: number) => {
    const index = Math.min(Math.max(pageIndex, 0), pageCount - 1);
    if (index === shown.pageIndex) return;
    onPageChange?.();
    startTransition(() => {
      setShown({ ...shown, pageIndex: index });
      table.setPageIndex(index);
    });
  };

  const changePageSize = (pageSize: number) => {
    onPageChange?.();
    startTransition(() => {
      // Matches TanStack Table, which keeps the first visible row on the new page.
      const firstRow = shown.pageIndex * shown.pageSize;
      setShown({ pageIndex: Math.floor(firstRow / pageSize), pageSize });
      table.setPageSize(pageSize);
    });
  };

  const press = usePressAction();
  const currentPage = shown.pageIndex + 1;
  const canPrevious = shown.pageIndex > 0;
  const canNext = currentPage < pageCount;
  const showingFrom =
    totalRows === 0 ? 0 : (currentPage - 1) * shown.pageSize + 1;
  const showingTo = Math.min(currentPage * shown.pageSize, totalRows);

  // Keep the footer visible while a larger page size fits everything on one page,
  // otherwise the rows-per-page selector disappears and the size cannot be lowered again.
  const canChangePageSize = totalRows > rowsSelection[0];

  return (
    (pageCount > 1 || canChangePageSize) && (
      <div
        className={cn("flex items-center justify-between", paginationPadding)}
      >
        <div className="text-nb-gray-400">
          Showing{" "}
          <span className={"font-medium text-white"}>
            {showingFrom} to {showingTo}
          </span>{" "}
          of <span className={"font-medium text-white"}>{totalRows}</span>{" "}
          {text}
        </div>
        <div className={"flex items-center gap-4"}>
          <DataTableRowsPerPage
            pageSize={shown.pageSize}
            onPageSizeChange={changePageSize}
          />
          {pageCount > 1 && (
            <div className="flex items-center space-x-2">
              <ButtonGroup>
                <ButtonGroup.Button
                  {...press(() => goToPage(0))}
                  disabled={!canPrevious}
                >
                  <ChevronsLeft size={16} />
                </ButtonGroup.Button>
                <ButtonGroup.Button
                  {...press(() => goToPage(shown.pageIndex - 1))}
                  disabled={!canPrevious}
                >
                  <ChevronLeft size={18} />
                </ButtonGroup.Button>
                <ButtonGroup.Button>
                  <div>
                    {currentPage} of {pageCount}
                  </div>
                </ButtonGroup.Button>
                <ButtonGroup.Button
                  {...press(() => goToPage(shown.pageIndex + 1))}
                  disabled={!canNext}
                >
                  <ChevronRight size={18} />
                </ButtonGroup.Button>
                <ButtonGroup.Button
                  {...press(() => goToPage(pageCount - 1))}
                  disabled={!canNext}
                >
                  <ChevronsRight size={18} />
                </ButtonGroup.Button>
              </ButtonGroup>
            </div>
          )}
        </div>
      </div>
    )
  );
}
