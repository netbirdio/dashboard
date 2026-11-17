import { describe, expect, it, vi } from "vitest";
import type { AgentAddItem, CanvasAgentApi } from "./canvas";
import {
  ACTIVITY_LINGER_MS,
  agentActivityStore,
  agentTurnGeneration,
  beginAgentActivity,
  beginAgentTurn,
} from "./canvas";
import { addNode, connectNodes, createDraft, editPolicy, gotoView, MAX_BATCH, parsePorts } from "./control-center";

const fakeApi = () => {
  const addNodes = vi.fn(async (items: AgentAddItem[]) => items.map(() => ({ ok: true, detail: "Added." })));
  const step = vi.fn(async () => ({ ok: true, detail: "Done." }));
  const steps = vi.fn(async (list: unknown[]) => list.map(() => ({ ok: true, detail: "Done." })));
  const api = {
    addNodes,
    connectNodes: steps,
    editPolicy: step,
    goToView: step,
    draftAction: step,
    drainNotices: () => [],
    getSnapshot: () => ({ mode: "draft", view: "peers", nodes: [], edges: [], changes: [] }),
  } as unknown as CanvasAgentApi;
  return { api, addNodes, step, steps };
};

describe("control_center_add", () => {
  it("passes a new policy's protocol and ports through to the canvas", async () => {
    const { api, addNodes } = fakeApi();
    await addNode({ kind: "new_policy", name: "Devs to web", protocol: "tcp", ports: ["443"], bidirectional: false }, api);
    expect(addNodes.mock.calls[0][0][0]).toMatchObject({ kind: "new_policy", protocol: "tcp", ports: ["443"], bidirectional: false });
  });

  it("refuses a new policy without a protocol, before anything is drawn", async () => {
    const { api, addNodes } = fakeApi();
    const outcome = await addNode({ items: [{ kind: "existing_group", ref: "g1" }, { kind: "new_policy", name: "Open" }] }, api);
    expect(outcome.ok).toBe(false);
    expect(outcome.content).toMatch(/needs its `protocol`/);
    expect(addNodes).not.toHaveBeenCalled();
  });
});

describe("parsePorts", () => {
  it("keeps plain ports as strings", () => {
    expect(parsePorts(["443", 80, " 22 "])).toEqual({ ok: true, ports: ["443", "80", "22"] });
    expect(parsePorts("443, 8443")).toEqual({ ok: true, ports: ["443", "8443"] });
  });

  it("leaves an absent list absent and an empty one empty", () => {
    expect(parsePorts(undefined)).toEqual({ ok: true });
    expect(parsePorts([])).toEqual({ ok: true, ports: [] });
  });

  it("sends everything as ranges once one range is present", () => {
    expect(parsePorts(["8000-8100", "443", "22-22"])).toEqual({
      ok: true,
      ports: [],
      portRanges: [
        { start: 8000, end: 8100 },
        { start: 443, end: 443 },
        { start: 22, end: 22 },
      ],
    });
  });

  it.each([["0"], ["65536"], ["http"], ["443/tcp"], ["9000-8000"], ["1-70000"], ["-1"], ["4.5"], [null], [{}]])(
    "refuses %j and names it",
    (entry) => {
      const parsed = parsePorts(["443", entry]);
      expect(parsed.ok).toBe(false);
      expect(parsed.ok ? "" : parsed.error).toContain(JSON.stringify(entry));
    },
  );
});

