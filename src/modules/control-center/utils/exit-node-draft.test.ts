import { describe, expect, it } from "vitest";
import { ExitNode } from "@/interfaces/ExitNode";
import type { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";
import { applyExitNodeChanges } from "./exit-node-draft";

const request = (name: string, enabled = true) => ({
  name,
  description: "",
  enabled,
  auto_apply: true,
  peers: [{ peer_id: "fra", metric: 100, enabled: true }],
});
const eu: ExitNode = { id: "en1", ...request("EU Egress") };
const us: ExitNode = { id: "en2", ...request("US Egress") };

describe("applyExitNodeChanges", () => {
  it("returns the live exit nodes when nothing is pending", () => {
    expect(applyExitNodeChanges([eu, us], [])).toEqual([eu, us]);
  });

  it("applies updates, leaves out deletions and adds draft creates", () => {
    const changes = [
      {
        id: "u",
        type: "update-exit-node",
        exitNodeId: "en1",
        name: "EU",
        request: request("EU", false),
      },
      { id: "d", type: "delete-exit-node", exitNodeId: "en2", name: "US" },
      {
        id: "c",
        type: "create-exit-node",
        clientId: "new-x",
        name: "New",
        request: request("New"),
      },
    ] as DraftChange[];
    expect(applyExitNodeChanges([eu, us], changes)).toEqual([
      { id: "en1", ...request("EU", false) },
      { id: "new-x", ...request("New") },
    ]);
  });

  it("doesn't change the live list it was given", () => {
    const live = [eu];
    applyExitNodeChanges(live, [
      {
        id: "u",
        type: "update-exit-node",
        exitNodeId: "en1",
        name: "EU",
        request: request("EU", false),
      } as DraftChange,
    ]);
    expect(live[0]).toBe(eu);
    expect(eu.enabled).toBe(true);
  });
});
