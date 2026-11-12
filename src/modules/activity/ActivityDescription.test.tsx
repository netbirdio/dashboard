import { cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActivityEvent } from "@/interfaces/ActivityEvent";
import ActivityDescription from "@/modules/activity/ActivityDescription";

// The component imports @utils/netbird, which reads config.json at module load.
vi.mock("@utils/config", () => ({
  default: () => ({ apiOrigin: "http://localhost", redirectURI: "/" }),
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

describe("ActivityDescription EDR events", () => {
  const edrEvent = (
    activity_code: string,
    meta: Record<string, string>,
  ): ActivityEvent => ({
    ...baseEvent,
    target_id: "p1",
    activity: "EDR event",
    activity_code,
    meta: { platform: "huntress", type: "endpoint_management", ...meta },
  });

  const describeEvent = (event: ActivityEvent) =>
    textOf(render(<ActivityDescription event={event} />).container);

  it("explains the integration's own rejection reasons in words", () => {
    expect(
      describeEvent(
        edrEvent("integrated-validator.host-check.denied", {
          name: "laptop-01",
          reason: "STALE_CHECK_IN",
        }),
      ),
    ).toBe(
      "Peer laptop-01 rejected by huntress integration, reason: no recent EDR check-in",
    );
  });

  it("shows a vendor's rejection reason as sent", () => {
    expect(
      describeEvent(
        edrEvent("integrated-validator.host-check.denied", {
          reason: "ZTA score 10 is below threshold",
        }),
      ),
    ).toBe(
      "Peer rejected by huntress integration, reason: ZTA score 10 is below threshold",
    );
  });

  it("keeps the old text for events without a name or reason", () => {
    expect(
      describeEvent(edrEvent("integrated-validator.host-check.denied", {})),
    ).toBe("Peer rejected by huntress integration");
    expect(
      describeEvent(edrEvent("integrated-validator.host-check.approved", {})),
    ).toBe("Peer approved by huntress integration");
  });

  it("describes a started grace period", () => {
    expect(
      describeEvent(
        edrEvent("integrated-validator.peer.stale-grace-started", {
          name: "laptop-01",
          grace_minutes: "45",
        }),
      ),
    ).toBe(
      "Peer laptop-01 keeps access for 45 minutes while it waits for a huntress check-in",
    );
  });
});
