import { describe, expect, it } from "vitest";
import { Network, NetworkResource } from "@/interfaces/Network";
import { buildStandaloneResourceNode } from "@/modules/control-center/utils/draft-node-factory";
import { getResourceNodeEnabled } from "@/modules/control-center/utils/helpers";

const network = { id: "net-1", name: "Net" } as Network;
const resource = (over: Partial<NetworkResource> = {}) =>
  ({ id: "r1", name: "db-01", address: "10.0.0.1", ...over }) as NetworkResource;

// Resource nodes treat data.enabled purely as the owning frame's dim flag. A builder
// that put the resource's OWN state there left a disabled resource dimmed for good:
// the draft toggle writes resourceEnabled and never clears data.enabled.
const isDimmed = (node: { id: string; data: Record<string, unknown> }) =>
  node.data.enabled === false || !getResourceNodeEnabled(node);

describe("buildStandaloneResourceNode", () => {
  it("keeps data.enabled as the dim flag, not the resource's state", () => {
    const node = buildStandaloneResourceNode(resource({ enabled: false }), network);
    // No frame owns a standalone resource, so nothing dims it from outside.
    expect(node.data.enabled).toBe(true);
  });

  it("still shows a live-disabled resource as dimmed", () => {
    const node = buildStandaloneResourceNode(resource({ enabled: false }), network);
    expect(isDimmed(node as never)).toBe(true);
  });

  it("un-dims once the draft enables it", () => {
    const node = buildStandaloneResourceNode(resource({ enabled: false }), network);
    // What toggleResourceEnabled writes for an EXISTING resource.
    const toggled = {
      ...node,
      data: { ...node.data, resourceEnabled: true },
    };
    expect(isDimmed(toggled as never)).toBe(false);
  });

  it("dims once the draft disables an enabled resource", () => {
    const node = buildStandaloneResourceNode(resource({ enabled: true }), network);
    expect(isDimmed(node as never)).toBe(false);
    const toggled = {
      ...node,
      data: { ...node.data, resourceEnabled: false },
    };
    expect(isDimmed(toggled as never)).toBe(true);
  });

  it("carries the resource and its network ref for the canvas", () => {
    const node = buildStandaloneResourceNode(resource(), network);
    expect(node.id).toBe("resource-r1");
    expect(node.data.resource).toMatchObject({ id: "r1", name: "db-01" });
    expect(node.data.draftNetwork).toEqual({ networkId: "net-1", name: "Net" });
  });
});
