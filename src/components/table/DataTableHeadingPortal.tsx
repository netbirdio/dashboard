import { Table } from "@tanstack/react-table";
import * as React from "react";
import { useRef } from "react";
import { createPortal } from "react-dom";

type Props<TData> = {
  table: Table<TData> | null;
  headingTarget?: HTMLHeadingElement | null;
  text: string;
};
export const DataTableHeadingPortal = function <TData>({
  table,
  headingTarget,
  text = "Items",
}: Props<TData>) {
  const hasMounted = useRef(false);

  if (!headingTarget) return;

  if (!hasMounted.current) {
    headingTarget.innerHTML = "";
    hasMounted.current = true;
  }

  const totalItems = table?.getPreFilteredRowModel().rows.length;
  const filteredItems = table?.getFilteredRowModel().rows.length;

  const hasAnyFiltersActive =
    table &&
    !(
      table?.getState().columnFilters.length <= 0 &&
      table?.getState().globalFilter === ""
    );

  return createPortal(
    <Heading
      text={text}
      hasAnyFilterActive={hasAnyFiltersActive}
      totalItems={totalItems}
      filteredItems={filteredItems}
    />,
    headingTarget,
  );
};

type HeadingProps = {
  hasAnyFilterActive: boolean | null;
  filteredItems?: number;
  totalItems?: number;
  text: string;
};

const Heading = ({
  hasAnyFilterActive,
  filteredItems,
  totalItems,
  text,
}: HeadingProps) => {
  if (!totalItems || totalItems == 1) {
    return text;
  }

  if (hasAnyFilterActive) {
    return (
      <>
        <span className={"text-netbird"}>{filteredItems}</span> of {totalItems}{" "}
        {text}
      </>
    );
  }

  return `${totalItems} ${text}`;
};
