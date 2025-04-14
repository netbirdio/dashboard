import { cn } from "@utils/helpers";
import * as React from "react";

type TableWrapperProps = {
  wrapperComponent?: React.ElementType;
  wrapperProps?: any;
  children: React.ReactNode;
};

const TableWrapper = ({
  wrapperComponent,
  children,
  wrapperProps,
}: TableWrapperProps) => {
  if (!wrapperComponent) return <>{children}</>;
  return React.createElement(
    wrapperComponent,
    wrapperProps ? wrapperProps : {},
    children,
  );
};

type TableProps = {
  minimal?: boolean;
};
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & TableProps
>(({ className, minimal, ...props }, ref) => {
  return (
    <div className={cn("relative overflow-x-auto w-full")}>
      <table
        ref={ref}
        className={cn(
          "caption-bottom text-sm min-w-full max-w-full w-full",
          minimal ? "" : "border dark:border-zinc-700/40 border-gray-200 border-l-0 border-r-0",
          className,
        )}
        {...props}
      />
    </div>
  );
});
Table.displayName = "Table";

type TableHeaderProps = {
  minimal?: boolean;
};
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & TableHeaderProps
>(({ className, minimal, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      !minimal && "[&_tr]:border-b dark:border-zinc-700/40 border-gray-200",
      className,
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      "[&_tr:last-child]:border-0 dark:border-zinc-700/40 border-gray-200",
      className,
    )}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "bg-neutral-900 font-medium text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

type TableRowProps = {
  minimal?: boolean;
};
const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & TableRowProps
>(({ className, minimal, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "transition-colors group/table-row data-[state=selected]:bg-neutral-100 dark:data-[state=selected]:bg-nb-gray-930/70",
      "data-[state=selected]:border-gray-200 dark:data-[state=selected]:border-nb-gray-900",
      "table-row-hoverable",
      minimal
        ? ""
        : "border-b dark:border-zinc-700/40 border-gray-200",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

type TableHeadProps = {
  minimal?: boolean;
  inset?: boolean;
};

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & TableHeadProps
>(({ className, minimal, inset, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle uppercase font-medium [&:has([role=checkbox])]:pr-0 w-auto",
      minimal
        ? "px-6"
        : "text-neutral-500 bg-gray-50 dark:text-nb-gray-400 dark:bg-nb-gray-900",
      inset && "first:pl-[52px]",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

type TableCellProps = {
  minimal?: boolean;
  inset?: boolean;
};

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & TableCellProps
>(({ className, minimal, inset, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "align-middle [&:has([role=checkbox])]:pr-0",
      minimal ? "px-6 pt-2 pb-3" : "p-4",
      inset && "first:pl-[52px]",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      "mt-4 text-sm text-muted ",
      className,
    )}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
};
