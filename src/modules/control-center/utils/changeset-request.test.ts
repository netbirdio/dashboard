import { describe, expect, it, vi } from "vitest";
import { Policy } from "@/interfaces/Policy";
import {
  CreateGroupChange,
  CreatePolicyChange,
  CreateResourceChange,
  DeletePolicyChange,
  InstallPeerChange,
  UpdateGroupChange,
  UpdatePolicyChange,
} from "@/modules/control-center/draft/DraftChangesetContext";
import {
  buildBeforeRequest,
  buildChangeRequest,
  changeDiffLines,
  LiveData,
  toCurl,
} from "./changeset-request";

// The real config loader needs Next build-time files the unit env lacks.
vi.mock("@utils/config", () => ({
  default: () => ({ apiOrigin: "https://api.netbird.io" }),
}));

const policy = (over: Partial<Policy> = {}): Policy => ({
  name: "P",
  description: "",
  enabled: true,
  rules: [
    {
      name: "P",
      description: "",
      enabled: true,
      sources: [{ id: "g1", name: "Servers" }],
      destinations: [{ id: "g2", name: "Admins" }],
      bidirectional: true,
      action: "accept",
      protocol: "tcp",
      ports: ["443"],
    },
  ],
  source_posture_checks: [],
  ...over,
});

describe("buildChangeRequest", () => {
  it("create-policy → POST /policies with groups resolved to ids", () => {
    const change: CreatePolicyChange = {
      id: "c1",
      type: "create-policy",
      clientId: "new-1",
      name: "P",
      policy: policy(),
    };
    const req = buildChangeRequest(change);
    expect(req?.method).toBe("POST");
    expect(req?.path).toBe("/policies");
    const body = req?.body as any;
    expect(body.name).toBe("P");
    expect(body.rules[0].sources).toEqual(["g1"]);
    expect(body.rules[0].destinations).toEqual(["g2"]);
    expect(body.rules[0].ports).toEqual(["443"]);
  });

  it("create-group → POST /groups filters draft-only members", () => {
    const change: CreateGroupChange = {
      id: "c2",
      type: "create-group",
      clientId: "group-new-1",
      name: "G",
      peerIds: ["p1", "draft-x"],
      resourceIds: ["r1", "new-y"],
    };
    const body = buildChangeRequest(change)?.body as any;
    expect(body.peers).toEqual(["p1"]);
    // Bare id strings are rejected by the API.
    expect(body.resources).toEqual([{ id: "r1", type: undefined }]);
  });

  it("SSH authorized_groups keys resolve to ids deploy sends, not names", () => {
    const change: CreatePolicyChange = {
      id: "c5",
      type: "create-policy",
      clientId: "new-2",
      name: "SSH",
      policy: policy({
        rules: [
          {
            name: "SSH",
            description: "",
            enabled: true,
            sources: [{ id: "g1", name: "Servers" }],
            destinations: [{ id: "g2", name: "Admins" }],
            bidirectional: true,
            action: "accept",
            protocol: "netbird-ssh",
            ports: [],
            authorized_groups: { Admins: ["root"] },
          },
        ],
      }),
    };
    const live = { groups: [{ id: "grp-123", name: "Admins" }] };
    const body = buildChangeRequest(change, live)?.body as any;
    // Draft keys authorized_groups by NAME; deploy sends the id.
    expect(body.rules[0].authorized_groups).toEqual({ "grp-123": ["root"] });
    expect(body.rules[0].ports).toEqual(["22"]);
  });

  it("delete-policy → DELETE with no body", () => {
    const change: DeletePolicyChange = {
      id: "c3",
      type: "delete-policy",
      policyId: "pol1",
      name: "P",
    };
    const req = buildChangeRequest(change);
    expect(req).toEqual({ method: "DELETE", path: "/policies/pol1" });
    expect(req && "body" in req && req.body).toBeFalsy();
  });

  it("update-group → PUT merges current members with draft add/remove", () => {
    const change: UpdateGroupChange = {
      id: "c4",
      type: "update-group",
      groupId: "g1",
      name: "Servers",
      originalName: "Servers",
      peerIds: ["p2"],
      resourceIds: [],
      removedPeerIds: ["p0"],
    };
    const live = {
      groups: [
        {
          id: "g1",
          name: "Servers",
          peers: [
            { id: "p0", name: "old" },
            { id: "p9", name: "keep" },
          ],
        },
      ],
    };
    const body = buildChangeRequest(change, live)?.body as any;
    expect(new Set(body.peers)).toEqual(new Set(["p9", "p2"]));
    expect(body.peers).not.toContain("p0");
  });
});

