import { TableCell, TableRow } from "@components/table/Table";
import { Cell, ColumnDef, flexRender, Row } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import * as React from "react";
import { memo } from "react";

type Props<TData> = {
  row: Row<TData>;
  rowId: string;
  /**
   * Passed explicitly although the row can read them itself,
   * because the memo only re-renders a row when one of its props changes.
   */
  isSelected: boolean;
  isExpanded: boolean;
  visibleColumnIds: string;
  columns: ColumnDef<TData, any>[];
  as: "div" | "table";
  minimal?: boolean;
  inset?: boolean;
  rowClassName?: string | ((row: Row<TData>) => string);
  cellClassName?: (cell: Cell<TData, unknown>) => string;
  tableCellClassName?: string;
  onRowClick?: (row: Row<TData>, cell: string) => void;
  onToggleExpanded: (rowId: string) => void;
  renderExpandedRow?: (row: TData) => React.ReactNode;
  renderRow?: (row: TData, children: React.ReactNode) => React.ReactNode;
  virtualIndex?: number;
  measureRef?: (element: HTMLTableRowElement | null) => void;
  expandedRowRef?: (element: HTMLTableRowElement | null) => void;
};

/**
 * Memoized so that scrolling a virtualized table only renders the rows entering the viewport
 * instead of every visible row on each scroll step.
 */
function DataTableRowComponent<TData>({
  row,
  rowId,
  isSelected,
  isExpanded,
  as,
  minimal,
  inset,
  rowClassName,
  cellClassName,
  tableCellClassName,
  onRowClick,
  onToggleExpanded,
  renderExpandedRow,
  renderRow,
  virtualIndex,
  measureRef,
  expandedRowRef,
}: Props<TData>) {
  const TableRowComponent = as === "table" ? TableRow : "div";
  const TableCellComponent = as === "table" ? TableCell : "div";
  const TableDataUnstyledComponent = as === "table" ? "td" : "div";

  const expandedRow = renderExpandedRow?.(row.original);
  const resolvedRowClassName =
    typeof rowClassName === "function" ? rowClassName(row) : rowClassName;

  const content = (
    <>
      <TableRowComponent
        minimal={minimal}
        data-row-id={rowId}
        ref={measureRef}
        data-index={virtualIndex}
        className={cn(
          (onRowClick || renderExpandedRow) && "relative group/accordion",
          (onRowClick || expandedRow) && "cursor-pointer",
          resolvedRowClassName,
        )}
        data-state={isSelected && "selected"}
        data-accordion={isExpanded ? "opened" : "closed"}
        onClick={(e: React.MouseEvent) => {
          if (expandedRow) {
            e.preventDefault();
            e.stopPropagation();
            onToggleExpanded(rowId);
          }
        }}
      >
        {row.getVisibleCells().map((cell) => (
          <TableCellComponent
            key={cell.id}
            className={cn(
              "relative",
              tableCellClassName,
              cell.column.columnDef.meta?.className,
              cellClassName?.(cell),
            )}
            minimal={minimal}
            inset={inset}
            onClick={() => {
              onRowClick && onRowClick(row, cell.column.id);
            }}
          >
            <div className={"absolute left-0 top-0 w-full h-full z-0"}></div>
            <div className={"relative z-[1]"}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          </TableCellComponent>
        ))}
      </TableRowComponent>

      {expandedRow && isExpanded && (
        <TableRowComponent
          data-row-id={row.id + "-expanded-row"}
          data-expanded-row
          ref={expandedRowRef}
          minimal={minimal}
          className={cn(
            onRowClick && "cursor-pointer relative",
            resolvedRowClassName,
          )}
          data-state={isSelected && "selected"}
        >
          <TableDataUnstyledComponent
            className={"w-full"}
            colSpan={row.getVisibleCells().length}
          >
            {expandedRow}
          </TableDataUnstyledComponent>
        </TableRowComponent>
      )}
    </>
  );

  return renderRow ? renderRow(row.original, content) : content;
}

export const DataTableRow = memo(
  DataTableRowComponent,
) as typeof DataTableRowComponent;