describe("control_center tools validate before they reach the canvas", () => {
  it("refuses a new policy with a bad port, drawing nothing", async () => {
    const { api, addNodes } = fakeApi();
    const outcome = await addNode({ kind: "new_policy", protocol: "tcp", ports: ["https"] }, api);
    expect(outcome.ok).toBe(false);
    expect(outcome.content).toContain('"https"');
    expect(addNodes).not.toHaveBeenCalled();
  });

  it("refuses ports on a new policy whose protocol takes none", async () => {
    const { api, addNodes } = fakeApi();
    const outcome = await addNode({ kind: "new_policy", protocol: "icmp", ports: ["443"] }, api);
    expect(outcome.ok).toBe(false);
    expect(addNodes).not.toHaveBeenCalled();
  });

  it("hands a new policy's range to the canvas as a range", async () => {
    const { api, addNodes } = fakeApi();
    await addNode({ kind: "new_policy", protocol: "tcp", ports: ["8000-8100"] }, api);
    expect(addNodes.mock.calls[0][0][0]).toMatchObject({ ports: [], portRanges: [{ start: 8000, end: 8100 }] });
  });

  it("validates a policy edit's ports and protocol", async () => {
    const { api, step } = fakeApi();
    expect((await editPolicy({ node: "policy-1", ports: ["99999"] }, api)).ok).toBe(false);
    expect((await editPolicy({ node: "policy-1", protocol: "constructor" }, api)).ok).toBe(false);
    expect(step).not.toHaveBeenCalled();

    await editPolicy({ node: "policy-1", protocol: "tcp", ports: ["443", "8000-8100"] }, api);
    expect(step.mock.calls[0]).toMatchObject([
      { ports: [], portRanges: [{ start: 8000, end: 8100 }, { start: 443, end: 443 }] },
      false,
    ]);
  });

  it("passes an empty description through, so a policy's description can be cleared", async () => {
    const { api, step } = fakeApi();
    await editPolicy({ node: "policy-1", description: "" }, api);
    expect(step.mock.calls[0]).toMatchObject([{ description: "" }, false]);

    await editPolicy({ node: "policy-1", enabled: false }, api);
    expect(step.mock.calls[1]).toMatchObject([{ description: undefined }, false]);
  });

  it("caps a batch and tells the model to split it", async () => {
    const { api, addNodes, steps } = fakeApi();
    const items = Array.from({ length: MAX_BATCH + 1 }, () => ({ kind: "new_group" }));
    const added = await addNode({ items }, api);
    expect(added.ok).toBe(false);
    expect(added.content).toMatch(/at most 25 items/);
    expect(addNodes).not.toHaveBeenCalled();

    const links = Array.from({ length: MAX_BATCH + 1 }, () => ({ from: "a", to: "b" }));
    const connected = await connectNodes({ links }, api);
    expect(connected.ok).toBe(false);
    expect(steps).not.toHaveBeenCalled();

    expect((await addNode({ items: items.slice(0, MAX_BATCH) }, api)).ok).toBe(true);
  });

  it.each([["constructor"], ["toString"], ["deploy"], [""]])("refuses the unknown view or draft action %j", async (name) => {
    const { api, step } = fakeApi();
    const view = await gotoView({ view: name }, api);
    const draft = await createDraft({ action: name }, api);
    expect(view.ok).toBe(false);
    expect(draft.ok).toBe(false);
    expect(step).not.toHaveBeenCalled();
  });

  it("passes a known view and draft action through", async () => {
    const { api, step } = fakeApi();
    await gotoView({ view: "network", target: "n1" }, api);
    await createDraft({ action: "exit" }, api);
    expect(step.mock.calls).toEqual([[{ view: "network", target: "n1" }], ["exit"]]);
  });
});

describe("turn release", () => {
  it("moves the generation on exactly once, so a running batch can see its turn ended", () => {
    const release = beginAgentTurn();
    const during = agentTurnGeneration();
    release();
    release();
    expect(agentTurnGeneration()).toBe(during + 1);
  });

  it("drops the lock without halting when the watchdog fires, and Stop still halts afterwards", () => {
    vi.useFakeTimers();
    try {
      const release = beginAgentTurn();
      const during = agentTurnGeneration();
      const done = beginAgentActivity();
      done();
      vi.advanceTimersByTime(3 * 60 * 1000 + ACTIVITY_LINGER_MS + 1);
      expect(agentActivityStore.getSnapshot()).toBe(false);
      expect(agentTurnGeneration()).toBe(during);
      release();
      expect(agentTurnGeneration()).toBe(during + 1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("leaves a newer turn locked and running when a turn that was never released ends late", () => {
    vi.useFakeTimers();
    try {
      const stale = beginAgentTurn();
      const current = beginAgentTurn();
      const during = agentTurnGeneration();
      const done = beginAgentActivity();
      stale();
      expect(agentTurnGeneration()).toBe(during);
      done();
      vi.advanceTimersByTime(ACTIVITY_LINGER_MS + 1);
      expect(agentActivityStore.getSnapshot()).toBe(true);
      current();
      expect(agentTurnGeneration()).toBe(during + 1);
      vi.advanceTimersByTime(ACTIVITY_LINGER_MS + 1);
      expect(agentActivityStore.getSnapshot()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("leaves a newer turn running when an outlived turn is released late", () => {
    vi.useFakeTimers();
    try {
      const stale = beginAgentTurn();
      vi.advanceTimersByTime(3 * 60 * 1000 + 1);
      const current = beginAgentTurn();
      const during = agentTurnGeneration();
      stale();
      expect(agentTurnGeneration()).toBe(during);
      current();
      expect(agentTurnGeneration()).toBe(during + 1);
    } finally {
      vi.useRealTimers();
    }
  });
});
