import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const writeText = vi.fn();

vi.mock("@components/Notification", () => ({ notify: vi.fn() }));
vi.mock("@utils/api", () => ({ default: () => ({ data: [] }) }));

const { AgentConnectTabs, connectExample } = await import(
  "@/modules/agent-network/AgentConnectTabs"
);

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ENDPOINT = "calm-heron.proxy.company.com";
const anthropic = { api: "anthropic", model: "claude-sonnet-5" } as const;

// shownLines reads the snippet as displayed, one string per line.
const shownLines = () =>
  Array.from(document.querySelectorAll("code > *")).map((l) => l.textContent);

// copied clicks the snippet's copy button and returns what it copied.
const copied = async () => {
  await act(async () => {
    fireEvent.click(screen.getByTestId("copy-to-clipboard"));
  });
  return writeText.mock.calls[0]?.[0];
};

const model = (id: string) => ({ id, inputPer1k: 0, outputPer1k: 0 });

describe("connectExample", () => {
  it("asks Anthropic through its Messages API, with the provider's model", () => {
    expect(
      connectExample([
        { providerId: "anthropic_api", models: [model("claude-sonnet-5")] },
      ]),
    ).toEqual({ api: "anthropic", model: "claude-sonnet-5" });
  });

  it("asks everything else through Chat Completions", () => {
    expect(
      connectExample([{ providerId: "kimi_api", models: [model("kimi-k3")] }]),
    ).toEqual({ api: "openai", model: "kimi-k3" });
    expect(
      connectExample([{ providerId: "litellm_proxy", models: [] }]),
      "a provider that names no model gets the shape's default",
    ).toEqual({ api: "openai", model: "gpt-5.5" });
  });

  it("passes over Bedrock and Vertex, which route by path", () => {
    expect(
      connectExample([{ providerId: "bedrock_api", models: [] }]),
    ).toBeUndefined();
    expect(
      connectExample([
        { providerId: "vertex_ai_api", models: [model("claude-opus-5")] },
        { providerId: "anthropic_api", models: [] },
      ]),
    ).toEqual({ api: "anthropic", model: "claude-opus-5" });
  });
});

describe("AgentConnectTabs", () => {
  it("sends an Anthropic example to the Messages API", async () => {
    render(
      <AgentConnectTabs
        endpoint={ENDPOINT}
        defaultTab={"curl"}
        example={anthropic}
      />,
    );

    expect(shownLines()).toEqual([
      `curl https://${ENDPOINT}/v1/messages \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -H "anthropic-version: 2023-06-01" \\`,
      `  -d '{`,
      `    "model": "claude-sonnet-5",`,
      `    "max_tokens": 32,`,
      `    "messages": [`,
      `      { "role": "user", "content": "Say hello in one word." }`,
      `    ]`,
      `  }'`,
    ]);
    expect(await copied(), "the same request on one line").toBe(
      `curl https://${ENDPOINT}/v1/messages -H "Content-Type: application/json" -H "anthropic-version: 2023-06-01" -d '{"model":"claude-sonnet-5","max_tokens":32,"messages":[{"role":"user","content":"Say hello in one word."}]}'`,
    );
  });

  it("offers the Anthropic SDK for an Anthropic example", () => {
    render(
      <AgentConnectTabs
        endpoint={ENDPOINT}
        defaultTab={"sdk"}
        example={anthropic}
      />,
    );

    expect(screen.getByRole("tab", { name: "Anthropic SDK" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "OpenAI SDK" })).toBeNull();
    expect(shownLines()).toEqual(
      expect.arrayContaining([
        `from anthropic import Anthropic`,
        `    base_url="https://${ENDPOINT}",`,
        `client.messages.create(`,
        `    model="claude-sonnet-5",`,
        `    max_tokens=32,`,
      ]),
    );
  });

  it("keeps the OpenAI example where none is given", async () => {
    render(<AgentConnectTabs endpoint={ENDPOINT} defaultTab={"curl"} />);

    expect(screen.getByRole("tab", { name: "OpenAI SDK" })).toBeTruthy();
    expect(await copied()).toBe(
      `curl https://${ENDPOINT}/v1/chat/completions -H "Content-Type: application/json" -d '{"model":"gpt-5.5","messages":[{"role":"user","content":"Say hello in one word."}]}'`,
    );
  });
});
