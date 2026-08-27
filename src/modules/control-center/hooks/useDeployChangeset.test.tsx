import { renderHook } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";
import { buildChangeRequest } from "@/modules/control-center/utils/changeset-request";

// One recorder for every entity: the network, resource and router requests share
// the "/networks" base url, so only method + full path tells them apart.
type Call = { method: string; path: string; body?: unknown };
const calls: Call[] = [];
const handlers = new Map<string, (body?: unknown) => unknown>();
let liveGroups: Group[] = [];
let liveNetworks: Network[] = [];
let liveResources: NetworkResource[] = [];
let changes: DraftChange[] = [];

const record = (method: string, url: string) => {
  return async (a?: unknown, b?: unknown) => {
    // get(suffix) takes the suffix first; the writers take (body, suffix).
    const suffix = (method === "GET" ? a : b) as string | undefined;
    const body = method === "GET" ? undefined : a;
    const path = `${url}${suffix ?? ""}`;
    calls.push({ method, path, body });
    const handler = handlers.get(`${method} ${path}`);
    if (handler) return handler(body);
    return { id: `srv-${calls.length}` };
  };
};

vi.mock("@utils/api", () => ({
  useApiCall: (url: string) => ({
    post: record("POST", url),
    put: record("PUT", url),
    del: record("DELETE", url),
    get: record("GET", url),
  }),
}));
vi.mock("swr", () => ({ mutate: vi.fn(async () => undefined) }));
// Full rights by default; the permission-gate tests narrow this per case.
let permission = {
  groups: { create: true, read: true, update: true, delete: true },
  policies: { create: true, read: true, update: true, delete: true },
  networks: { create: true, read: true, update: true, delete: true },
};
vi.mock("@/contexts/PermissionsProvider", () => ({
  usePermissions: () => ({ permission }),
}));
const notify = vi.fn();
vi.mock("@components/Notification", () => ({ notify: (a: unknown) => notify(a) }));
vi.mock("@/modules/control-center/hooks/useControlCenterData", () => ({
  useControlCenterData: () => ({
    groups: liveGroups,
    networks: liveNetworks,
    networkResources: liveResources,
  }),
}));
vi.mock("@/modules/control-center/draft/DraftChangesetContext", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/control-center/draft/DraftChangesetContext")
  >("@/modules/control-center/draft/DraftChangesetContext");
  return { ...actual, useDraftChangeset: () => ({ changes }) };
});

const { useDeployChangeset, deployInFlight } = await import(
  "@/modules/control-center/hooks/useDeployChangeset"
);

const sidedPolicy = (id: string, over: Record<string, unknown> = {}): Policy =>
  ({
    id,
    name: id,
    enabled: true,
    rules: [
      {
        name: id,
        enabled: true,
        bidirectional: true,
        action: "accept",
        protocol: "all",
        ports: [],
        sources: [{ id: "g1", name: "G" }],
        destinations: [{ id: "g2", name: "H" }],
        ...over,
      },
    ],
  }) as unknown as Policy;

const pathsOf = (method: string) =>
  calls.filter((c) => c.method === method).map((c) => c.path);

beforeEach(() => {
  calls.length = 0;
  handlers.clear();
  notify.mockClear();
  liveGroups = [];
  liveNetworks = [];
  liveResources = [];
  changes = [];
  permission = {
    groups: { create: true, read: true, update: true, delete: true },
    policies: { create: true, read: true, update: true, delete: true },
    networks: { create: true, read: true, update: true, delete: true },
  };
});

