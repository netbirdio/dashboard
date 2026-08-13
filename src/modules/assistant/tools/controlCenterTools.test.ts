import { beforeEach, describe, expect, it, vi } from "vitest";
import { Redactor } from "../privacy/redaction";
import {
  AgentCanvasSnapshot,
  CanvasAgentApi,
  registerCanvasAgent,
} from "@/modules/control-center/agent/canvasAgentStore";
import {
  CONTROL_CENTER_HREF,
  executeControlCenterTool,
  isControlCenterTool,
} from "./controlCenterTools";

const SNAPSHOT: AgentCanvasSnapshot = {
  mode: "draft",
  view: "peers",
  startedBlank: false,
  nodes: [
    {
      nodeId: "peer-real-1",
      kind: "peer",
      label: "eduards-macbook",
      labelIsPersonal: true,
      entity: { kind: "peer", id: "peer-id-1" },
      enabled: true,
      can: { rename: false, remove: true, delete: false },
    },
    {
      nodeId: "group-new-abc",
      kind: "group",
      label: "Build Servers",
      labelIsPersonal: false,
      enabled: true,
      can: { rename: true, remove: true, delete: true },
    },
  ],
  edges: [{ from: "peer-real-1", to: "group-new-abc" }],
  changes: [{ type: "create-group", name: "Build Servers" }],
};

function fakeApi(overrides: Partial<CanvasAgentApi> = {}): CanvasAgentApi {
  return {
    snapshot: () => SNAPSHOT,
    drainNotices: vi.fn(() => []),
    navigate: vi.fn(async () => ({ ok: true, detail: "Opened the peers view." })),
    draft: vi.fn(async () => ({ ok: true, detail: "Started a new empty draft." })),
    add: vi.fn(async () => [
      { ok: true, detail: "Added a server placeholder.", nodeId: "peer-real-1" },
    ]),
    connect: vi.fn(async () => [
      { ok: true, detail: "Connected peer-real-1 → “Build Servers”." },
    ]),
    node: vi.fn(async () => [{ ok: true, detail: "Renamed the placeholder." }]),
    policy: vi.fn(async () => ({ ok: true, detail: "Updated policy “Build access”." })),
    canvas: vi.fn(async () => ({ ok: true, detail: "Zoomed in." })),
    ...overrides,
  };
}

const context = (redactor: Redactor, navigate = vi.fn()) => ({
  redactor,
  navigate,
  onControlCenterPage: true,
});

