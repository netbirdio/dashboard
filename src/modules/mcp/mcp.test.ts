import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchMcpStatus,
  parseStepText,
  resolveMcpStatus,
} from "@/modules/mcp/mcp";

describe("resolveMcpStatus", () => {
  it("is always enabled on cloud, whatever a probe would say", () => {
    expect(resolveMcpStatus(true, "disabled")).toBe("enabled");
    expect(resolveMcpStatus(true, undefined)).toBe("enabled");
  });

  it("follows the probe when self-hosted", () => {
    expect(resolveMcpStatus(false, "disabled")).toBe("disabled");
    expect(resolveMcpStatus(false, "token-only")).toBe("token-only");
  });

  it("stays enabled on self-hosted while the probe is still running", () => {
    expect(resolveMcpStatus(false, undefined)).toBe("enabled");
  });
});

describe("parseStepText", () => {
  it("splits marks and links out of the surrounding text, in order", () => {
    expect(
      parseStepText(
        "Open [the site](https://example.com), click `New` and wait",
      ),
    ).toEqual([
      { type: "text", value: "Open " },
      { type: "link", value: "the site", href: "https://example.com" },
      { type: "text", value: ", click " },
      { type: "mark", value: "New" },
      { type: "text", value: " and wait" },
    ]);
  });

  it("tells a copyable mark from a plain one", () => {
    expect(parseStepText("Name it ``NetBird`` in `Settings`")).toEqual([
      { type: "text", value: "Name it " },
      { type: "copy", value: "NetBird" },
      { type: "text", value: " in " },
      { type: "mark", value: "Settings" },
    ]);
  });

  it("returns plain text as a single part", () => {
    expect(parseStepText("Sign in")).toEqual([
      { type: "text", value: "Sign in" },
    ]);
  });

  it("leaves an unclosed backtick as text", () => {
    expect(parseStepText("Path is `open")).toEqual([
      { type: "text", value: "Path is `open" },
    ]);
  });
});

describe("fetchMcpStatus", () => {
  afterEach(() => vi.unstubAllGlobals());

  const url = "https://nb.test/api/mcp";
  type Answer = { status: number; headers?: Record<string, string> } | "fail";
  const reply = (answer: Answer) =>
    answer === "fail"
      ? Promise.reject(new TypeError("blocked"))
      : Promise.resolve({
          ok: answer.status >= 200 && answer.status < 300,
          status: answer.status,
          headers: new Headers(answer.headers),
        });
  // The first request is the OAuth metadata document, the second the MCP endpoint.
  const respond = (metadata: Answer, endpoint: Answer) =>
    vi.stubGlobal(
      "fetch",
      vi.fn((_: string, init?: RequestInit) =>
        reply(init?.method === "POST" ? endpoint : metadata),
      ),
    );

  it("is enabled when the OAuth metadata is served, without asking the endpoint", async () => {
    respond({ status: 200 }, "fail");
    await expect(fetchMcpStatus(url, true)).resolves.toBe("enabled");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("is enabled when the metadata is unreadable but the endpoint sends an OAuth challenge", async () => {
    respond("fail", {
      status: 401,
      headers: { "WWW-Authenticate": 'Bearer resource_metadata="x"' },
    });
    await expect(fetchMcpStatus(url, true)).resolves.toBe("enabled");
  });

  it("is token-only when there is no metadata and the endpoint sends no challenge", async () => {
    respond({ status: 404 }, { status: 401 });
    await expect(fetchMcpStatus(url, false)).resolves.toBe("token-only");
  });

  it("is disabled when the endpoint answers 404", async () => {
    respond({ status: 404 }, { status: 404 });
    await expect(fetchMcpStatus(url, false)).resolves.toBe("disabled");
  });

  it("reads a blocked endpoint as disabled on another origin, where the 404 has no CORS headers", async () => {
    respond("fail", "fail");
    await expect(fetchMcpStatus(url, true)).resolves.toBe("disabled");
  });

  it("does not call a network failure on the same origin disabled", async () => {
    respond("fail", "fail");
    await expect(fetchMcpStatus(url, false)).rejects.toThrow();
  });
});