describe("a retry after the create already succeeded", () => {
  const createGroup = (name: string): DraftChange => ({
    id: "c1",
    type: "create-group",
    clientId: "group-new-1",
    name,
    peerIds: [],
    resourceIds: [],
  });

  it("skips an untouched create instead of POSTing it twice", async () => {
    changes = [createGroup("G")];
    const { result, rerender } = renderHook(() => useDeployChangeset());
    await act(async () => void (await result.current.deploy()));
    rerender();
    await act(async () => void (await result.current.deploy()));

    expect(pathsOf("POST")).toEqual(["/groups"]);
    expect(pathsOf("PUT")).toEqual([]);
  });

  it("PUTs an EDITED create against the id the POST returned", async () => {
    changes = [createGroup("G")];
    handlers.set("POST /groups", () => ({ id: "g-real", name: "G" }));
    const { result, rerender } = renderHook(() => useDeployChangeset());
    await act(async () => void (await result.current.deploy()));

    // Coalescing keeps the change id when the user renames the draft group.
    changes = [createGroup("G renamed")];
    handlers.set("PUT /groups/g-real", () => ({ id: "g-real", name: "G renamed" }));
    rerender();
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(true);
    expect(pathsOf("POST")).toEqual(["/groups"]);
    expect(pathsOf("PUT")).toEqual(["/groups/g-real"]);
    expect(calls.at(-1)?.body).toMatchObject({ name: "G renamed" });
  });

  it("PUTs an edited create-resource under its network", async () => {
    const resource = (name: string): DraftChange => ({
      id: "c2",
      type: "create-resource",
      clientId: "new-r1",
      name,
      address: "10.0.0.1",
      networkId: "net-1",
      networkName: "N",
      groupIds: [],
    });
    changes = [resource("res")];
    handlers.set("POST /networks/net-1/resources", () => ({
      id: "r-real",
      type: "host",
    }));
    const { result, rerender } = renderHook(() => useDeployChangeset());
    await act(async () => void (await result.current.deploy()));

    changes = [resource("res renamed")];
    rerender();
    await act(async () => void (await result.current.deploy()));

    expect(pathsOf("PUT")).toEqual(["/networks/net-1/resources/r-real"]);
  });

  // The retry is a PUT, which REPLACES the member list: sending the create body
  // raw would erase whatever landed in the group between the two runs.
  describe("the retry PUT merges onto a fresh read", () => {
    const withPeers = (name: string, peerIds: string[]): DraftChange => ({
      id: "c1",
      type: "create-group",
      clientId: "group-new-1",
      name,
      peerIds,
      resourceIds: [],
    });

    const firstRunThen = async (
      first: DraftChange,
      live: { peers: string[] },
      second: DraftChange,
    ) => {
      changes = [first];
      handlers.set("POST /groups", () => ({ id: "g-real", name: "G" }));
      const { result, rerender } = renderHook(() => useDeployChangeset());
      await act(async () => void (await result.current.deploy()));

      handlers.set("GET /groups/g-real", () => ({
        id: "g-real",
        name: "G",
        peers: live.peers,
        resources: [],
      }));
      handlers.set("PUT /groups/g-real", () => ({ id: "g-real", name: "G" }));
      changes = [second];
      rerender();
      await act(async () => void (await result.current.deploy()));

      const put = calls.find(
        (c) => c.method === "PUT" && c.path === "/groups/g-real",
      );
      return ((put?.body as { peers: string[] })?.peers ?? []).sort();
    };

    it("keeps a member added from outside the draft between the runs", async () => {
      const peers = await firstRunThen(
        withPeers("G", ["p1"]),
        // Another admin dropped p2 in while the first run was failing.
        { peers: ["p1", "p2"] },
        withPeers("G renamed", ["p1"]),
      );
      expect(peers).toEqual(["p1", "p2"]);
    });

    it("still drops a member the user removed from the draft", async () => {
      const peers = await firstRunThen(
        withPeers("G", ["p1", "p2"]),
        { peers: ["p1", "p2", "p3"] },
        // The user took p2 out of the draft group; p3 was never ours to remove.
        withPeers("G", ["p1"]),
      );
      expect(peers).toEqual(["p1", "p3"]);
    });

    it("fails rather than PUTting when the group is gone", async () => {
      changes = [withPeers("G", ["p1"])];
      handlers.set("POST /groups", () => ({ id: "g-real", name: "G" }));
      const { result, rerender } = renderHook(() => useDeployChangeset());
      await act(async () => void (await result.current.deploy()));

      handlers.set("GET /groups/g-real", () => undefined);
      changes = [withPeers("G renamed", ["p1"])];
      rerender();
      const ok = await act(async () => await result.current.deploy());

      expect(ok).toBe(false);
      expect(pathsOf("PUT")).toEqual([]);
    });
  });
});