describe("control-center tools", () => {
  let redactor: Redactor;

  beforeEach(() => {
    redactor = new Redactor();
  });

  it("claims exactly the cc_ tools", () => {
    expect(isControlCenterTool("cc_add")).toBe(true);
    expect(isControlCenterTool("list_peers")).toBe(false);
  });

  it("hides a peer's name but exposes admin labels and entity tokens", async () => {
    registerCanvasAgent(fakeApi());

    const { content } = await executeControlCenterTool(
      "cc_state",
      {},
      context(redactor),
    );

    expect(content).not.toContain("eduards-macbook");
    expect(content).not.toContain("peer-real-1");
    expect(content).not.toContain("peer-id-1");
    // Admin-chosen labels are readable; the peer is only its tokens.
    expect(content).toContain("Build Servers");
    const parsed = JSON.parse(content);
    expect(parsed.nodes[0]).toMatchObject({
      id: "{NODE_1}",
      kind: "peer",
      entity: "{PEER_1}",
    });
    expect(parsed.nodes[0].name).toBeUndefined();
    expect(parsed.edges).toEqual([{ from: "{NODE_1}", to: "{NODE_2}" }]);
    // Same real peer, same token as an ordinary tool result would mint.
    expect(redactor.resolve("{PEER_1}")).toBe("peer-id-1");
    expect(redactor.resolve("{NODE_1}")).toBe("peer-real-1");
  });

  it("tokenises canvas ids inside step details", async () => {
    const api = fakeApi();
    registerCanvasAgent(api);
    // Mint the node tokens first, the way a cc_state call would.
    await executeControlCenterTool("cc_state", {}, context(redactor));

    const { content } = await executeControlCenterTool(
      "cc_connect",
      { from: "{NODE_1}", to: "{NODE_2}" },
      context(redactor),
    );

    expect(content).not.toContain("peer-real-1");
    expect(JSON.parse(content).steps[0]).toContain("{NODE_1}");
    // The model's placeholders reached the canvas as real ids.
    expect(api.connect).toHaveBeenCalledWith(
      [{ from: "peer-real-1", to: "group-new-abc" }],
      false,
    );
  });

  it("resolves placeholders nested inside a batch", async () => {
    const api = fakeApi();
    registerCanvasAgent(api);
    const peerToken = redactor.handle("peer", "peer-id-9", "someones-laptop");

    await executeControlCenterTool(
      "cc_add",
      { kind: "existing_peer", ref: peerToken },
      context(redactor),
    );

    expect(api.add).toHaveBeenCalledWith(
      [expect.objectContaining({ kind: "existing_peer", ref: "peer-id-9" })],
      false,
    );
  });

  it("passes every field a node action needs, `network` included", async () => {
    const api = fakeApi();
    registerCanvasAgent(api);

    // The executor maps this input field by field, so a field it forgets is a
    // field the model can't use: route_network arrived with no network and failed
    // as "(no network) isn't a network frame".
    await executeControlCenterTool(
      "cc_node",
      {
        node: "peer-real-1",
        action: "route_network",
        network: "network-new-office",
      },
      context(redactor),
    );

    expect(api.node).toHaveBeenCalledWith(
      [
        {
          node: "peer-real-1",
          action: "route_network",
          network: "network-new-office",
          name: undefined,
          group: undefined,
          position: undefined,
        },
      ],
      false,
    );
  });

  it("resolves a new group's initial members to real ids", async () => {
    const api = fakeApi();
    registerCanvasAgent(api);
    const nodeToken = redactor.handle("node", "resource-new-1", "Postgres DB");
    const peerToken = redactor.handle("peer", "peer-id-9", "db-host");

    await executeControlCenterTool(
      "cc_add",
      { kind: "new_group", name: "Databases", members: [nodeToken, peerToken] },
      context(redactor),
    );

    expect(api.add).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          kind: "new_group",
          name: "Databases",
          members: ["resource-new-1", "peer-id-9"],
        }),
      ],
      false,
    );
  });

  it("writes placeholders out of names and descriptions", async () => {
    const api = fakeApi();
    registerCanvasAgent(api);
    // The model only ever saw a token for this peer, so it writes one into prose.
    redactor.handle("peer", "peer-id-4", "minecraft-host");

    await executeControlCenterTool(
      "cc_add",
      {
        kind: "new_policy",
        name: "Colleagues to {PEER_1}",
        description: "Lets colleagues reach {PEER_1} over TCP.",
      },
      context(redactor),
    );

    // It used to ship as a policy literally called "Colleagues to {PEER_1}".
    expect(api.add).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          name: "Colleagues to minecraft-host",
          description: "Lets colleagues reach minecraft-host over TCP.",
        }),
      ],
      false,
    );
  });

  it("still resolves a field that is only a placeholder to the real id", async () => {
    const api = fakeApi();
    registerCanvasAgent(api);
    const token = redactor.handle("group", "group-id-7", "Colleagues");

    await executeControlCenterTool(
      "cc_add",
      { kind: "existing_group", ref: token },
      context(redactor),
    );

    // A reference resolves to the id, not to the display name.
    expect(api.add).toHaveBeenCalledWith(
      [expect.objectContaining({ ref: "group-id-7" })],
      false,
    );
  });

  it("reports a created node's handle so the next call can connect it", async () => {
    registerCanvasAgent(fakeApi());

    const { content } = await executeControlCenterTool(
      "cc_add",
      { kind: "server", name: "build-01" },
      context(redactor),
    );

    expect(JSON.parse(content).steps[0]).toContain("{NODE_1}");
  });

  it("still accepts a batched list, applied in order", async () => {
    const api = fakeApi();
    registerCanvasAgent(api);

    await executeControlCenterTool(
      "cc_add",
      { items: [{ kind: "server" }, { kind: "new_policy" }] },
      context(redactor),
    );

    expect(api.add).toHaveBeenCalledWith(
      [
        expect.objectContaining({ kind: "server" }),
        expect.objectContaining({ kind: "new_policy" }),
      ],
      false,
    );
  });

  it("passes a policy edit through, ports included", async () => {
    const api = fakeApi();
    registerCanvasAgent(api);
    await executeControlCenterTool("cc_state", {}, context(redactor));

    const { content } = await executeControlCenterTool(
      "cc_policy",
      {
        node: "{NODE_2}",
        name: "Build access",
        description: "CI runners reach the build fleet",
        protocol: "tcp",
        ports: ["443", 8080],
      },
      context(redactor),
    );

    expect(api.policy).toHaveBeenCalledWith(
      expect.objectContaining({
        node: "group-new-abc",
        name: "Build access",
        description: "CI runners reach the build fleet",
        protocol: "tcp",
        ports: ["443", "8080"],
      }),
      false,
    );
    expect(JSON.parse(content).steps[0]).toContain("Build access");
  });

  it("rejects an add with no kind and a policy edit with no node", async () => {
    registerCanvasAgent(fakeApi());

    const noKind = await executeControlCenterTool("cc_add", {}, context(redactor));
    const noNode = await executeControlCenterTool("cc_policy", { name: "x" }, context(redactor));

    expect(noKind.isError).toBe(true);
    expect(noNode.isError).toBe(true);
  });

  it("arranges once when the caller says it is finished", async () => {
    const api = fakeApi();
    registerCanvasAgent(api);

    await executeControlCenterTool(
      "cc_add",
      { kind: "new_policy", final: true },
      context(redactor),
    );
    await executeControlCenterTool(
      "cc_connect",
      { from: "{NODE_1}", to: "{NODE_2}" },
      context(redactor),
    );

    // The flag rides through to the canvas, which arranges there instead of on
    // the idle timer; an unflagged call leaves it to settle.
    expect(api.add).toHaveBeenCalledWith(expect.any(Array), true);
    expect(api.connect).toHaveBeenCalledWith(expect.any(Array), false);
  });

  it("reports what the canvas did on its own, before the step that follows", async () => {
    registerCanvasAgent(
      fakeApi({
        // The debounced arrange lands after the step that triggered it has
        // already reported, so it rides along with the next one.
        drainNotices: vi
          .fn()
          .mockReturnValueOnce(["Auto-arranged the canvas and fitted the view."])
          .mockReturnValue([]),
      }),
    );

    const { content } = await executeControlCenterTool(
      "cc_connect",
      { from: "{NODE_1}", to: "{NODE_2}" },
      context(redactor),
    );

    const steps = JSON.parse(content).steps as string[];
    expect(steps[0]).toContain("Auto-arranged");
    // The notice precedes the step it was reported with, and is not renumbered
    // into the step list.
    expect(steps[0]).not.toMatch(/^\d+\./);
    expect(steps[1]).toContain("Connected");
  });

  // Longer than the bridge's own registration wait, which this test rides out.
  it("navigates to the control center when it isn't mounted", { timeout: 15_000 }, async () => {
    registerCanvasAgent(fakeApi())();
    const navigate = vi.fn();

    const outcome = await executeControlCenterTool("cc_state", {}, {
      redactor,
      navigate,
      onControlCenterPage: false,
    });

    expect(navigate).toHaveBeenCalledWith(CONTROL_CENTER_HREF);
    // Nothing registered within the wait, so the model is told rather than hung.
    expect(outcome.isError).toBe(true);
  });

  it("marks a batch that failed outright as an error", async () => {
    registerCanvasAgent(
      fakeApi({
        add: vi.fn(async () => [
          { ok: false, detail: "Only possible in draft mode." },
        ]),
      }),
    );

    const outcome = await executeControlCenterTool(
      "cc_add",
      { kind: "new_policy" },
      context(redactor),
    );

    expect(outcome.isError).toBe(true);
    expect(outcome.content).toContain("draft mode");
  });
});
