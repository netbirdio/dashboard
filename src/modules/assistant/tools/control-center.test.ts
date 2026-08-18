import { beforeEach, describe, expect, it, vi } from "vitest";
import { describeControlCenterTool } from "@/modules/assistant/chat/AssistantToolActivity";
import {
  CONTROL_CENTER_HREF,
  type ControlCenterContext,
  runControlCenterTool,
} from "@/modules/assistant/tools/control-center-call-tool";
import { Redactor } from "@/modules/assistant/utils/redaction";
import { ASSISTANT_TOOLS } from "@/modules/assistant/utils/tools";
import {
  AgentCanvasSnapshot,
  CanvasAgentApi,
  registerCanvasAgent,
} from "@/modules/control-center/agent/canvasAgentStore";

// Mirrors the runtime executor's dispatch: registry lookup, then the action.
const executeControlCenterTool = (
  name: string,
  rawInput: unknown,
  context: ControlCenterContext,
) => {
  const tool = ASSISTANT_TOOLS[name];
  if (tool?.kind !== "control-center")
    throw new Error(`not a control-center tool: ${name}`);
  return runControlCenterTool(tool.action, rawInput, context);
};

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
    {
      nodeId: "peer-new-2",
      kind: "peer",
      label: "build-01",
      labelIsPersonal: false,
      placeholder: "server",
      enabled: true,
      can: { rename: true, remove: true, delete: false },
    },
  ],
  edges: [{ from: "peer-real-1", to: "group-new-abc" }],
  changes: [{ type: "create-group", name: "Build Servers" }],
};

function fakeApi(overrides: Partial<CanvasAgentApi> = {}): CanvasAgentApi {
  return {
    snapshot: () => SNAPSHOT,
    drainNotices: vi.fn(() => []),
    navigate: vi.fn(async () => ({
      ok: true,
      detail: "Opened the peers view.",
    })),
    draft: vi.fn(async () => ({
      ok: true,
      detail: "Started a new empty draft.",
    })),
    add: vi.fn(async () => [
      { ok: true, detail: "Added a server placeholder.", nodeId: "peer-new-2" },
    ]),
    connect: vi.fn(async () => [
      { ok: true, detail: "Connected peer-real-1 → “Build Servers”." },
    ]),
    node: vi.fn(async () => [{ ok: true, detail: "Renamed the placeholder." }]),
    policy: vi.fn(async () => ({
      ok: true,
      detail: "Updated policy “Build access”.",
    })),
    canvas: vi.fn(async () => ({ ok: true, detail: "Zoomed in." })),
    ...overrides,
  };
}

const context = (
  navigate = vi.fn(),
  redactor = new Redactor(),
): ControlCenterContext => ({
  redactor,
  navigate,
  onControlCenterPage: true,
});