describe("update-group merges onto a fresh read", () => {
  const updateGroup: DraftChange = {
    id: "u1",
    type: "update-group",
    groupId: "g1",
    name: "G",
    originalName: "G",
    peerIds: ["p2"],
    resourceIds: [],
  };

  it("sends the current members plus the draft add", async () => {
    changes = [updateGroup];
    liveGroups = [{ id: "g1", name: "G", peers: ["p1"] } as unknown as Group];
    handlers.set("GET /groups/g1", () => ({
      id: "g1",
      name: "G",
      peers: ["p1", "p9"],
      resources: [],
    }));
    const { result } = renderHook(() => useDeployChangeset());
    await act(async () => void (await result.current.deploy()));

    // p9 was added by someone else after the draft started; it must survive.
    expect(calls.find((c) => c.method === "PUT")?.body).toMatchObject({
      peers: ["p1", "p9", "p2"],
    });
  });

  it("FAILS rather than PUTting the stale snapshot when the read fails", async () => {
    changes = [updateGroup];
    liveGroups = [
      { id: "g1", name: "G", peers: ["p1"], resources: [] } as unknown as Group,
    ];
    handlers.set("GET /groups/g1", () => {
      throw { message: "boom", code: 500 };
    });
    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(false);
    // A PUT here would have erased p9 in the test above.
    expect(pathsOf("PUT")).toEqual([]);
  });
});

describe("the deploy sink guards the policy itself", () => {
  it("refuses a policy still pointing at an uninstalled placeholder peer", async () => {
    changes = [
      {
        id: "p1",
        type: "create-policy",
        clientId: "new-p1",
        name: "P",
        policy: sidedPolicy("new-p1", {
          destinations: [],
          destinationResource: { id: "draft-abc", type: "peer" },
        }),
      },
    ];
    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(false);
    expect(pathsOf("POST")).toEqual([]);
  });

  it("refuses a policy referencing a draft resource that is not tracked", async () => {
    changes = [
      {
        id: "p1",
        type: "create-policy",
        clientId: "new-p1",
        name: "P",
        policy: sidedPolicy("new-p1", {
          destinations: [],
          destinationResource: { id: "new-r9", type: "host" },
        }),
      },
    ];
    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(false);
    expect(pathsOf("POST")).toEqual([]);
  });

  it("lets an ordinary two-sided policy through", async () => {
    changes = [
      {
        id: "p1",
        type: "create-policy",
        clientId: "new-p1",
        name: "P",
        policy: sidedPolicy("new-p1"),
      },
    ];
    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(true);
    expect(pathsOf("POST")).toEqual(["/policies"]);
  });
});

describe("contradictory policy changes never reach the API", () => {
  it("refuses a changeset that both updates and deletes one policy", async () => {
    changes = [
      {
        id: "u1",
        type: "update-policy",
        policyId: "p1",
        name: "P",
        policy: sidedPolicy("p1"),
        origin: "edit",
      },
      { id: "d1", type: "delete-policy", policyId: "p1", name: "P" },
    ];
    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    // The PUT would land and the DELETE would then destroy the policy.
    expect(ok).toBe(false);
    expect(calls).toEqual([]);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].description).toContain("P");
  });

  it("still deploys a delete that has no matching update", async () => {
    changes = [
      { id: "d1", type: "delete-policy", policyId: "p1", name: "P" },
    ];
    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(true);
    expect(pathsOf("DELETE")).toEqual(["/policies/p1"]);
  });
});

describe("resolving a network on retry", () => {
  const router: DraftChange = {
    id: "rt1",
    type: "create-router",
    clientId: "new-rt1",
    networkClientId: "new-n1",
    networkName: "Shared",
    peerId: "peer-1",
  };

  it("refuses to guess when two networks share the name", async () => {
    changes = [router];
    liveNetworks = [
      { id: "n-a", name: "Shared" } as Network,
      { id: "n-b", name: "Shared" } as Network,
    ];
    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(false);
    expect(pathsOf("POST")).toEqual([]);
  });

  it("uses the single match when the name is unambiguous", async () => {
    changes = [router];
    liveNetworks = [{ id: "n-a", name: "Shared" } as Network];
    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(true);
    expect(pathsOf("POST")).toEqual(["/networks/n-a/routers"]);
  });
});

