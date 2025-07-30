import ButtonGroup from "@components/ButtonGroup";
import { Table } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  text?: string;
  paginationPadding?: string;
  totalRecords?: number;
}

export function DataTablePagination<TData>({
  table,
  text = "rows",
  paginationPadding = "px-8 py-8",
  totalRecords,
}: DataTablePaginationProps<TData>) {
  const rowsPerPage = table.getState().pagination.pageSize;
  const currentPage = table.getState().pagination.pageIndex + 1;
  const pageCount = table.getPageCount();

  const totalRows =
    totalRecords !== undefined
      ? totalRecords
      : table.getFilteredRowModel().rows.length;

  const showingFrom = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const showingTo = Math.min(currentPage * rowsPerPage, totalRows);

  return (
    pageCount > 1 && (
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
        {pageCount > 1 && (
          <div className={"flex items-center gap-3"}>
            <div className="flex items-center space-x-2">
              <ButtonGroup>
                <ButtonGroup.Button
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronsLeft size={16} />
                </ButtonGroup.Button>
                <ButtonGroup.Button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft size={18} />
                </ButtonGroup.Button>
                <ButtonGroup.Button>
                  <div>
                    {currentPage} of {pageCount}
                  </div>
                </ButtonGroup.Button>
                <ButtonGroup.Button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight size={18} />
                </ButtonGroup.Button>
                <ButtonGroup.Button
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronsRight size={18} />
                </ButtonGroup.Button>
              </ButtonGroup>
            </div>
          </div>
        )}
      </div>
    )
  );
}
