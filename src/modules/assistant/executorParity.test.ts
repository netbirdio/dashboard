import {
  CLIENT_TOOLS,
  CONTROL_CENTER_TOOLS,
  TOOL_MANIFEST,
} from "@netbird/assistant-react";
import { describe, expect, it } from "vitest";
import { openPageExecutor } from "@/modules/assistant/openPageExecutor";

// Fulfilled inside the SDK's client-tool loop (useClientToolLoop), which
// exports no list to assert against.
const SDK_BUILTIN = new Set(["ask_user"]);

// What the dashboard registers via the provider's extraExecutors.
const LOCAL_EXECUTORS: Record<string, unknown> = {
  dashboard_page_redirect: openPageExecutor,
};

describe("client tool executors", () => {
  it("covers every client tool in the manifest", () => {
    const unfulfilled = CLIENT_TOOLS.filter(
      (name) =>
        !(name in CONTROL_CENTER_TOOLS) &&
        !SDK_BUILTIN.has(name) &&
        !(name in LOCAL_EXECUTORS),
    );
    expect(
      unfulfilled,
      `client tools with no executor (SDK CONTROL_CENTER_TOOLS, SDK built-ins, or extraExecutors): ${unfulfilled.join(", ")}`,
    ).toEqual([]);
  });

  it("registers no executor for a tool the manifest doesn't dispatch to the client", () => {
    const names = [...Object.keys(LOCAL_EXECUTORS), ...SDK_BUILTIN];
    for (const name of names) {
      expect(TOOL_MANIFEST[name]?.kind, name).toBe("client");
    }
  });

  it("keeps every control_center_* tool an SDK executor", () => {
    const canvasTools = CLIENT_TOOLS.filter((name) =>
      name.startsWith("control_center_"),
    );
    expect(canvasTools.length).toBeGreaterThan(0);
    for (const name of canvasTools) {
      expect(CONTROL_CENTER_TOOLS[name], name).toBeDefined();
    }
  });
});