// groupIdForRef used to fall back to the ref itself, putting a human-typed group
// name in a field that must hold a UUID; and the name map used to collapse two
// same-named groups to whichever the array listed last.
describe("resolving a group reference", () => {
  const resourceInGroup = (groupRef: string): DraftChange => ({
    id: "c1",
    type: "create-resource",
    clientId: "new-r1",
    name: "R",
    address: "10.0.0.1",
    networkId: "net-1",
    networkName: "Net",
    groupIds: [groupRef],
  });

  it("resolves a draft group name to the id its create returned", async () => {
    changes = [
      {
        id: "c0",
        type: "create-group",
        clientId: "group-new-1",
        name: "Sales",
        peerIds: [],
        resourceIds: [],
      },
      resourceInGroup("Sales"),
    ];
    handlers.set("POST /groups", () => ({ id: "g-new", name: "Sales" }));
    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(true);
    expect(
      calls.find((c) => c.path === "/networks/net-1/resources")?.body,
    ).toMatchObject({ groups: ["g-new"] });
  });

  it("passes an existing group's raw id straight through", async () => {
    changes = [resourceInGroup("g-live")];
    liveGroups = [{ id: "g-live", name: "Ops" } as Group];
    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(true);
    expect(
      calls.find((c) => c.path === "/networks/net-1/resources")?.body,
    ).toMatchObject({ groups: ["g-live"] });
  });

  it("refuses an unresolvable ref instead of sending the name as an id", async () => {
    changes = [resourceInGroup("Sales")];
    liveGroups = [];
    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(false);
    expect(pathsOf("POST")).toEqual([]);
  });

  it("refuses an ambiguous group name rather than picking one", async () => {
    changes = [resourceInGroup("Contractors")];
    liveGroups = [
      { id: "g-a", name: "Contractors" } as Group,
      { id: "g-b", name: "Contractors" } as Group,
    ];
    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(false);
    expect(pathsOf("POST")).toEqual([]);
  });

  it("stops being ambiguous once this run creates the group by that name", async () => {
    changes = [
      {
        id: "c0",
        type: "create-group",
        clientId: "group-new-1",
        name: "Contractors",
        peerIds: [],
        resourceIds: [],
      },
      resourceInGroup("Contractors"),
    ];
    liveGroups = [
      { id: "g-a", name: "Contractors" } as Group,
      { id: "g-b", name: "Contractors" } as Group,
    ];
    handlers.set("POST /groups", () => ({ id: "g-new", name: "Contractors" }));
    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    // The ref can only mean the group the create just made.
    expect(ok).toBe(true);
    expect(
      calls.find((c) => c.path === "/networks/net-1/resources")?.body,
    ).toMatchObject({ groups: ["g-new"] });
  });

  // An id is the unambiguous half of the "name or raw id" union, so it has to win.
  // Resolving by NAME first let a group named after another group's id capture every ref
  // to that id, and made the deploy disagree with the preview the user approves.
  it("prefers a live group's own id over a group NAMED after that id", async () => {
    const change = resourceInGroup("ops-team-id");
    changes = [change];
    liveGroups = [
      { id: "ops-team-id", name: "Finance" } as Group,
      { id: "decoy-id", name: "ops-team-id" } as Group,
    ];
    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(true);
    const sent = calls.find((c) => c.path === "/networks/net-1/resources")?.body;
    expect(sent).toMatchObject({ groups: ["ops-team-id"] });
    // ...and the Review & Deploy preview says the same thing.
    const preview = buildChangeRequest(change, { groups: liveGroups });
    expect(preview.body).toMatchObject({ groups: ["ops-team-id"] });
  });

  it("refuses an ambiguous name in a policy's group sides too", async () => {
    changes = [
      {
        id: "c1",
        type: "create-policy",
        clientId: "new-p1",
        name: "P",
        policy: sidedPolicy("new-p1", {
          sources: [{ name: "Contractors" }],
          destinations: [{ id: "g2", name: "H" }],
        }),
      },
    ];
    liveGroups = [
      { id: "g-a", name: "Contractors" } as Group,
      { id: "g-b", name: "Contractors" } as Group,
    ];
    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(false);
    expect(pathsOf("POST")).toEqual([]);
  });
});