describe("control-center tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("claims exactly the cc_ tools", () => {
    expect(ASSISTANT_TOOLS["cc_add"]?.kind).toBe("control-center");
    expect(ASSISTANT_TOOLS["list_peers"]?.kind).toBe("management");
  });

  it("redacts the canvas: ids become tokens, personal labels are dropped", async () => {
    registerCanvasAgent(fakeApi());

    const { content } = await executeControlCenterTool(
      "cc_state",
      {},
      context(),
    );

    const parsed = JSON.parse(content);
    // A peer's name is personal: no `name`, and its entity rides as a token.
    expect(parsed.nodes[0]).toMatchObject({
      id: "[NODE_1]",
      kind: "peer",
      entity: "[PEER_1]",
    });
    expect(parsed.nodes[0].name).toBeUndefined();
    // An admin-chosen label passes through as written.
    expect(parsed.nodes[1]).toMatchObject({
      id: "[NODE_2]",
      name: "Build Servers",
    });
    expect(parsed.edges).toEqual([{ from: "[NODE_1]", to: "[NODE_2]" }]);
    for (const real of ["peer-real-1", "eduards-macbook", "peer-id-1"]) {
      expect(content).not.toContain(real);
    }
  });

  it("resolves the model's tokens back to canvas ids, restoring prose", async () => {
    const api = fakeApi();
    registerCanvasAgent(api);
    const redactor = new Redactor();
    // The model learned the canvas through cc_state, so its follow-up call
    // references nodes by token — and writes tokens into names it drafts.
    await executeControlCenterTool("cc_state", {}, context(vi.fn(), redactor));

    await executeControlCenterTool(
      "cc_node",
      { node: "[NODE_1]", action: "rename", name: "Machine of [PEER_1]" },
      context(vi.fn(), redactor),
    );

    expect(api.node).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          node: "peer-real-1",
          name: "Machine of eduards-macbook",
        }),
      ],
      false,
    );
  });

  it("passes inputs to the canvas unchanged", async () => {
    const api = fakeApi();
    registerCanvasAgent(api);

    await executeControlCenterTool(
      "cc_connect",
      { from: "peer-real-1", to: "group-new-abc" },
      context(),
    );

    expect(api.connect).toHaveBeenCalledWith(
      [{ from: "peer-real-1", to: "group-new-abc" }],
      false,
    );
  });

  it("passes every field a node action needs, `network` included", async () => {
    const api = fakeApi();
    registerCanvasAgent(api);

    // The action maps the input field by field, so a forgotten field is one the
    // model can't use — route_network once arrived with its network dropped.
    await executeControlCenterTool(
      "cc_node",
      {
        node: "peer-real-1",
        action: "route_network",
        network: "network-new-office",
      },
      context(),
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

  it("passes a new group's initial members through", async () => {
    const api = fakeApi();
    registerCanvasAgent(api);

    await executeControlCenterTool(
      "cc_add",
      {
        kind: "new_group",
        name: "Databases",
        members: ["resource-new-1", "peer-id-9"],
      },
      context(),
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

  it("reports a created node's token so the next call can connect it", async () => {
    registerCanvasAgent(fakeApi());

    const { content } = await executeControlCenterTool(
      "cc_add",
      { kind: "server", name: "build-01" },
      context(),
    );

    // The snapshot's third node is the created one → [NODE_3], never the raw id.
    expect(JSON.parse(content).steps[0]).toContain("([NODE_3])");
    expect(content).not.toContain("peer-new-2");
  });

  it("still accepts a batched list, applied in order", async () => {
    const api = fakeApi();
    registerCanvasAgent(api);

    await executeControlCenterTool(
      "cc_add",
      { items: [{ kind: "server" }, { kind: "new_policy" }] },
      context(),
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

    const { content } = await executeControlCenterTool(
      "cc_policy",
      {
        node: "group-new-abc",
        name: "Build access",
        description: "CI runners reach the build fleet",
        protocol: "tcp",
        ports: ["443", 8080],
      },
      context(),
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

    const noKind = await executeControlCenterTool("cc_add", {}, context());
    const noNode = await executeControlCenterTool(
      "cc_policy",
      { name: "x" },
      context(),
    );

    expect(noKind.isError).toBe(true);
    expect(noNode.isError).toBe(true);
  });

  it("arranges once when the caller says it is finished", async () => {
    const api = fakeApi();
    registerCanvasAgent(api);

    await executeControlCenterTool(
      "cc_add",
      { kind: "new_policy", final: true },
      context(),
    );
    await executeControlCenterTool(
      "cc_connect",
      { from: "peer-real-1", to: "group-new-abc" },
      context(),
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
          .mockReturnValueOnce([
            "Auto-arranged the canvas and fitted the view.",
          ])
          .mockReturnValue([]),
      }),
    );

    const { content } = await executeControlCenterTool(
      "cc_connect",
      { from: "peer-real-1", to: "group-new-abc" },
      context(),
    );

    const steps = JSON.parse(content).steps as string[];
    expect(steps[0]).toContain("Auto-arranged");
    // The notice is not renumbered into the step list.
    expect(steps[0]).not.toMatch(/^\d+\./);
    expect(steps[1]).toContain("Connected");
  });

  // Longer than the bridge's own registration wait, which this test rides out.
  it(
    "navigates to the control center when it isn't mounted",
    { timeout: 15_000 },
    async () => {
      registerCanvasAgent(fakeApi())();
      const navigate = vi.fn();

      const outcome = await executeControlCenterTool(
        "cc_state",
        {},
        {
          redactor: new Redactor(),
          navigate,
          onControlCenterPage: false,
        },
      );

      expect(navigate).toHaveBeenCalledWith(CONTROL_CENTER_HREF);
      // Nothing registered within the wait, so the model is told rather than hung.
      expect(outcome.isError).toBe(true);
    },
  );

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
      context(),
    );

    expect(outcome.isError).toBe(true);
    expect(outcome.content).toContain("draft mode");
  });
});

describe("describeControlCenterTool", () => {
  it("lets the draft action own the whole phrase", () => {
    // It used to read "Set up a draft 'new_empty'" — and, worse, "Set up a
    // draft 'Leave Draft'", which says the opposite of what happened.
    expect(
      describeControlCenterTool("cc_draft", { action: "new_empty" }),
    ).toEqual({
      label: "Start an empty draft",
    });
    expect(describeControlCenterTool("cc_draft", { action: "exit" })).toEqual({
      label: "Leave the draft",
    });
    expect(
      describeControlCenterTool("cc_draft", { action: "from_current_view" }),
    ).toEqual({ label: "Start a draft from this view" });

    // An action we don't have a phrase for still reads as words, not an enum.
    expect(
      describeControlCenterTool("cc_draft", { action: "some_future_mode" }),
    ).toEqual({
      label: "Set up a draft",
      detail: "'Some Future Mode'",
    });
  });

  it("names what was added, preferring the name over the kind", () => {
    expect(
      describeControlCenterTool("cc_add", {
        kind: "server",
        name: "Minecraft Server",
      }),
    ).toEqual({ label: "Add to draft", detail: "'Minecraft Server'" });

    // Unnamed placeholder — the kind, humanised.
    expect(
      describeControlCenterTool("cc_add", { kind: "user_device" }),
    ).toEqual({
      label: "Add to draft",
      detail: "'User Device'",
    });
  });

  it("shows both ends of a connection", () => {
    expect(
      describeControlCenterTool("cc_connect", {
        from: "Players",
        to: "Access",
      }),
    ).toEqual({ label: "Connect", detail: "'Players' to 'Access'" });
  });

  it("takes its verb from the node action", () => {
    expect(
      describeControlCenterTool("cc_node", {
        node: "Group (2)",
        action: "rename",
        name: "Players",
      }),
    ).toEqual({ label: "Rename", detail: "'Group (2)' to 'Players'" });

    expect(
      describeControlCenterTool("cc_node", {
        node: "Group (2)",
        action: "remove",
      }),
    ).toEqual({ label: "Remove", detail: "'Group (2)'" });

    // A move's coordinates aren't a "to" worth printing.
    expect(
      describeControlCenterTool("cc_node", {
        node: "Group (2)",
        action: "move",
        position: { x: 0, y: 0 },
      }),
    ).toEqual({ label: "Move", detail: "'Group (2)'" });
  });

  it("names the policy it edits, and the camera move it makes", () => {
    expect(describeControlCenterTool("cc_policy", { node: "Access" })).toEqual({
      label: "Edit policy",
      detail: "'Access'",
    });
    expect(
      describeControlCenterTool("cc_canvas", { action: "fit_view" }),
    ).toEqual({
      label: "Fit the view",
    });
  });

  it("reads the first entry of a batched list", () => {
    expect(
      describeControlCenterTool("cc_add", {
        items: [{ kind: "agent", name: "Runner" }],
      }),
    ).toEqual({ label: "Add to draft", detail: "'Runner'" });
  });
});
