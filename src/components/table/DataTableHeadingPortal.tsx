import { Table } from "@tanstack/react-table";
import * as React from "react";
import { useRef } from "react";
import { createPortal } from "react-dom";

type Props<TData> = {
  table: Table<TData> | null;
  headingTarget?: HTMLHeadingElement | null;
  totalRecords?: number;
  manualPagination?: boolean;
  hasActiveFilters?: boolean;
};

export const DataTableHeadingPortal = function <TData>({
  table,
  headingTarget,
  totalRecords,
  manualPagination,
  hasActiveFilters,
}: Props<TData>) {
  const hasMounted = useRef(false);
  const initialTotalRecords = useRef<number | undefined>(undefined);

  if (
    manualPagination &&
    totalRecords !== undefined &&
    initialTotalRecords.current === undefined
  ) {
    initialTotalRecords.current = totalRecords;
  }

  if (!headingTarget) return;
  if (!hasMounted.current) hasMounted.current = true;

  const filteredItems = manualPagination
    ? totalRecords
    : table?.getFilteredRowModel().rows.length;

  const getTotalRecords = () => {
    if (Number(initialTotalRecords.current) < Number(filteredItems)) {
      initialTotalRecords.current = filteredItems;
      return filteredItems;
    }
    return initialTotalRecords.current;
  };

  const totalItems = manualPagination
    ? getTotalRecords()
    : table?.getPreFilteredRowModel().rows.length;

  if (!totalItems || totalItems == 1) return;

  const hasAnyFiltersActive = manualPagination
    ? hasActiveFilters ?? totalRecords !== initialTotalRecords.current
    : table &&
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
