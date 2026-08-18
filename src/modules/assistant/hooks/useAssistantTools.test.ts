import { describe, expect, it } from "vitest";
import {
  applyFilters,
  applyTimeRange,
  capRows,
  countBy,
  filterRows,
  serializeBounded,
  sortRows,
  validateListParams,
} from "@/modules/assistant/hooks/useAssistantTools";
import {
  type RedactionConfig,
  Redactor,
} from "@/modules/assistant/utils/redaction";

const row = (i: number) => ({ id: `id-${i}`, activity: "login", n: i });

describe("capRows", () => {
  it("passes small lists and single objects through", () => {
    const list = [row(1), row(2)];
    expect(capRows(list)).toEqual({ rows: list, total: 2 });
    const one = row(1);
    expect(capRows(one)).toEqual({ rows: one, total: 1 });
  });

  it("caps a huge list before anything downstream sees it", () => {
    const list = Array.from({ length: 10_000 }, (_, i) => row(i));
    const { rows, total } = capRows(list);
    expect((rows as unknown[]).length).toBe(200);
    expect(total).toBe(10_000);
    // Newest-first APIs keep their newest rows.
    expect((rows as { n: number }[])[0]!.n).toBe(0);
  });
});

describe("serializeBounded", () => {
  it("returns a plain payload when nothing was cut", () => {
    const list = [row(1)];
    expect(serializeBounded(list, 1)).toBe(JSON.stringify(list));
  });

  it("wraps a capped list in an explicit truncation envelope", () => {
    const { rows, total } = capRows(
      Array.from({ length: 500 }, (_, i) => row(i)),
    );
    const parsed = JSON.parse(serializeBounded(rows, total));
    expect(parsed.truncated).toBe(true);
    expect(parsed.shown).toBe(200);
    expect(parsed.total).toBe(500);
    expect(parsed.rows).toHaveLength(200);
    // The self-correction nudge the model reads at decision time.
    expect(parsed.note).toContain("sort_by");
  });

  it("halves fat rows until the payload fits the byte budget", () => {
    const fat = Array.from({ length: 100 }, (_, i) => ({
      id: `id-${i}`,
      blob: "x".repeat(2_000),
    }));
    const content = serializeBounded(fat, 100);
    expect(content.length).toBeLessThanOrEqual(32_000);
    const parsed = JSON.parse(content);
    expect(parsed.truncated).toBe(true);
    expect(parsed.shown).toBeLessThan(100);
    expect(parsed.total).toBe(100);
  });

  it("reports where paging continues", () => {
    const { rows, total } = capRows(
      Array.from({ length: 500 }, (_, i) => row(i)),
    );
    const parsed = JSON.parse(serializeBounded(rows, total, 100));
    expect(parsed.next_offset).toBe(300);
  });
});

describe("validateListParams", () => {
  const rows = [{ id: "e-1", activity: "login", timestamp: "2026-08-07" }];

  it("rejects invented parameter names, listing the real ones", () => {
    const err = validateListParams("list_events", { sort: "asc" }, rows);
    expect(err).toContain('"sort"');
    expect(err).toContain("sort_by");
  });

  it("rejects filter and sort fields the rows do not carry", () => {
    expect(
      validateListParams("list_events", { filters: { type: "login" } }, rows),
    ).toContain('"type"');
    expect(
      validateListParams("list_events", { sort_by: "time" }, rows),
    ).toContain("timestamp");
  });

  it("accepts documented params on real fields", () => {
    expect(
      validateListParams(
        "list_events",
        { filters: { activity: "login" }, sort_by: "timestamp", limit: 1 },
        rows,
      ),
    ).toBeNull();
  });
});

describe("filterRows", () => {
  it("keeps rows containing the value, anywhere, case-insensitively", () => {
    const rows = [
      { id: "p-1", name: "eduards-macbook" },
      { id: "p-2", name: "build-runner" },
    ];
    expect(filterRows(rows, "MACBOOK")).toEqual([rows[0]]);
    expect(filterRows(rows, "p-2")).toEqual([rows[1]]);
    expect(filterRows(rows, "nope")).toEqual([]);
  });
});