describe("buildBeforeRequest", () => {
  it("reconstructs the live policy as the diff's before side", () => {
    const change: UpdatePolicyChange = {
      id: "u1",
      type: "update-policy",
      policyId: "pol1",
      name: "P",
      origin: "edit",
      policy: policy({ enabled: false }),
    };
    const live = { policies: [{ ...policy(), id: "pol1" }] };
    const before = buildBeforeRequest(change, live);
    expect(before?.method).toBe("PUT");
    expect(before?.path).toBe("/policies/pol1");
    // Live value, not the draft's false.
    expect((before?.body as any).enabled).toBe(true);
  });

  it("degrades to no body (never throws) for a rule-less live policy", () => {
    const change: UpdatePolicyChange = {
      id: "u2",
      type: "update-policy",
      policyId: "pol9",
      name: "P",
      origin: "edit",
      policy: policy(),
    };
    const live = { policies: [{ name: "P", id: "pol9", rules: [] } as any] };
    const before = buildBeforeRequest(change, live);
    expect(before?.method).toBe("PUT");
    expect(before?.body).toBeUndefined();
  });

  it("renders an update-group's resources in the same wire shape as the after side", () => {
    const change: UpdateGroupChange = {
      id: "u3",
      type: "update-group",
      groupId: "g1",
      name: "Servers",
      originalName: "Servers",
      peerIds: [],
      resourceIds: [],
    };
    const live: LiveData = {
      groups: [
        {
          id: "g1",
          name: "Servers",
          // A bare id string is tolerated alongside object members.
          resources: [{ id: "res1", type: "host" }, "res2" as any],
        },
      ],
      networkResources: [{ id: "res2", name: "db", type: "subnet" } as any],
    };
    const before = buildBeforeRequest(change, live);
    expect((before?.body as any).resources).toEqual([
      { id: "res1", type: "host" },
      { id: "res2", type: "subnet" },
    ]);
  });

  it("returns null for a create (nothing exists yet)", () => {
    const change: CreatePolicyChange = {
      id: "c1",
      type: "create-policy",
      clientId: "new-1",
      name: "P",
      policy: policy(),
    };
    expect(buildBeforeRequest(change, {})).toBeNull();
  });
});

describe("changeDiffLines", () => {
  it("an unchanged resource member produces no resource diff lines", () => {
    const change: UpdateGroupChange = {
      id: "d1",
      type: "update-group",
      groupId: "g1",
      name: "Servers",
      originalName: "Servers",
      peerIds: ["p2"],
      resourceIds: [],
    };
    const live: LiveData = {
      groups: [
        {
          id: "g1",
          name: "Servers",
          peers: [{ id: "p9", name: "keep" }],
          resources: [{ id: "res1", type: "host" }],
        },
      ],
      networkResources: [{ id: "res1", name: "db", type: "host" } as any],
    };
    const changed = changeDiffLines(change, live)
      .filter((l) => l.kind !== "context")
      .map((l) => l.text)
      .join("\n");
    // Membership the draft never touched must not show as a remove plus add.
    expect(changed).toContain("p2");
    expect(changed).not.toContain("res1");
    expect(changed).not.toContain("host");
  });
});

describe("toCurl", () => {
  it("escapes apostrophes so the single-quoted body stays pasteable", () => {
    const change: CreateGroupChange = {
      id: "c9",
      type: "create-group",
      clientId: "group-new-9",
      name: "Eduard's Devices",
      peerIds: [],
      resourceIds: [],
    };
    const curl = toCurl(buildChangeRequest(change));
    expect(curl).toContain(`Eduard'\\''s Devices`);
    // A bare apostrophe would close the -d payload early.
    expect(curl).not.toContain(`Eduard's`);
  });
});

describe("id placeholders in preview", () => {
  it("a draft group (no id) in a policy renders as a {..._group_id} token", () => {
    const change: CreatePolicyChange = {
      id: "c1",
      type: "create-policy",
      clientId: "new-1",
      name: "P",
      policy: policy({
        rules: [
          {
            name: "P",
            description: "",
            enabled: true,
            // Draft group: no id yet.
            sources: [{ name: "Sales Team" }],
            destinations: [{ id: "g2", name: "Admins" }],
            bidirectional: true,
            action: "accept",
            protocol: "tcp",
            ports: ["443"],
          },
        ],
      }),
    };
    const body = buildChangeRequest(change)?.body as any;
    expect(body.rules[0].sources).toEqual(["{sales_team_group_id}"]);
    expect(body.rules[0].destinations).toEqual(["g2"]);
  });

  it("a draft resource's group refs: draft names → placeholder, live ids kept", () => {
    const change: CreateResourceChange = {
      id: "r1",
      type: "create-resource",
      clientId: "new-r1",
      name: "db",
      address: "10.0.0.1",
      networkId: "n1",
      networkName: "Office",
      groupIds: ["Marketing", "grp-live"],
    };
    const live: LiveData = { groups: [{ id: "grp-live", name: "Ops" }] };
    const body = buildChangeRequest(change, live)?.body as any;
    expect(body.groups).toEqual(["{marketing_group_id}", "grp-live"]);
  });

  it("a policy referencing a not-yet-created resource shows {..._resource_id}", () => {
    const change: CreatePolicyChange = {
      id: "c2",
      type: "create-policy",
      clientId: "new-2",
      name: "P",
      policy: policy({
        rules: [
          {
            name: "P",
            description: "",
            enabled: true,
            sources: [{ id: "g1", name: "Servers" }],
            destinations: [],
            destinationResource: { id: "new-res9", type: "host" },
            bidirectional: true,
            action: "accept",
            protocol: "tcp",
            ports: ["443"],
          },
        ],
      }),
    };
    const live: LiveData = {
      draftChanges: [
        {
          id: "x",
          type: "create-resource",
          clientId: "new-res9",
          name: "Database",
          address: "10.0.0.9",
          networkName: "Office",
          groupIds: [],
        },
      ],
    };
    const body = buildChangeRequest(change, live)?.body as any;
    expect(body.rules[0].destinationResource).toEqual({
      id: "{database_resource_id}",
      type: "host",
    });
  });

  it("a server install-peer's auto_group renders as a {..._group_id} placeholder", () => {
    const change: InstallPeerChange = {
      id: "i1",
      type: "install-peer",
      clientId: "draft-abc",
      name: "Server",
      kind: "server",
    };
    const body = buildChangeRequest(change)?.body as any;
    expect(body.auto_groups).toEqual(["{server_group_id}"]);
  });
});