// A network resource or router lives under the network its POST ran against, so a
// retry PUT built from the change's CURRENT network would address a path the object
// does not exist at — silently, since only the path is wrong, not the body.
describe("a create edited to point at another network", () => {
  const resource = (networkId: string, networkName: string): DraftChange => ({
    id: "c1",
    type: "create-resource",
    clientId: "new-r1",
    name: "R",
    address: "10.0.0.1",
    networkId,
    networkName,
    groupIds: [],
  });

  it("refuses the retry instead of PUTting into the new network", async () => {
    changes = [resource("net-A", "A")];
    handlers.set("POST /networks/net-A/resources", () => ({
      id: "r-real",
      type: "host",
    }));
    const { result, rerender } = renderHook(() => useDeployChangeset());
    await act(async () => void (await result.current.deploy()));

    // The picker moved it while the changeset was still open.
    changes = [resource("net-B", "B")];
    rerender();
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(false);
    // r-real belongs to net-A; nothing was written under net-B.
    expect(pathsOf("PUT")).toEqual([]);
    expect(pathsOf("POST")).toEqual(["/networks/net-A/resources"]);
  });

  it("still retries as a PUT when the network is unchanged", async () => {
    changes = [resource("net-A", "A")];
    handlers.set("POST /networks/net-A/resources", () => ({
      id: "r-real",
      type: "host",
    }));
    const { result, rerender } = renderHook(() => useDeployChangeset());
    await act(async () => void (await result.current.deploy()));

    changes = [{ ...resource("net-A", "A"), name: "R renamed" } as DraftChange];
    rerender();
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(true);
    expect(pathsOf("PUT")).toEqual(["/networks/net-A/resources/r-real"]);
  });
});

// F1: draft mode DEFERS these writes, it does not exempt them — the menus that
// queue them are gated, but the deploy is the sink and cannot trust that. A mid-run
// 403 half-changes the account and wedges every retry at the forbidden change.
describe("a changeset the user is not allowed to deploy", () => {
  const deleteNetwork = (): DraftChange => ({
    id: "d1",
    type: "delete-network",
    networkId: "net-A",
    name: "Net A",
  });
  const updateResource = (): DraftChange => ({
    id: "u1",
    type: "update-resource",
    resourceId: "r-1",
    networkId: "net-B",
    name: "R",
    networkName: "Net B",
    address: "10.0.0.5/32",
    enabled: false,
    groupIds: [],
  });

  it("sends NOTHING when one change is forbidden, rather than failing part-way", async () => {
    // The exact split from the finding: allowed to update, not to delete.
    permission.networks.delete = false;
    changes = [updateResource(), deleteNetwork()];

    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(false);
    // The authorized change must not have landed: that is what wedges the retry.
    expect(calls).toEqual([]);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Deploy failed",
        description: expect.stringContaining("DELETE /networks/net-A"),
      }),
    );
  });

  it("deploys normally once the permission is there", async () => {
    changes = [updateResource(), deleteNetwork()];
    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(true);
    expect(pathsOf("DELETE")).toEqual(["/networks/net-A"]);
  });

  it("names every forbidden change, not just the first", async () => {
    permission.networks.delete = false;
    permission.policies.delete = false;
    changes = [
      deleteNetwork(),
      { id: "d2", type: "delete-policy", policyId: "p-1", name: "P" },
    ];

    const { result } = renderHook(() => useDeployChangeset());
    await act(async () => void (await result.current.deploy()));

    const description = notify.mock.calls.at(-1)?.[0]?.description as string;
    expect(description).toContain("DELETE /policies/p-1");
    expect(description).toContain("DELETE /networks/net-A");
  });

  // install-peer is the user's own manual step, not a deploy call, so it carries no
  // permission of its own and must not be able to block an otherwise-allowed run.
  it("ignores install-peer rows when checking permissions", async () => {
    permission.groups.create = false;
    changes = [
      {
        id: "i1",
        type: "install-peer",
        clientId: "draft-1",
        name: "Server",
        kind: "server",
        installedPeerId: "peer-1",
      },
    ];

    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(true);
    expect(calls).toEqual([]);
  });
});

