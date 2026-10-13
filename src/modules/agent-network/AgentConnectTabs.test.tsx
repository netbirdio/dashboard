import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectProvider } from "@/modules/agent-network/AgentConnectTabs";

const writeText = vi.fn();

vi.mock("@components/Notification", () => ({ notify: vi.fn() }));
vi.mock("@utils/api", () => ({ default: () => ({ data: [] }) }));

const { AgentConnectTabs, fromAccountProviders, pickable } = await import(
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
const anthropic: ConnectProvider[] = [
  {
    name: "Claude",
    catalogId: "anthropic_api",
    api: "anthropic",
    models: ["claude-sonnet-5"],
  },
];

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

describe("fromAccountProviders", () => {
  it("asks Anthropic through its Messages API, everything else through Chat Completions", () => {
    expect(
      fromAccountProviders([
        {
          name: "Claude",
          providerId: "anthropic_api",
          models: [model("claude-sonnet-5")],
        },
        { name: "Kimi", providerId: "kimi_api", models: [model("kimi-k3")] },
      ]),
    ).toEqual([
      {
        name: "Claude",
        catalogId: "anthropic_api",
        api: "anthropic",
        models: ["claude-sonnet-5"],
      },
      {
        name: "Kimi",
        catalogId: "kimi_api",
        api: "openai",
        models: ["kimi-k3"],
      },
    ]);
  });
});

describe("pickable", () => {
  it("passes over Bedrock and Vertex, which route by path", () => {
    const p = (catalogId: string) => ({
      name: catalogId,
      catalogId,
      api: "openai" as const,
      models: [],
    });
    expect(
      pickable([p("bedrock_api"), p("vertex_ai_api"), p("openai_api")]),
    ).toEqual([p("openai_api")]);
  });
});

describe("AgentConnectTabs", () => {
  it("sends an Anthropic example to the Messages API", async () => {
    render(
      <AgentConnectTabs
        endpoint={ENDPOINT}
        defaultTab={"curl"}
        providers={anthropic}
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
        providers={anthropic}
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

  it("keeps the OpenAI default where no provider is pickable", async () => {
    render(<AgentConnectTabs endpoint={ENDPOINT} defaultTab={"curl"} />);

    expect(screen.getByRole("tab", { name: "OpenAI SDK" })).toBeTruthy();
    expect(await copied()).toBe(
      `curl https://${ENDPOINT}/v1/chat/completions -H "Content-Type: application/json" -d '{"model":"gpt-5.5","messages":[{"role":"user","content":"Say hello in one word."}]}'`,
    );
  });

  it("points OpenCode at the endpoint with the picked model", () => {
    render(
      <AgentConnectTabs
        endpoint={ENDPOINT}
        defaultTab={"opencode"}
        providers={anthropic}
      />,
    );

    expect(shownLines()).toEqual(
      expect.arrayContaining([
        `      "npm": "@ai-sdk/anthropic",`,
        `        "baseURL": "https://${ENDPOINT}/v1",`,
        `  "model": "netbird/claude-sonnet-5"`,
      ]),
    );
  });

  it("writes pi's models and settings for the OpenAI shape", () => {
    render(<AgentConnectTabs endpoint={ENDPOINT} defaultTab={"pi"} />);

    expect(shownLines()).toEqual(
      expect.arrayContaining([
        `      "baseUrl": "https://${ENDPOINT}/v1",`,
        `      "api": "openai-completions",`,
        `          "id": "gpt-5.5"`,
        `  "defaultProvider": "netbird",`,
        `  "defaultModel": "gpt-5.5"`,
      ]),
    );
  });

  it("takes a typed model for a provider that lists none", async () => {
    render(
      <AgentConnectTabs
        endpoint={ENDPOINT}
        defaultTab={"codex"}
        providers={[
          {
            name: "LiteLLM",
            catalogId: "litellm_proxy",
            api: "openai",
            models: [],
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Model" }), {
      target: { value: "my-model" },
    });

    expect(shownLines()[0]).toBe(`model = "my-model"`);
  });

  it("starts on the first pickable provider's first model", async () => {
    render(
      <AgentConnectTabs
        endpoint={ENDPOINT}
        defaultTab={"pi"}
        providers={[
          {
            name: "Bedrock",
            catalogId: "bedrock_api",
            api: "anthropic",
            models: ["anthropic.claude"],
          },
          {
            name: "OpenAI",
            catalogId: "openai_api",
            api: "openai",
            models: ["gpt-4o", "gpt-4o-mini"],
          },
        ]}
      />,
    );

    expect(shownLines()).toContain(`  "defaultModel": "gpt-4o"`);
  });
});
