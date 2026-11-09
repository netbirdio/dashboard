import { describe, expect, it } from "vitest";
import { distributeColumnWidths } from "@hooks/useEvenColumnWidths";

const column = (
  natural: number,
  opts: { fit?: boolean; minWidth?: number } = {},
) => ({
  natural,
  fit: opts.fit ?? false,
  minWidth: opts.minWidth,
});

describe("distributeColumnWidths", () => {
  it("gives every growing column the same share of the spare width", () => {
    expect(
      distributeColumnWidths([column(100), column(300), column(50)], 750),
    ).toEqual([200, 400, 150]);
  });

  it("keeps fit columns at their content width", () => {
    expect(
      distributeColumnWidths(
        [column(40, { fit: true }), column(100), column(100)],
        440,
      ),
    ).toEqual([40, 200, 200]);
  });

  it("gives hidden columns no share", () => {
    expect(
      distributeColumnWidths([column(0), column(100), column(100)], 400),
    ).toEqual([0, 200, 200]);
  });

  it("leaves the spare width to the table when every column fits", () => {
    expect(
      distributeColumnWidths(
        [column(40, { fit: true }), column(60, { fit: true })],
        500,
      ),
    ).toEqual([40, 60]);
  });

  it("shrinks minWidth columns in proportion to how far they can shrink", () => {
    // Name can give up 200px, Address 100px; 150px are missing.
    expect(
      distributeColumnWidths(
        [
          column(400, { minWidth: 200 }),
          column(300, { minWidth: 200 }),
          column(100),
        ],
        650,
      ),
    ).toEqual([300, 250, 100]);
  });

  it("never shrinks below the floor and lets the table overflow instead", () => {
    expect(
      distributeColumnWidths(
        [column(400, { minWidth: 200 }), column(300)],
        300,
      ),
    ).toEqual([200, 300]);
  });

  it("never shrinks a column whose content is narrower than minWidth", () => {
    expect(
      distributeColumnWidths(
        [column(120, { minWidth: 200 }), column(300)],
        400,
      ),
    ).toEqual([120, 300]);
  });

  it("rounds widths down so they never add up to more than the room", () => {
    const widths = distributeColumnWidths(
      [column(10), column(10), column(10)],
      100,
    );
    expect(widths).toEqual([33, 33, 33]);
  });
});
