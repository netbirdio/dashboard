import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExitNode } from "@/interfaces/ExitNode";
import { Policy } from "@/interfaces/Policy";
import {
  createExitNodesMock,
  ExitNodesMock,
  MockContext,
  MockMethod,
} from "@/modules/exit-nodes/mock/handler";

const realPolicy: Policy = {
  id: "real-1",
  name: "Default",
  description: "",
  enabled: true,
  source_posture_checks: [],
  rules: [
    {
      name: "Default",
      description: "",
      enabled: true,
      action: "accept",
      bidirectional: true,
      protocol: "all",
      ports: [],
      sources: [{ id: "all", name: "All" }],
      destinations: [{ id: "all", name: "All" }],
    },
  ],
};

const groups = [
  { id: "all", name: "All", peers_count: 3 },
  { id: "eng", name: "Engineering", peers_count: 2 },
];

const peers = [
  {
    id: "fra",
    name: "fra",
    os: "Linux",
    country_code: "DE",
    city_name: "Frankfurt",
  },
  {
    id: "ams",
    name: "ams",
    os: "Linux",
    country_code: "NL",
    city_name: "Amsterdam",
  },
  {
    id: "ny",
    name: "ny",
    os: "Linux",
    country_code: "US",
    city_name: "New York",
  },
];

/** A fake management API: what the real requests would answer. */
const createApi = () => {
  const request = vi.fn(
    async (method: MockMethod, path: string, _body?: unknown) => {
      if (method === "GET" && path === "/peers") return peers;
      if (method === "GET" && path === "/groups") return groups;
      if (method === "GET" && path === "/policies") return [realPolicy];
      if (method === "POST" && path === "/policies") return { id: "real-new" };
      return { method, path };
    },
  );
  return request;
};

