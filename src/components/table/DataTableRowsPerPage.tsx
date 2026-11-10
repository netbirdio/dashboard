import ButtonGroup from "@components/ButtonGroup";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { rowsSelection } from "@components/table/pageSizes";
import { cn } from "@utils/helpers";
import { Check, ChevronDown, RowsIcon } from "lucide-react";
import * as React from "react";

type Props = {
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
};

export function DataTableRowsPerPage({
  pageSize,
  onPageSizeChange,
  disabled,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      {/* Styled as a one-button group so it matches the page buttons next to it. */}
      <ButtonGroup>
        <DropdownMenuTrigger asChild>
          <ButtonGroup.Button
            ref={triggerRef}
            disabled={disabled}
            data-testid={"rows-per-page"}
            className={"gap-2"}
          >
            <RowsIcon size={15} className={"shrink-0"} />
            <span>{pageSize} rows per page</span>
            <ChevronDown size={16} className={"opacity-50"} />
          </ButtonGroup.Button>
        </DropdownMenuTrigger>
      </ButtonGroup>
      <DropdownMenuContent
        className={"w-(--radix-dropdown-menu-trigger-width)"}
        sideOffset={7}
        // Focus still returns to the trigger, but without scrolling to it,
        // so the table's jump back to the top after a page size change sticks.
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          triggerRef.current?.focus({ preventScroll: true });
        }}
      >
        {rowsSelection.map((value) => (
          <DropdownMenuItem
            key={value}
            data-testid={"rows-per-page-value"}
            onClick={() => {
              setOpen(false);
              onPageSizeChange(value);
            }}
          >
            <div className={"flex gap-3 items-center"}>
              <Check
                size={14}
                className={cn(
                  "shrink-0",
                  pageSize === value ? "opacity-100" : "opacity-0",
                )}
              />
              {value} rows
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
