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

describe("DataTable automatic page reset", () => {
  // An empty table must settle: with autoResetPageIndex, every new data reference
  // resets the page, and each reset re-renders the table.
  it("settles when rendering an empty table", async () => {
    let renders = 0;
    const empty: Row[] = [];
    render(
      <DataTable
        columns={columns}
        data={empty}
        autoResetPageIndex
        keepStateInLocalStorage={false}
        showSearchAndFilters
      >
        {() => {
          renders++;
          return null;
        }}
      </DataTable>,
    );
    await act(async () => {});
    const settled = renders;
    await act(async () => {});
    await act(async () => {});
    expect(renders, "an empty table must not keep re-rendering").toBe(settled);
    expect(
      settled,
      "an empty table renders a bounded number of times",
    ).toBeLessThan(5);
  });
});
