import { ColumnDef } from "@tanstack/react-table";
import { cleanup, render } from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// A column's `meta.className` must land on both its header cell and its body
// cells, otherwise a responsive class such as `hidden xl:table-cell` would hide
// one half of the column and leave the other behind.
vi.mock("next/navigation", () => ({
  usePathname: () => "/test",
}));

const { DataTable } = await import("@components/table/DataTable");

type Row = { id: string; name: string; enabled: boolean };

const rows: Row[] = [
  { id: "a", name: "First", enabled: true },
  { id: "b", name: "Second", enabled: false },
];

const columns: ColumnDef<Row>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
  {
    id: "enabled",
    accessorKey: "enabled",
    header: "Active",
    meta: { className: "hidden xl:table-cell" },
    cell: ({ row }) => (row.original.enabled ? "on" : "off"),
  },
];

afterEach(cleanup);

describe("DataTable column meta className", () => {
  it("applies the class to the column's header cell", () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={rows}
        showSearchAndFilters={false}
        keepStateInLocalStorage={false}
      />,
    );
    const headers = container.querySelectorAll("thead th");
    expect(headers[0].className).not.toContain("xl:table-cell");
    expect(headers[1].className).toContain("hidden");
    expect(headers[1].className).toContain("xl:table-cell");
  });

  it("applies the class to every body cell of the column", () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={rows}
        showSearchAndFilters={false}
        keepStateInLocalStorage={false}
      />,
    );
    const bodyRows = container.querySelectorAll("tbody tr");
    expect(bodyRows).toHaveLength(rows.length);
    bodyRows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      expect(cells[0].className).not.toContain("xl:table-cell");
      expect(cells[1].className).toContain("hidden");
      expect(cells[1].className).toContain("xl:table-cell");
    });
  });

  it("combines tableHeadClassName with the column meta class", () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={rows}
        showSearchAndFilters={false}
        keepStateInLocalStorage={false}
        tableHeadClassName={"px-4"}
      />,
    );
    const headers = container.querySelectorAll("thead th");
    expect(headers[0].className).toContain("px-4");
    expect(headers[1].className).toContain("px-4");
    expect(headers[1].className).toContain("xl:table-cell");
  });
});

const manyRows = (count: number): Row[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${i}`,
    name: `Row ${i}`,
    enabled: true,
  }));

// The pagination footer also holds the rows-per-page selector,
// so it must stay reachable once a large page size fits every row on one page.
describe("DataTable pagination footer", () => {
  const renderTable = (count: number, initialPageSize: number) =>
    render(
      <DataTable
        columns={columns}
        data={manyRows(count)}
        showSearchAndFilters={false}
        keepStateInLocalStorage={false}
        initialPageSize={initialPageSize}
      />,
    );

  it("shows the rows-per-page selector when all rows fit on one page", () => {
    const { container } = renderTable(26, 50);
    expect(container.querySelector("[data-testid=rows-per-page]")).not.toBe(
      null,
    );
  });

  it("hides the footer when there are no more rows than the smallest page size", () => {
    const { container } = renderTable(25, 25);
    expect(container.querySelector("[data-testid=rows-per-page]")).toBe(null);
    expect(container.textContent).not.toContain("Showing");
  });
});

// Page sizes saved before the options became 25–500 (10, 1000, …) must not stick.
describe("DataTable saved page size", () => {
  afterEach(() => localStorage.clear());

  const renderSaved = (pageSize: number, initialPageSize?: number) => {
    localStorage.setItem(
      "netbird-table-pagination/test",
      JSON.stringify({ pageIndex: 0, pageSize }),
    );
    const { container } = render(
      <DataTable
        columns={columns}
        data={manyRows(600)}
        showSearchAndFilters={false}
        initialPageSize={initialPageSize}
      />,
    );
    return container.querySelectorAll("tbody tr[data-row-id]").length;
  };

  it("falls back to 25 rows for a size that is no longer offered", () => {
    expect(renderSaved(10)).toBe(25);
    cleanup();
    expect(renderSaved(1000)).toBe(25);
  });

  it("keeps a saved size that is still offered", () => {
    expect(renderSaved(50)).toBe(50);
  });

  it("keeps a table's own initial size, as nested show-all tables use", () => {
    expect(renderSaved(7, 7)).toBe(7);
  });
});

describe("DataTable virtualization", () => {
  beforeAll(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    // jsdom has no layout, and the virtualizer renders nothing into a zero-height viewport.
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(800);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1200);
  });
  afterAll(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const renderTable = (
    count: number,
    options: { scrollContainer?: boolean; selected?: string[] } = {},
  ) => {
    const table = (selected: string[] = []) => (
      <DataTable
        columns={columns}
        data={manyRows(count)}
        showSearchAndFilters={false}
        keepStateInLocalStorage={false}
        initialPageSize={1000}
        useRowId
        rowSelection={Object.fromEntries(selected.map((id) => [id, true]))}
      />
    );
    const wrap = (selected?: string[]) =>
      options.scrollContainer ? (
        <div style={{ overflowY: "auto" }}>{table(selected)}</div>
      ) : (
        table(selected)
      );
    const result = render(wrap(options.selected));
    return {
      ...result,
      bodyRows: () =>
        result.container.querySelectorAll("tbody tr[data-row-id]"),
      rerenderSelected: (selected: string[]) => result.rerender(wrap(selected)),
    };
  };

  it("renders only part of a long page inside a scroll container", () => {
    const { bodyRows } = renderTable(200, { scrollContainer: true });
    expect(bodyRows().length).toBeGreaterThan(0);
    expect(bodyRows().length).toBeLessThan(200);
  });

  it("renders every row of a page at or below the threshold", () => {
    const { bodyRows } = renderTable(50, { scrollContainer: true });
    expect(bodyRows()).toHaveLength(50);
  });

  it("renders every row when the table has no scrolling ancestor", () => {
    const { bodyRows } = renderTable(200);
    expect(bodyRows()).toHaveLength(200);
  });

  // Rows are memoized, so selection has to reach them through their props.
  it("updates a rendered row when its selection changes", () => {
    const { bodyRows, container, rerenderSelected } = renderTable(200, {
      scrollContainer: true,
    });
    const id = bodyRows()[0].getAttribute("data-row-id")!;
    const row = () => container.querySelector(`tbody tr[data-row-id="${id}"]`);
    expect(row()?.getAttribute("data-state")).not.toBe("selected");
    rerenderSelected([id]);
    expect(row()?.getAttribute("data-state")).toBe("selected");
  });

  it("leaves columns marked skeleton: false blank in the skeleton", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 1200, 50),
    );
    const { container } = render(
      <div style={{ overflowY: "auto" }}>
        <DataTable
          columns={[
            ...columns,
            {
              id: "status",
              header: "",
              meta: { skeleton: false },
              cell: () => null,
            },
          ]}
          data={manyRows(200)}
          showSearchAndFilters={false}
          keepStateInLocalStorage={false}
          initialPageSize={1000}
        />
      </div>,
    );
    const skeletonCells = container.querySelectorAll(
      "tbody > tr[aria-hidden] > td",
    );
    expect(skeletonCells).toHaveLength(3);
    expect(skeletonCells[0].hasAttribute("data-empty")).toBe(false);
    expect(skeletonCells[2].hasAttribute("data-empty")).toBe(true);
  });
});