describe("exit nodes mock handler", () => {
  let mock: ExitNodesMock;
  let api: ReturnType<typeof createApi>;

  const call = (method: MockMethod, url: string, body?: unknown) => {
    const ctx: MockContext = {
      next: () => api(method, url.split("?")[0], body),
      request: (m, path, b) => api(m, path, b),
    };
    return mock.handle(method, url, body, ctx);
  };

  const exitPolicy = (exitNodeId: string, name = "Access"): Policy => ({
    name,
    description: "",
    enabled: true,
    source_posture_checks: [],
    rules: [
      {
        name,
        description: "",
        enabled: true,
        action: "accept",
        bidirectional: false,
        protocol: "all",
        ports: [],
        sources: ["eng"],
        destinationResource: { id: exitNodeId, type: "exit_node" },
        destinations: null,
      },
    ],
  });

  beforeEach(() => {
    mock = createExitNodesMock();
    api = createApi();
  });

  it("leaves other requests to the real API", () => {
    expect(call("GET", "/peers")).toBeUndefined();
    expect(call("POST", "/policies", realPolicy)).toBeUndefined();
    expect(call("PUT", "/policies/real-1", realPolicy)).toBeUndefined();
    expect(call("DELETE", "/policies/real-1")).toBeUndefined();
    expect(call("GET", "/policies/real-1")).toBeUndefined();
  });

  it("claims nothing when switched off", () => {
    mock.setEnabled(false);
    expect(call("GET", "/exit-nodes")).toBeUndefined();
    expect(call("GET", "/policies")).toBeUndefined();
  });

  it("seeds once from the account's peers and groups", async () => {
    const [first, second] = (await Promise.all([
      call("GET", "/exit-nodes"),
      call("GET", "/exit-nodes?x=1"),
    ])) as ExitNode[][];
    expect(first.map((n) => n.name)).toEqual([
      "EU Egress",
      "US Egress",
      "Contractors Egress",
    ]);
    expect(second).toEqual(first);
    expect(first[0].peers.map((p) => p.peer_id)).toEqual(["fra", "ams"]);
    expect(api.mock.calls.filter(([, path]) => path === "/peers")).toHaveLength(
      1,
    );
  });

  it("serves the exit node CRUD endpoints", async () => {
    const created = (await call("POST", "/exit-nodes", {
      name: "Asia Egress",
      description: "",
      enabled: true,
      auto_apply: true,
      peers: [{ peer_id: "sgp", metric: 100, enabled: true }],
    })) as ExitNode;
    expect(created.id).toBeTruthy();
    expect(await call("GET", `/exit-nodes/${created.id}`)).toEqual(created);

    const updated = (await call("PUT", `/exit-nodes/${created.id}`, {
      ...created,
      enabled: false,
    })) as ExitNode;
    expect(updated.enabled).toBe(false);

    await call("DELETE", `/exit-nodes/${created.id}`);
    await expect(
      call("GET", `/exit-nodes/${created.id}`),
    ).rejects.toMatchObject({ code: 404 });
  });

  it("rejects invalid exit nodes like the API would", async () => {
    await expect(
      call("POST", "/exit-nodes", {
        name: "EU Egress",
        description: "",
        enabled: true,
        auto_apply: true,
        peers: [{ peer_id: "x", metric: 100, enabled: true }],
      }),
    ).rejects.toMatchObject({ code: 409 });
    await expect(call("GET", "/exit-nodes/a/b")).rejects.toMatchObject({
      code: 404,
    });
  });

  it("keeps policies to exit nodes and merges them into GET /policies", async () => {
    const [eu] = (await call("GET", "/exit-nodes")) as ExitNode[];
    const created = (await call(
      "POST",
      "/policies",
      exitPolicy(eu.id, "New Access"),
    )) as Policy;
    expect(created.id).toBeTruthy();
    // Groups come back as objects, like the API returns them.
    expect(created.rules[0].sources).toEqual([
      expect.objectContaining({ id: "eng", name: "Engineering" }),
    ]);

    const list = (await call("GET", "/policies")) as Policy[];
    expect(list[0]).toEqual(realPolicy);
    expect(list.map((p) => p.name)).toContain("New Access");

    expect(await call("GET", `/policies/${created.id}`)).toMatchObject({
      name: "New Access",
    });
  });

  it("updates and deletes its own policies without the real API", async () => {
    const [eu] = (await call("GET", "/exit-nodes")) as ExitNode[];
    const created = (await call(
      "POST",
      "/policies",
      exitPolicy(eu.id),
    )) as Policy;
    api.mockClear();

    const updated = (await call("PUT", `/policies/${created.id}`, {
      ...exitPolicy(eu.id, "Renamed"),
      enabled: false,
    })) as Policy;
    expect(updated).toMatchObject({ name: "Renamed", enabled: false });

    await call("DELETE", `/policies/${created.id}`);
    expect(api.mock.calls.some(([m]) => m !== "GET")).toBe(false);
    const list = (await call("GET", "/policies")) as Policy[];
    expect(list.some((p) => p.id === created.id)).toBe(false);
  });

  it("hands a policy to the real API once it no longer targets an exit node", async () => {
    const [eu] = (await call("GET", "/exit-nodes")) as ExitNode[];
    const created = (await call(
      "POST",
      "/policies",
      exitPolicy(eu.id),
    )) as Policy;
    const result = await call("PUT", `/policies/${created.id}`, realPolicy);
    expect(result).toEqual({ id: "real-new" });
    expect(api).toHaveBeenCalledWith("POST", "/policies", realPolicy);
    expect(mock.store.hasPolicy(created.id as string)).toBe(false);
  });

  it("shadows a real policy that is changed to target an exit node", async () => {
    const [eu] = (await call("GET", "/exit-nodes")) as ExitNode[];
    await call("PUT", "/policies/real-1", exitPolicy(eu.id, "Now exit"));
    const list = (await call("GET", "/policies")) as Policy[];
    expect(list.filter((p) => p.id === "real-1")).toEqual([
      expect.objectContaining({ name: "Now exit" }),
    ]);

    await call("DELETE", "/policies/real-1");
    // Deleted in the real API too.
    expect(api).toHaveBeenCalledWith("DELETE", "/policies/real-1", undefined);
  });

  it("deletes an exit node's policies with it", async () => {
    const [eu] = (await call("GET", "/exit-nodes")) as ExitNode[];
    await call("DELETE", `/exit-nodes/${eu.id}`);
    const list = (await call("GET", "/policies")) as Policy[];
    expect(list.some((p) => p.rules[0].destinationResource?.id === eu.id)).toBe(
      false,
    );
  });

  it("starts over after a reset", async () => {
    await call("DELETE", "/exit-nodes/exit-node-seed-1");
    mock.reset();
    const nodes = (await call("GET", "/exit-nodes")) as ExitNode[];
    expect(nodes).toHaveLength(3);
  });
});
