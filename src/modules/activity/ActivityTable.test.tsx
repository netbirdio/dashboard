import { TooltipProvider } from "@components/Tooltip";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityEvent } from "@/interfaces/ActivityEvent";

let search = "";

vi.mock("next/navigation", () => ({
  usePathname: () => "/events/audit",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}));

vi.mock("@/modules/activity/ActivityEntryRow", () => ({
  ActivityEntryRow: ({ event }: { event: ActivityEvent }) => (
    <div data-testid="event-row">{event.id}</div>
  ),
}));

const { default: ActivityTable } = await import(
  "@/modules/activity/ActivityTable"
);

const event = (id: string, activity: string, peer: string) =>
  ({
    id,
    activity,
    activity_code: "peer.add",
    timestamp: new Date().toISOString(),
    initiator_id: "u1",
    initiator_name: "Ada",
    initiator_email: "ada@example.com",
    target_id: "t1",
    meta: { name: peer },
  }) as unknown as ActivityEvent;

const events = [
  event("19731", "Peer added", "laptop"),
  event("20000", "Peer added", "printer-973"),
  event("973", "Peer removed", "server"),
];

const table = () => (
  <TooltipProvider>
    <ActivityTable events={events} isLoading={false} />
  </TooltipProvider>
);

const renderTable = () => render(table());

const navigate = (
  view: ReturnType<typeof render>,
  nextSearch: string,
): void => {
  search = nextSearch;
  view.rerender(table());
};

const shownIds = () =>
  screen.queryAllByTestId("event-row").map((row) => row.textContent);

const SEARCH_KEY = "netbird-table-search/events/audit";
const FILTERS_KEY = "netbird-table-columns/events/audit";
const searchBox = () => screen.getByRole("textbox") as HTMLInputElement;

beforeEach(() => {
  search = "";
  window.localStorage.clear();
});
afterEach(cleanup);

describe("ActivityTable", () => {
  it("does not match the hidden event id when searching", () => {
    window.localStorage.setItem(SEARCH_KEY, JSON.stringify("973"));
    renderTable();
    expect(shownIds()).toEqual(["20000"]);
  });

  it("shows exactly the linked event for ?id= and leaves the search box and the stored search alone", () => {
    window.localStorage.setItem(SEARCH_KEY, JSON.stringify("printer"));
    search = "id=973";
    renderTable();
    expect(shownIds()).toEqual(["973"]);
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
    expect(window.localStorage.getItem(SEARCH_KEY)).toBe(
      JSON.stringify("printer"),
    );
  });

  it("restores the stored search without ?id=", () => {
    window.localStorage.setItem(SEARCH_KEY, JSON.stringify("printer"));
    renderTable();
    expect(shownIds()).toEqual(["20000"]);
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
      "printer",
    );
  });

  it("isolates the linked event when ?id= arrives on the mounted page, and leaves the stored search alone", () => {
    window.localStorage.setItem(SEARCH_KEY, JSON.stringify("printer"));
    const view = renderTable();
    expect(shownIds()).toEqual(["20000"]);

    navigate(view, "id=973");
    expect(shownIds()).toEqual(["973"]);
    expect(searchBox().value).toBe("");
    expect(window.localStorage.getItem(SEARCH_KEY)).toBe(
      JSON.stringify("printer"),
    );
  });

  it("follows ?id= from one event to another", () => {
    search = "id=973";
    const view = renderTable();
    expect(shownIds()).toEqual(["973"]);

    navigate(view, "id=19731");
    expect(shownIds()).toEqual(["19731"]);
  });

  it("drops the id filter when ?id= is removed, restores the stored state and never stores the id filter", async () => {
    window.localStorage.setItem(SEARCH_KEY, JSON.stringify("printer"));
    search = "id=973";
    const view = renderTable();
    expect(shownIds()).toEqual(["973"]);

    navigate(view, "");
    expect(shownIds()).toEqual(["20000"]);
    expect(searchBox().value).toBe("printer");

    vi.useFakeTimers();
    try {
      fireEvent.change(searchBox(), { target: { value: "laptop" } });
      await act(() => vi.advanceTimersByTimeAsync(1000));
    } finally {
      vi.useRealTimers();
    }
    expect(shownIds()).toEqual(["19731"]);
    expect(window.localStorage.getItem(FILTERS_KEY) ?? "").not.toContain(
      '"id"',
    );
  });
});
