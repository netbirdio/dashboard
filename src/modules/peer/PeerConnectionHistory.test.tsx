import { TooltipProvider } from "@components/Tooltip";
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActivityEvent } from "@/interfaces/ActivityEvent";
import type { Country } from "@/interfaces/Country";
import { PeerConnectionHistoryContent } from "./PeerConnectionHistory";

vi.mock("@utils/config", () => ({
  default: () => ({ apiOrigin: "http://localhost", redirectURI: "/" }),
}));

const countryState = vi.hoisted(() => ({
  countries: undefined as Country[] | undefined,
}));
vi.mock("@/contexts/CountryProvider", () => ({
  useCountries: () => ({ countries: countryState.countries }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/peer",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  countryState.countries = undefined;
  localStorage.clear();
});

describe("peer connection history table", () => {
  const renderHistory = (events: ActivityEvent[]) => (
    <TooltipProvider>
      <PeerConnectionHistoryContent events={events} onRefresh={vi.fn()} />
    </TooltipProvider>
  );
  const event = (timestamp: string, id: string): ActivityEvent => ({
    id,
    timestamp,
    activity: "Peer connected",
    activity_code: "peer.connect",
    initiator_id: "system",
    initiator_email: "",
    initiator_name: "",
    target_id: "peer-1",
    meta: {},
  });
  it("sorts timestamps chronologically when fractional seconds have different lengths", () => {
    const timestamps = [
      "2026-11-13T09:42:18Z",
      "2026-11-13T09:42:18.1Z",
      "2026-11-13T09:42:18.11Z",
    ];
    const events = timestamps.map((timestamp, i) =>
      event(timestamp, String(i)),
    );
    const { container, getByText } = render(renderHistory(events));
    const renderedTimes = () =>
      Array.from(container.querySelectorAll("time"), (time) => time.dateTime);

    expect(renderedTimes()).toEqual([...timestamps].reverse());
    fireEvent.click(getByText("Time (UTC)"));
    expect(renderedTimes()).toEqual(timestamps);
  });

  it("shows each recorded source IP and distinguishes unknown IPs from disconnects", () => {
    const events = [
      event("2026-11-13T09:42:18Z", "1"),
      event("2026-11-13T09:42:19Z", "2"),
      event("2026-11-13T09:42:20Z", "3"),
      {
        ...event("2026-11-13T09:42:21Z", "4"),
        activity_code: "peer.disconnect",
        activity: "Peer disconnected",
      },
    ];
    events[0].meta.location_connection_ip = "203.0.113.24";
    events[1].meta.location_connection_ip = "2001:db8::1";
    const { getByRole, getAllByRole } = render(renderHistory(events));
    expect(getByRole("cell", { name: "203.0.113.24" })).toBeTruthy();
    expect(getByRole("cell", { name: "2001:db8::1" })).toBeTruthy();
    expect(getByRole("cell", { name: "Unavailable" })).toBeTruthy();
    const disconnectRow = getAllByRole("row").find((row) =>
      row.querySelector('time[datetime="2026-11-13T09:42:21Z"]'),
    )!;
    expect(
      within(disconnectRow).getAllByRole("cell", { name: "—" }),
      "a disconnect has neither a source IP, a location nor a known duration",
    ).toHaveLength(3);
  });

  it("shows how long a session lasted on disconnect rows only", () => {
    const connect = event("2026-11-13T09:00:00Z", "1");
    // A connect carrying a duration must not show it: only disconnects end a session.
    connect.meta = { session_duration: "99" };
    const disconnect = (id: string, timestamp: string, duration?: string) => ({
      ...event(timestamp, id),
      activity_code: "peer.disconnect",
      activity: "Peer disconnected",
      meta: duration === undefined ? {} : { session_duration: duration },
    });
    const events = [
      connect,
      disconnect("2", "2026-11-13T10:00:00Z", "3723"),
      disconnect("3", "2026-11-13T11:00:00Z", "45"),
      disconnect("4", "2026-11-13T12:00:00Z", "-5"),
      disconnect("5", "2026-11-13T13:00:00Z"),
    ];
    const { getAllByRole, getByRole, queryByRole } = render(
      renderHistory(events),
    );
    expect(getByRole("columnheader", { name: /Session/ })).toBeTruthy();
    expect(getByRole("cell", { name: "1h 2m" })).toBeTruthy();
    expect(getByRole("cell", { name: "45s" })).toBeTruthy();
    expect(queryByRole("cell", { name: "1m 39s" })).toBeNull();
    const sessionCells = getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell").at(-1)?.textContent);
    // Newest first: missing, invalid, 45s, 1h 2m, then the connect row.
    expect(sessionCells).toEqual(["—", "—", "45s", "1h 2m", "—"]);
  });

  it("shows the location recorded for each connection and makes it searchable", async () => {
    const events = [
      event("2026-11-13T09:42:18Z", "1"),
      event("2026-11-13T09:42:19Z", "2"),
      event("2026-11-13T09:42:20Z", "3"),
    ];
    events[0].meta = {
      location_connection_ip: "203.0.113.24",
      location_country_code: "DE",
      location_city_name: "Berlin",
    };
    events[1].meta = {
      location_connection_ip: "198.51.100.12",
      location_country_code: "NL",
    };
    events[2].meta = { location_connection_ip: "192.0.2.10" };
    const { getByRole, getByPlaceholderText, queryByRole } = render(
      renderHistory(events),
    );
    // Without a loaded country list the code stands in for the country name.
    expect(getByRole("cell", { name: "DE, Berlin" })).toBeTruthy();
    expect(getByRole("cell", { name: "NL" })).toBeTruthy();
    expect(
      getByRole("cell", { name: "Unknown" }),
      "a connection without geolocation has an unknown location",
    ).toBeTruthy();

    fireEvent.change(getByPlaceholderText(/Search events/), {
      target: { value: "Berlin" },
    });
    // The search input is debounced before it filters the table.
    await waitFor(
      () =>
        expect(
          queryByRole("cell", { name: "198.51.100.12" }),
          "searching by city filters out other locations",
        ).toBeNull(),
      { timeout: 2000 },
    );
    expect(getByRole("cell", { name: "203.0.113.24" })).toBeTruthy();
  });

  it("returns to a valid page when refreshed history has fewer events", async () => {
    const events = Array.from({ length: 30 }, (_, i) =>
      event("2026-11-13T09:42:18Z", String(i)),
    );
    const { container, getByRole, rerender } = render(renderHistory(events));
    const nextPage = container
      .querySelector("svg.lucide-chevron-right")
      ?.closest("button");
    expect(nextPage).toBeInstanceOf(HTMLButtonElement);
    fireEvent.click(nextPage!);
    await waitFor(() =>
      expect(getByRole("button", { name: "2 of 2" })).toBeTruthy(),
    );
    expect(container.querySelectorAll("time")).toHaveLength(5);

    rerender(renderHistory(events.slice(0, 1)));
    await waitFor(() =>
      expect(container.querySelectorAll("time")).toHaveLength(1),
    );
  });

  it("shows country names once the country list finishes loading", async () => {
    const located = event("2026-11-13T09:42:18Z", "1");
    located.meta = {
      location_connection_ip: "203.0.113.24",
      location_country_code: "DE",
      location_city_name: "Berlin",
    };
    const events = [located];
    const { getByRole, getByPlaceholderText, queryByRole, rerender } = render(
      renderHistory(events),
    );
    expect(getByRole("cell", { name: "DE, Berlin" })).toBeTruthy();

    // The events arrive before the country list; the same events must then show
    // the country name and be searchable by it.
    countryState.countries = [{ country_code: "DE", country_name: "Germany" }];
    rerender(renderHistory(events));
    expect(getByRole("cell", { name: "Germany, Berlin" })).toBeTruthy();

    fireEvent.change(getByPlaceholderText(/Search events/), {
      target: { value: "Germany" },
    });
    await waitFor(
      () => expect(getByRole("cell", { name: "203.0.113.24" })).toBeTruthy(),
      { timeout: 2000 },
    );
    expect(
      queryByRole("cell", { name: "DE, Berlin" }),
      "the stale country code must not remain after the list loads",
    ).toBeNull();
  });
});
