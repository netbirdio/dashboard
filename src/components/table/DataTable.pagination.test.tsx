import { ColumnDef, Table } from "@tanstack/react-table";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/test" }));

const { DataTable } = await import("@components/table/DataTable");

type Row = { id: string };

const columns: ColumnDef<Row>[] = [
  { id: "id", accessorKey: "id", header: "ID" },
];

afterEach(cleanup);

function renderServerTable(
  pagination: { pageIndex: number; pageSize: number } | undefined,
  onPaginationChange: (p: { pageIndex: number; pageSize: number }) => void,
) {
  let table!: Table<Row>;
  render(
    <DataTable
      columns={columns}
      data={undefined}
      manualPagination
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      showSearchAndFilters
    >
      {(t) => {
        table = t;
        return null;
      }}
    </DataTable>,
  );
  // The first page change after mount is ignored by DataTable.
  act(() => table.setPageIndex(0));
  return table;
}

describe("DataTable server-side pagination", () => {
  // Regression: switching traffic direction while events were loading threw
  // "Cannot read properties of undefined (reading 'pageIndex')".
  it("resets the page while server data is still loading", () => {
    const onPaginationChange = vi.fn();
    const table = renderServerTable(undefined, onPaginationChange);

    expect(() => act(() => table.setPageIndex(0))).not.toThrow();
    expect(onPaginationChange).toHaveBeenLastCalledWith({
      pageIndex: 0,
      pageSize: 10,
    });
  });

  it("applies page changes to the pagination it was given", () => {
    const onPaginationChange = vi.fn();
    const table = renderServerTable(
      { pageIndex: 2, pageSize: 25 },
      onPaginationChange,
    );

    act(() => table.nextPage());

    expect(onPaginationChange).toHaveBeenLastCalledWith({
      pageIndex: 3,
      pageSize: 25,
    });
  });
});
