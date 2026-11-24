import { Table } from "@tanstack/react-table";
import * as React from "react";
import { useLayoutEffect, useRef, useState } from "react";
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
  // One container for the component's lifetime: a new one per render would
  // make React delete and recreate the count text on every table update.
  const [portalContainer] = useState(() =>
    typeof document === "undefined" ? null : document.createElement("span"),
  );
  const initialTotalRecords = useRef<number | undefined>(undefined);

  if (
    manualPagination &&
    totalRecords !== undefined &&
    initialTotalRecords.current === undefined
  ) {
    initialTotalRecords.current = totalRecords;
  }

  useLayoutEffect(() => {
    if (!headingTarget || !portalContainer) return;
    headingTarget.prepend(portalContainer);
    return () => portalContainer.remove();
  }, [headingTarget, portalContainer]);

  if (!headingTarget || !portalContainer) return;
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
