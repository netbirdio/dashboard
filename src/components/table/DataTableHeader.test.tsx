import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTableInstanceProvider } from "./DataTableContext";
import DataTableHeader from "./DataTableHeader";

// A header click must always replace the sort with the clicked column alone.
// The peers tables default to a multi-sort ([connected, last_seen, name]), and
// column.toggleSorting() only toggles in place when the clicked column is that
// sort's last entry — so the click used to leave the visible order untouched.

const { setSort } = vi.hoisted(() => ({ setSort: vi.fn() }));

vi.mock("@/contexts/ServerPaginationProvider", () => ({
  useOptionalServerPagination: () => ({ setSort }),
}));

afterEach(() => {
  cleanup();
  setSort.mockClear();
});

type Peer = { name: string; connected: boolean; last_seen: string };

const peers: Peer[] = [
  { name: "alpha", connected: false, last_seen: "2026-01-01" },
  { name: "zulu", connected: true, last_seen: "2026-03-01" },
  { name: "mike", connected: true, last_seen: "2026-02-01" },
];

const columns: ColumnDef<Peer>[] = [
  { id: "name", accessorKey: "name", sortingFn: "text" },
  { id: "connected", accessorKey: "connected" },
  { id: "last_seen", accessorKey: "last_seen", sortingFn: "text" },
];

// DataTable augments TanStack's FilterFns and SortingFns interfaces, which makes
// both options required on every table in the app. Nothing here uses them.
const filterFns = {
  fuzzy: () => true,
  dateRange: () => true,
  exactMatch: () => true,
  arrIncludesSomeExact: () => true,
};
const sortingFns = { checkbox: () => 0, datetime: () => 0 };

// Mirrors DataTable: sorting state lives in the parent and is fed back through
// state.sorting / onSortingChange.
function Harness({
  initialSorting,
  columnId,
  name,
}: {
  initialSorting: SortingState;
  columnId: string;
  name?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const table = useReactTable({
    data: peers,
    columns,
    filterFns,
    sortingFns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <DataTableInstanceProvider table={table}>
      <DataTableHeader column={table.getColumn(columnId)!} name={name}>
        Header
      </DataTableHeader>
      <output data-testid={"sorting"}>{JSON.stringify(sorting)}</output>
      <ul>
        {table.getRowModel().rows.map((row) => (
          <li key={row.id}>{row.original.name}</li>
        ))}
      </ul>
    </DataTableInstanceProvider>
  );
}

const defaultSorting: SortingState = [
  { id: "connected", desc: true },
  { id: "last_seen", desc: true },
  { id: "name", desc: false },
];

const rowOrder = () =>
  screen.getAllByRole("listitem").map((row) => row.textContent);

const sortingState = () =>
  JSON.parse(screen.getByTestId("sorting").textContent ?? "");

const clickHeader = () => fireEvent.click(screen.getByText("Header"));

describe("DataTableHeader sorting", () => {
  it("replaces a default multi-sort when its lowest-priority column is clicked", () => {
    render(<Harness initialSorting={defaultSorting} columnId={"name"} />);
    expect(rowOrder()).toEqual(["zulu", "mike", "alpha"]);

    clickHeader();

    expect(rowOrder()).toEqual(["alpha", "mike", "zulu"]);
    expect(sortingState()).toEqual([{ id: "name", desc: false }]);
  });

  it("sorts ascending on the first click of a column that does not lead the sort", () => {
    render(<Harness initialSorting={[]} columnId={"name"} />);

    clickHeader();

    expect(sortingState()).toEqual([{ id: "name", desc: false }]);
    expect(rowOrder()).toEqual(["alpha", "mike", "zulu"]);
  });

  it("toggles the direction while the column leads the sort", () => {
    render(
      <Harness
        initialSorting={[{ id: "name", desc: false }]}
        columnId={"name"}
      />,
    );

    clickHeader();
    expect(sortingState()).toEqual([{ id: "name", desc: true }]);
    expect(rowOrder()).toEqual(["zulu", "mike", "alpha"]);

    clickHeader();
    expect(sortingState()).toEqual([{ id: "name", desc: false }]);
    expect(rowOrder()).toEqual(["alpha", "mike", "zulu"]);
  });

  it("reports the direction it applied to server-side pagination", () => {
    render(
      <Harness
        initialSorting={defaultSorting}
        columnId={"name"}
        name={"name"}
      />,
    );

    clickHeader();

    expect(sortingState()).toEqual([{ id: "name", desc: false }]);
    expect(setSort).toHaveBeenCalledWith("name", "asc");
  });
});
