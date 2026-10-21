import { describe, expect, it } from "vitest";
import {
  BROWSER_TOOLS,
  CONTROL_CENTER_TOOLS,
  READ_TOOLS,
  TOOL_MANIFEST,
} from "@/modules/assistant";
import { pageRedirect } from "@/modules/assistant/lib/page-redirect";

// What the dashboard registers via the provider's extraExecutors.
const LOCAL_EXECUTORS: Record<string, unknown> = {
  dashboard_page_redirect: pageRedirect,
};

describe("the browser tools and their executors", () => {
  it("covers every browser tool in the manifest", () => {
    // The SDK runs the account reads itself, through the provider's fetchManagement.
    const unfulfilled = BROWSER_TOOLS.filter(
      (name) =>
        !(name in CONTROL_CENTER_TOOLS) &&
        !READ_TOOLS.includes(name) &&
        !(name in LOCAL_EXECUTORS),
    );
    expect(
      unfulfilled,
      `browser tools with no executor (SDK CONTROL_CENTER_TOOLS, READ_TOOLS or extraExecutors): ${unfulfilled.join(
        ", ",
      )}`,
    ).toEqual([]);
  });

  it("registers no executor for a tool the manifest doesn't dispatch to the browser", () => {
    for (const name of Object.keys(LOCAL_EXECUTORS)) {
      expect(TOOL_MANIFEST[name]?.kind, name).toBe("browser");
    }
  });

  it("keeps every control_center_* tool an SDK executor", () => {
    const canvasTools = BROWSER_TOOLS.filter((name) =>
      name.startsWith("control_center_"),
    );
    expect(canvasTools.length).toBeGreaterThan(0);
    for (const name of canvasTools) {
      expect(CONTROL_CENTER_TOOLS[name], name).toBeDefined();
    }
  });
});
