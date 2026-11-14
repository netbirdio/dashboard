import { TooltipProvider } from "@components/Tooltip";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActivityEvent } from "@/interfaces/ActivityEvent";
import { PeerConnectionHistoryContent } from "./PeerConnectionHistory";

vi.mock("@utils/config", () => ({
  default: () => ({ apiOrigin: "http://localhost", redirectURI: "/" }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/peer",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => {
  cleanup();
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
    expect(
      getAllByRole("cell", { name: "—" }),
      "a disconnect has neither a source IP nor a location",
    ).toHaveLength(2);
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
});