describe("applyFilters", () => {
  const rows = [
    { id: "p-1", connected: true, groups: [{ id: "g-1", name: "Berlin" }] },
    { id: "p-2", connected: false, groups: [{ id: "g-2", name: "Munich" }] },
  ];

  it("matches scalars exactly, booleans included", () => {
    expect(applyFilters(rows, { connected: true })).toEqual([rows[0]]);
    expect(applyFilters(rows, { id: "P-2" })).toEqual([rows[1]]);
  });

  it("matches array fields by containment, member objects by id or name", () => {
    expect(applyFilters(rows, { groups: "g-1" })).toEqual([rows[0]]);
    expect(applyFilters(rows, { groups: "Munich" })).toEqual([rows[1]]);
  });

  it("requires every filter to hold", () => {
    expect(applyFilters(rows, { connected: true, groups: "Munich" })).toEqual(
      [],
    );
  });
});

describe("applyTimeRange", () => {
  const rows = [
    { id: "e-1", timestamp: "2026-08-10T08:00:00Z" },
    { id: "e-2", timestamp: "2026-08-14T08:00:00Z" },
    { id: "p-1", last_seen: "2026-08-01T08:00:00Z" },
    { id: "x-1" },
  ];

  it("keeps rows inside the range, on either clock field", () => {
    expect(applyTimeRange(rows, "2026-08-09")).toEqual([rows[0], rows[1]]);
    expect(applyTimeRange(rows, undefined, "2026-08-05")).toEqual([rows[2]]);
  });

  it("drops undatable rows once a range is asked for", () => {
    expect(applyTimeRange(rows, "2000-01-01")).not.toContainEqual(rows[3]);
  });
});

describe("sortRows", () => {
  const rows = [
    { id: "e-2", timestamp: "2026-08-14T08:00:00Z", n: 2 },
    { id: "e-1", timestamp: "2026-08-07T13:44:23Z", n: 7 },
    { id: "x-1", n: 1 },
  ];

  it("sorts dates as dates, both directions, missing values last", () => {
    expect(
      sortRows(rows, "timestamp", "asc").map((r) => (r as { id: string }).id),
    ).toEqual(["e-1", "e-2", "x-1"]);
    expect(
      sortRows(rows, "timestamp", "desc").map((r) => (r as { id: string }).id),
    ).toEqual(["e-2", "e-1", "x-1"]);
  });

  it("sorts numbers numerically", () => {
    expect(
      sortRows(rows, "n", "asc").map((r) => (r as { n: number }).n),
    ).toEqual([1, 2, 7]);
  });

  it("does not mutate the input", () => {
    const copy = [...rows];
    sortRows(rows, "n");
    expect(rows).toEqual(copy);
  });
});

describe("countBy", () => {
  const EVENT: RedactionConfig = {
    handle: "event",
    fields: { activity: true, initiator_id: "user" },
  };
  const rows = [
    { activity: "login", initiator_id: "u-1" },
    { activity: "login", initiator_id: "u-2" },
    { activity: "peer.add", initiator_id: "u-1" },
  ];

  it("counts a kept field under its real values", () => {
    const out = countBy(rows, "activity", EVENT, new Redactor());
    expect(JSON.parse(out.content)).toEqual({
      count_by: "activity",
      total: 3,
      counts: { login: 2, "peer.add": 1 },
    });
  });

  it("counts a tokenised field under its tokens", () => {
    const redactor = new Redactor();
    const out = countBy(rows, "initiator_id", EVENT, redactor);
    expect(JSON.parse(out.content).counts).toEqual({
      "[USER_1]": 2,
      "[USER_2]": 1,
    });
    expect(redactor.resolve("[USER_1]")).toBe("u-1");
  });

  it("refuses a field the whitelist would drop", () => {
    const out = countBy(rows, "meta", EVENT, new Redactor());
    expect(out.isError).toBe(true);
  });
});
