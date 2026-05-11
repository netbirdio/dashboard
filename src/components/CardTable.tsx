import useCopyToClipboard from "@hooks/useCopyToClipboard";
import { cn } from "@utils/helpers";
import { Copy } from "lucide-react";
import React from "react";

type CardTableProps = {
  children: React.ReactNode;
  className?: string;
};

function CardTable({ children, className }: CardTableProps) {
  return (
    <div
      className={cn(
        "bg-nb-gray-940 rounded-md border border-nb-gray-900 w-full overflow-hidden",
        className,
      )}
    >
      <table className={"w-full border-collapse text-sm"}>{children}</table>
    </div>
  );
}

function CardTableHeader({ children, className }: CardTableProps) {
  return (
    <thead>
      <tr
        className={cn(
          "border-b border-nb-gray-900",
          className,
        )}
      >
        {children}
      </tr>
    </thead>
  );
}

type CardTableHeaderCellProps = {
  children: React.ReactNode;
  width?: number;
  className?: string;
};

function CardTableHeaderCell({
  children,
  width,
  className,
}: CardTableHeaderCellProps) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-left text-sm font-normal",
        className,
      )}
      style={width ? { width } : undefined}
    >
      {children}
    </th>
  );
}

function CardTableBody({ children, className }: CardTableProps) {
  return <tbody className={className}>{children}</tbody>;
}

type CardTableRowProps = {
  children: React.ReactNode;
  className?: string;
};

function CardTableRow({ children, className }: CardTableRowProps) {
  return (
    <tr
      className={cn(
        "border-b border-nb-gray-900 last:border-b-0",
        className,
      )}
    >
      {children}
    </tr>
  );
}

type CardTableCellProps = {
  children: React.ReactNode;
  copy?: boolean;
  copyText?: string;
  width?: number;
  className?: string;
};

function CardTableCell({
  children,
  copy = false,
  copyText,
  width,
  className,
}: CardTableCellProps) {
  const [, copyToClipBoard] = useCopyToClipboard(copyText ?? "");
  return (
    <td
      className={cn("px-4 py-3", className)}
      style={width ? { width } : undefined}
    >
      <div
        className={cn(
          "text-nb-gray-400 text-sm flex items-center gap-2",
          copy && "cursor-pointer hover:text-nb-gray-300 transition-all",
        )}
        onClick={() =>
          copy &&
          copyToClipBoard(`${copyText} has been copied to clipboard.`)
        }
      >
        {children}
        {copy && <Copy size={13} className={"shrink-0"} />}
      </div>
    </td>
  );
}

CardTable.Header = CardTableHeader;
CardTable.HeaderCell = CardTableHeaderCell;
CardTable.Body = CardTableBody;
CardTable.Row = CardTableRow;
CardTable.Cell = CardTableCell;

export default CardTable;
