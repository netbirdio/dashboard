import { Table } from "@tanstack/react-table";
import * as React from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Props<TData> = {
  table: Table<TData> | null;
  headingTarget?: HTMLHeadingElement | null;
  countLabel?: string;
  totalRecords?: number;
  manualPagination?: boolean;
  hasActiveFilters?: boolean;
};

export const DataTableHeadingPortal = function <TData>({
  table,
  headingTarget,
  countLabel = "",
  totalRecords,
  manualPagination,
  hasActiveFilters,
}: Props<TData>) {
  const hasMounted = useRef(false);
  const initialTotalRecords = useRef<number | undefined>(undefined);
  const portalContainer = useRef<HTMLSpanElement | null>(null);

  if (!portalContainer.current && typeof document !== "undefined") {
    portalContainer.current = document.createElement("span");
  }

  if (
    manualPagination &&
    totalRecords !== undefined &&
    initialTotalRecords.current === undefined
  ) {
    initialTotalRecords.current = totalRecords;
  }

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

  const hasAnyFiltersActive = manualPagination
    ? hasActiveFilters ?? totalRecords !== initialTotalRecords.current
    : table &&
      !(
        table?.getState().columnFilters.length <= 0 &&
        table?.getState().globalFilter === ""
      );

  const showHeadingCount = !!totalItems && totalItems !== 1;

  useEffect(() => {
    const container = portalContainer.current;
    if (!container) return;

    if (!headingTarget || !showHeadingCount) {
      container.remove();
      return;
    }

    headingTarget.prepend(container);
    return () => {
      container.remove();
    };
  }, [headingTarget, showHeadingCount]);

  if (!headingTarget || !showHeadingCount || !portalContainer.current) {
    return null;
  }

  return createPortal(
    <Heading
      hasAnyFilterActive={hasAnyFiltersActive}
      countLabel={countLabel}
      totalItems={totalItems}
      filteredItems={filteredItems}
    />,
    portalContainer.current,
  );
};

type HeadingProps = {
  hasAnyFilterActive: boolean | null;
  countLabel: string;
  filteredItems?: number;
  totalItems?: number;
};

const Heading = ({
  hasAnyFilterActive,
  countLabel,
  filteredItems,
  totalItems,
}: HeadingProps) => {
  if (hasAnyFilterActive) {
    return (
      <>
        <span className={"text-netbird"}>{filteredItems}</span> of {totalItems}{" "}
        {countLabel}
      </>
    );
  }

  return `${totalItems} ${countLabel}`;
};
