import { describe, expect, it } from "vitest";
import type { ActivityEvent } from "@/interfaces/ActivityEvent";
import { peerConnectionEvents } from "./connectionHistory";

const event = (
  id: string,
  activity_code: string,
  target_id = "peer-1",
  timestamp = "2026-11-13T09:00:00Z",
): ActivityEvent => ({
  id,
  activity_code,
  target_id,
  timestamp,
  activity: activity_code,
  initiator_id: "",
  initiator_email: "",
  initiator_name: "",
  meta: {},
});

describe("peer connection history", () => {
  it("selects only this peer's connection events without changing the feed's order", () => {
    const events = [
      event("1", "peer.connect"),
      event("2", "peer.rename"),
      event("3", "peer.disconnect", "other-peer"),
      event("4", "peer.disconnect", "peer-1", "2026-11-13T10:00:00Z"),
    ];
    expect(peerConnectionEvents(events, "peer-1").map((e) => e.id)).toEqual([
      "1",
      "4",
    ]);
    expect(events.map((e) => e.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("returns no events when this peer has no connection history in the feed", () => {
    expect(peerConnectionEvents([], "peer-1")).toEqual([]);
    expect(
      peerConnectionEvents(
        [event("1", "peer.connect", "other-peer")],
        "peer-1",
      ),
    ).toEqual([]);
  });
});
