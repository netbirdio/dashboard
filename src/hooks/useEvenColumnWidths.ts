import { useLayoutEffect } from "react";

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

type ColumnSize = {
  /** Content width of the column at max-content table width. */
  natural: number;
  fit: boolean;
  minWidth?: number;
};

/**
 * Widths for columns that should fill `available` pixels.
 * Spare room goes in equal shares to every visible column that isn't `fit`.
 * Missing room comes out of the `minWidth` columns in proportion to how far
 * each can shrink, never below its content width capped at `minWidth`.
 */
export function distributeColumnWidths(
  columns: ColumnSize[],
  available: number,
): number[] {
  const natural = columns.map((c) => c.natural);
  const spare = available - sum(natural);
  let widths: number[];
  if (spare >= 0) {
    // Hidden columns measure 0 and get no share.
    const grows = columns.map((c) => !c.fit && c.natural > 0);
    const share = spare / grows.filter(Boolean).length;
    widths = natural.map((width, i) => width + (grows[i] ? share : 0));
  } else {
    const floors = columns.map((c) =>
      Math.min(c.natural, c.minWidth ?? Infinity),
    );
    const shrinkable = sum(natural) - sum(floors);
    const ratio = shrinkable > 0 ? Math.min(1, -spare / shrinkable) : 0;
    widths = natural.map((width, i) => width - (width - floors[i]) * ratio);
  }
  return widths.map(Math.floor);
}

/**
 * Gives every column its content width plus an equal share of the spare width,
 * instead of the browser's share in proportion to the content width.
 * Header cells marked `data-fit` keep their content width.
 * When the table is too narrow, `data-min-width` columns shrink instead,
 * but never below their content width capped at `data-min-width`.
 */
export function useEvenColumnWidths(
  table: HTMLTableElement | null,
  enabled: boolean,
) {
  useLayoutEffect(() => {
    const container = table?.parentElement;
    if (!enabled || !table || !container) return;

    const getHeaders = () => Array.from(table.tHead?.rows[0]?.cells ?? []);

    const measure = () => {
      const headers = getHeaders();

      // At max-content width, each column takes exactly its content width.
      // The table's min-w-full and max-w-full would stretch or squeeze it.
      headers.forEach((th) => th.style.removeProperty("width"));
      table.style.setProperty("width", "max-content");
      table.style.setProperty("min-width", "0");
      table.style.setProperty("max-width", "none");
      const natural = headers.map((th) => th.getBoundingClientRect().width);
      table.style.removeProperty("width");
      table.style.removeProperty("max-width");

      const widths = distributeColumnWidths(
        headers.map((th, i) => ({
          natural: natural[i],
          fit: !!th.dataset.fit,
          minWidth: th.dataset.minWidth
            ? Number(th.dataset.minWidth)
            : undefined,
        })),
        container.clientWidth,
      );
      headers.forEach((th, i) =>
        th.style.setProperty("width", `${widths[i]}px`),
      );
      // Shrinking columns report a min-content width of 0,
      // so without this the table squeezes them below their floor.
      table.style.setProperty("min-width", `${sum(widths)}px`);
    };

    let frame = 0;
    // Font loading can finish after cleanup,
    // and a late measure would leave widths that nothing removes.
    let cancelled = false;
    const scheduleMeasure = () => {
      if (frame || cancelled) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    measure();
    document.fonts?.ready.then(scheduleMeasure);
    // Re-measure when rows or text change, or the table's room changes.
    const mutationObserver = new MutationObserver(scheduleMeasure);
    mutationObserver.observe(table, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    // The container grows with the rows, so only width changes count.
    let containerWidth = container.clientWidth;
    const resizeObserver = new ResizeObserver(() => {
      if (container.clientWidth === containerWidth) return;
      containerWidth = container.clientWidth;
      scheduleMeasure();
    });
    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      if (frame) cancelAnimationFrame(frame);
      getHeaders().forEach((th) => th.style.removeProperty("width"));
      table.style.removeProperty("min-width");
    };
  }, [table, enabled]);
}
