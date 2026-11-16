import { Row } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * Pages at or below this size render every row,
 * so the common 10–50 row tables keep their plain DOM.
 */
export const VIRTUALIZE_ROW_THRESHOLD = 50;

// Roughly two screens on either side, so fast flicks stay ahead of rendering.
const OVERSCAN_ROWS = 30;
const ESTIMATED_ROW_HEIGHT = 65;

/**
 * The dashboard scrolls inside the page container rather than the window.
 * The search starts above the table's own horizontal-scroll wrapper,
 * which reports `overflow-y: auto` too because CSS promotes `visible`
 * once the other axis is set.
 */
function findScrollParent(body: HTMLElement | null): HTMLElement | null {
  let parent = body?.closest("table")?.parentElement?.parentElement;
  while (parent && parent !== document.body) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") return parent;
    parent = parent.parentElement;
  }
  return null;
}

function unlockColumnWidths(table: HTMLElement, headers: HTMLElement[]) {
  table.style.tableLayout = "";
  headers.forEach((th) => (th.style.width = ""));
}

/**
 * A row's virtual size includes its expanded accordion row,
 * which is rendered as the next sibling `<tr>`.
 */
function measureRow(element: Element) {
  let height = element.getBoundingClientRect().height;
  const next = element.nextElementSibling;
  if (next instanceof HTMLElement && next.dataset.expandedRow !== undefined) {
    height += next.getBoundingClientRect().height;
  }
  return height;
}

export function useVirtualRows<TData>(rows: Row<TData>[], enabled: boolean) {
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  // `undefined` until resolved, `null` when the table has no scrolling ancestor.
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>();
  const [scrollMargin, setScrollMargin] = useState(0);

  const active = enabled && rows.length > VIRTUALIZE_ROW_THRESHOLD;

  useLayoutEffect(() => {
    if (!active) return setScrollElement(undefined);
    setScrollElement(findScrollParent(bodyRef.current));
  }, [active]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    enabled: active && !!scrollElement,
    getScrollElement: () => scrollElement ?? null,
    getItemKey: (index) => rows[index]?.id ?? index,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    measureElement: measureRow,
    overscan: OVERSCAN_ROWS,
    scrollMargin,
    initialRect: {
      width: 0,
      height: typeof window === "undefined" ? 0 : window.innerHeight,
    },
  });

  // Search inputs, filters and headings above the table can change height at any time,
  // so the body's offset inside the scroll container is re-read after every render.
  useLayoutEffect(() => {
    if (!scrollElement || !bodyRef.current) return;
    const margin =
      bodyRef.current.getBoundingClientRect().top -
      scrollElement.getBoundingClientRect().top +
      scrollElement.scrollTop;
    if (Math.abs(margin - scrollMargin) > 1) setScrollMargin(margin);
  });

  const isVirtualized = active && !!scrollElement;

  /**
   * An auto-layout table sizes its columns from the rows in the DOM,
   * so columns would shift whenever other rows or the skeleton rows scroll into view.
   * While virtualized, the widths measured from the first rendered rows are locked
   * as percentages, and measured again when the rows or the table's width change.
   */
  useLayoutEffect(() => {
    const table = bodyRef.current?.closest("table");
    if (!table || !isVirtualized) return;
    const headers = Array.from(
      table.querySelectorAll("thead th"),
    ) as HTMLElement[];
    if (headers.length === 0) return;

    const lock = () => {
      unlockColumnWidths(table, headers);
      const tableWidth = table.getBoundingClientRect().width;
      const widths = headers.map((th) => th.getBoundingClientRect().width);
      headers.forEach((th, i) => {
        th.style.width = `${(widths[i] / tableWidth) * 100}%`;
      });
      table.style.tableLayout = "fixed";
    };
    lock();

    let lastWidth = table.parentElement?.clientWidth;
    const observer = new ResizeObserver(() => {
      const width = table.parentElement?.clientWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      lock();
    });
    if (table.parentElement) observer.observe(table.parentElement);

    return () => {
      observer.disconnect();
      unlockColumnWidths(table, headers);
    };
  }, [rows, isVirtualized]);

  const items = virtualizer.getVirtualItems();
  const rowHeight = items.length
    ? (items[items.length - 1].end - items[0].start) / items.length
    : ESTIMATED_ROW_HEIGHT;

  /**
   * The virtualizer only observes the main row,
   * so an expanded row re-measures its owner whenever its own size changes.
   */
  const expandedRowRef = useCallback(
    (element: HTMLTableRowElement | null) => {
      if (!element) return;
      const owner = element.previousElementSibling;
      if (!owner) return;
      const observer = new ResizeObserver(() => {
        if (owner.isConnected) virtualizer.measureElement(owner);
      });
      observer.observe(element);
      return () => {
        observer.disconnect();
        if (owner.isConnected) virtualizer.measureElement(owner);
      };
    },
    [virtualizer],
  );

  // Before the scroll parent is known, render one threshold's worth of rows
  // instead of the whole page, which is exactly the render this hook avoids.
  if (active && scrollElement === undefined) {
    return {
      bodyRef,
      isVirtualized: false as const,
      visibleRows: rows.slice(0, VIRTUALIZE_ROW_THRESHOLD),
    };
  }

  if (!active || !scrollElement) {
    return {
      bodyRef,
      isVirtualized: false as const,
      visibleRows: rows,
    };
  }

  const paddingTop = items.length ? items[0].start - scrollMargin : 0;
  const paddingBottom = items.length
    ? virtualizer.getTotalSize() - (items[items.length - 1].end - scrollMargin)
    : 0;
  return {
    bodyRef,
    isVirtualized: true as const,
    visibleRows: items.map((item) => rows[item.index]),
    virtualItems: items,
    paddingTop,
    paddingBottom,
    rowHeight,
    measureRow: virtualizer.measureElement,
    expandedRowRef,
  };
}
