import { describe, expect, it } from "vitest";
import type { ActivityEvent } from "@/interfaces/ActivityEvent";
import {
  formatSessionSeconds,
  peerConnectionEvents,
  sessionDurationText,
} from "./connectionHistory";

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

describe("session duration", () => {
  it.each([
    ["0", "0s"],
    ["45", "45s"],
    ["723", "12m 3s"],
    ["3600", "1h"],
    ["3723", "1h 2m"],
    ["183600", "2d 3h"],
  ])("formats %s seconds as %s", (seconds, text) => {
    expect(sessionDurationText({ session_duration: seconds })).toBe(text);
  });

  it.each([undefined, "", "abc", "-1", "NaN", "Infinity"])(
    "ignores the unusable value %j",
    (value) => {
      expect(sessionDurationText({ session_duration: value })).toBe("");
    },
  );

  it("ignores events without meta", () => {
    expect(sessionDurationText(undefined)).toBe("");
    expect(formatSessionSeconds(undefined)).toBe("");
  });
});
