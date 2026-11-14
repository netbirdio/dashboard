import { cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActivityEvent } from "@/interfaces/ActivityEvent";
import ActivityDescription from "@/modules/activity/ActivityDescription";

// The component imports @utils/netbird, which reads config.json at module load.
vi.mock("@utils/config", () => ({
  default: () => ({ apiOrigin: "http://localhost", redirectURI: "/" }),
}));

vi.mock("@/contexts/CountryProvider", () => ({
  useCountries: () => ({
    countries: [{ country_code: "DE", country_name: "Germany" }],
    isLoading: false,
  }),
}));

// Management emits resource.group.add / resource.group.delete with the group as the
// event target: meta.name is the group, meta.resource_name is the network resource
// (management/server/types/group.go, Group.EventMetaResource). The description must
// read the keys in that orientation.

const baseEvent: Omit<ActivityEvent, "activity_code" | "activity"> = {
  id: "ev1",
  timestamp: "2026-09-15T10:00:00Z",
  initiator_id: "u1",
  initiator_email: "admin@example.com",
  initiator_name: "Admin",
  target_id: "g1",
  meta: {
    id: "g1",
    name: "infra-admins",
    resource_id: "r1",
    resource_name: "office-lan",
    resource_type: "subnet",
  },
};

const textOf = (container: HTMLElement) =>
  container.textContent?.replace(/\s+/g, " ").trim();

afterEach(cleanup);

describe("ActivityDescription peer connection events", () => {
  it.each([
    ["peer.connect", "connected to"],
    ["peer.disconnect", "disconnected from"],
  ])("describes %s and links to the peer", (code, action) => {
    const { container, getByRole } = render(
      <ActivityDescription
        event={{
          ...baseEvent,
          target_id: "peer-1",
          activity: "Peer connection",
          activity_code: code,
          meta: {
            name: "office-laptop",
            location_connection_ip: "203.0.113.24",
          },
        }}
      />,
    );
    expect(textOf(container)).toBe(
      `Peer office-laptop ${action} Management from 203.0.113.24`,
    );
    expect(getByRole("link").getAttribute("href")).toBe("/peer?id=peer-1");
  });

  it("shows where a connection came from when its location was recorded", () => {
    const { container } = render(
      <ActivityDescription
        event={{
          ...baseEvent,
          target_id: "peer-1",
          activity: "Peer connected",
          activity_code: "peer.connect",
          meta: {
            name: "office-laptop",
            location_connection_ip: "203.0.113.24",
            location_country_code: "DE",
            location_city_name: "Berlin",
          },
        }}
      />,
    );
    expect(textOf(container)).toBe(
      "Peer office-laptop connected to Management from 203.0.113.24 Germany, Berlin",
    );
  });

  it("does not invent an address when the source IP is unavailable", () => {
    const { container } = render(
      <ActivityDescription
        event={{
          ...baseEvent,
          activity: "Peer disconnected",
          activity_code: "peer.disconnect",
          meta: { name: "office-laptop" },
        }}
      />,
    );
    expect(textOf(container)).toBe(
      "Peer office-laptop disconnected from Management",
    );
  });
});

describe("ActivityDescription resource group events", () => {
  it("names the group and the resource in the right slots when a resource is added to a group", () => {
    const { container } = render(
      <ActivityDescription
        event={{
          ...baseEvent,
          activity: "Resource added to group",
          activity_code: "resource.group.add",
        }}
      />,
    );
    expect(textOf(container)).toBe(
      "Group infra-admins added to resource office-lan",
    );
  });

  it("names the group and the resource in the right slots when a resource is removed from a group", () => {
    const { container } = render(
      <ActivityDescription
        event={{
          ...baseEvent,
          activity: "Resource removed from group",
          activity_code: "resource.group.delete",
        }}
      />,
    );
    expect(textOf(container)).toBe(
      "Group infra-admins removed from resource office-lan",
    );
  });
});
