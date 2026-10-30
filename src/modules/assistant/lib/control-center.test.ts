import { describe, expect, it, vi } from "vitest";
import type { AgentAddItem, CanvasAgentApi } from "./canvas";
import { addNode } from "./control-center";

const fakeApi = () => {
  const addNodes = vi.fn(async (items: AgentAddItem[]) => items.map(() => ({ ok: true, detail: "Added." })));
  const api = {
    addNodes,
    drainNotices: () => [],
    getSnapshot: () => ({ mode: "draft", view: "peers", nodes: [], edges: [], changes: [] }),
  } as unknown as CanvasAgentApi;
  return { api, addNodes };
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
