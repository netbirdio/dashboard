import ButtonGroup from "@components/ButtonGroup";
import { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  text?: string;
}

export function DataTablePagination<TData>({
  table,
  text = "rows",
}: DataTablePaginationProps<TData>) {
  const allRows = table.getFilteredRowModel().rows.length;
  const rowsPerPage = table.getState().pagination.pageSize;
  const currentPage = table.getState().pagination.pageIndex + 1;
  const isLastPage = currentPage === table.getPageCount();
  const showingFrom = (currentPage - 1) * rowsPerPage + 1;
  const showingTo = isLastPage ? allRows : showingFrom + rowsPerPage - 1;
  const pageCount = table.getPageCount();

  return pageCount > 1 ? (
    <div className="flex items-center justify-between px-8 py-8">
      <div className=" text-nb-gray-400">
        Showing{" "}
        <span className={"font-medium text-white"}>
          {showingFrom} to {showingTo}
        </span>{" "}
        of <span className={"font-medium text-white"}>{allRows}</span> {text}
      </div>
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
                {table.getState().pagination.pageIndex + 1} of {pageCount}
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
    </div>
  ) : null;
}