// F2: resources and routers deploy BEFORE delete-group, so writing one that names a
// doomed group lands the reference and then has the group DELETE refused for exactly
// that reason — unrecoverably, since the retry re-sends the same pair.
describe("a change referencing a group this deploy also deletes", () => {
  const deleteGroup = (): DraftChange => ({
    id: "dg",
    type: "delete-group",
    groupId: "g-servers",
    name: "Servers",
  });

  it("refuses a create-resource that still names the group", async () => {
    changes = [
      {
        id: "cr",
        type: "create-resource",
        clientId: "new-1",
        name: "R",
        address: "10.0.0.5/32",
        networkId: "net-A",
        networkName: "Net A",
        groupIds: ["g-servers"],
      },
      deleteGroup(),
    ];
    liveGroups = [{ id: "g-servers", name: "Servers" } as Group];

    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(false);
    // Neither half ran: the resource POST is what makes the DELETE unrecoverable.
    expect(pathsOf("POST")).toEqual([]);
    expect(pathsOf("DELETE")).toEqual([]);
  });

  it("refuses a create-router whose peer group is the doomed group", async () => {
    changes = [
      {
        id: "rt",
        type: "create-router",
        clientId: "new-2",
        networkId: "net-A",
        networkName: "Net A",
        groupId: "g-servers",
        groupName: "Servers",
      },
      deleteGroup(),
    ];
    liveGroups = [{ id: "g-servers", name: "Servers" } as Group];

    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(false);
    expect(pathsOf("POST")).toEqual([]);
  });

  it("lets the resource through once the group deletion is gone", async () => {
    changes = [
      {
        id: "cr",
        type: "create-resource",
        clientId: "new-1",
        name: "R",
        address: "10.0.0.5/32",
        networkId: "net-A",
        networkName: "Net A",
        groupIds: ["g-servers"],
      },
    ];
    liveGroups = [{ id: "g-servers", name: "Servers" } as Group];

    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(true);
    expect(pathsOf("POST")).toEqual(["/networks/net-A/resources"]);
  });

  // A group the deletion does NOT name is untouched: the guard must not refuse
  // every resource just because some other group is on its way out.
  it("leaves a resource naming a different group alone", async () => {
    changes = [
      {
        id: "cr",
        type: "create-resource",
        clientId: "new-1",
        name: "R",
        address: "10.0.0.5/32",
        networkId: "net-A",
        networkName: "Net A",
        groupIds: ["g-other"],
      },
      deleteGroup(),
    ];
    liveGroups = [
      { id: "g-servers", name: "Servers" } as Group,
      { id: "g-other", name: "Other" } as Group,
    ];

    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(true);
    expect(pathsOf("POST")).toEqual(["/networks/net-A/resources"]);
    expect(pathsOf("DELETE")).toEqual(["/groups/g-servers"]);
  });
});

// Coalescing keeps a change's id across edits, so the reported status must not
// keep claiming "done" for a payload that was never sent.
describe("deployStatus after an edit", () => {
  const createGroup = (name: string): DraftChange => ({
    id: "c1",
    type: "create-group",
    clientId: "group-new-1",
    name,
    peerIds: [],
    resourceIds: [],
  });

  it("stops reporting an edited change as done", async () => {
    changes = [createGroup("G")];
    const { result, rerender } = renderHook(() => useDeployChangeset());
    await act(async () => void (await result.current.deploy()));
    rerender();
    expect(result.current.deployStatus["c1"]).toBe("done");

    changes = [createGroup("G renamed")];
    rerender();
    expect(result.current.deployStatus["c1"]).toBeUndefined();
  });

  it("keeps the checkmark while the payload is unchanged", async () => {
    changes = [createGroup("G")];
    const { result, rerender } = renderHook(() => useDeployChangeset());
    await act(async () => void (await result.current.deploy()));
    rerender();
    expect(result.current.deployStatus["c1"]).toBe("done");

    changes = [createGroup("G")];
    rerender();
    expect(result.current.deployStatus["c1"]).toBe("done");
  });
});

// DraftHistoryContext reads this latch to keep undo/redo inert during a run.
describe("the deploy in-flight latch", () => {
  const createGroup = (): DraftChange => ({
    id: "c1",
    type: "create-group",
    clientId: "group-new-1",
    name: "G",
    peerIds: [],
    resourceIds: [],
  });

  it("is raised while the run executes and released after", async () => {
    changes = [createGroup()];
    let latchedDuringRequest: boolean | undefined;
    handlers.set("POST /groups", () => {
      latchedDuringRequest = deployInFlight.current;
      return { id: "g-real", name: "G" };
    });

    const { result } = renderHook(() => useDeployChangeset());
    expect(deployInFlight.current).toBe(false);
    await act(async () => void (await result.current.deploy()));

    expect(latchedDuringRequest).toBe(true);
    expect(deployInFlight.current).toBe(false);
  });

  it("is released when the permission pre-flight refuses the run", async () => {
    changes = [createGroup()];
    permission.groups.create = false;

    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(false);
    expect(deployInFlight.current).toBe(false);
  });

  it("is released when a change fails mid-run", async () => {
    changes = [createGroup()];
    handlers.set("POST /groups", () => {
      throw { message: "boom", code: 500 };
    });

    const { result } = renderHook(() => useDeployChangeset());
    const ok = await act(async () => await result.current.deploy());

    expect(ok).toBe(false);
    expect(deployInFlight.current).toBe(false);
  });
});
