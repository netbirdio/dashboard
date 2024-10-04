import { Table } from "@tanstack/react-table";
import * as React from "react";
import { useRef } from "react";
import { createPortal } from "react-dom";

type Props<TData> = {
  table: Table<TData> | null;
  headingTarget?: HTMLHeadingElement | null;
};

export const DataTableHeadingPortal = function <TData>({
  table,
  headingTarget,
}: Props<TData>) {
  const hasMounted = useRef(false);

  if (!headingTarget) return;
  if (!hasMounted.current) hasMounted.current = true;

  const totalItems = table?.getPreFilteredRowModel().rows.length;
  const filteredItems = table?.getFilteredRowModel().rows.length;
  if (!totalItems || totalItems == 1) return;

  const hasAnyFiltersActive =
    table &&
    !(
      table?.getState().columnFilters.length <= 0 &&
      table?.getState().globalFilter === ""
    );

  const portalContainer = document.createElement("span");
  headingTarget.prepend(portalContainer);

  return createPortal(
    <Heading
      hasAnyFilterActive={hasAnyFiltersActive}
      totalItems={totalItems}
      filteredItems={filteredItems}
    />,
    portalContainer,
  );
};

type HeadingProps = {
  hasAnyFilterActive: boolean | null;
  filteredItems?: number;
  totalItems?: number;
};

const Heading = ({
  hasAnyFilterActive,
  filteredItems,
  totalItems,
}: HeadingProps) => {
  if (hasAnyFilterActive) {
    return (
      <>
        <span className={"text-netbird"}>{filteredItems}</span> of {totalItems}{" "}
      </>
    );
  }

  return `${totalItems} `;
};
