import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ai = {
  settings: { endpoint: "calm-heron.proxy.company.com" },
  providers: [] as {
    providerId: string;
    models: { id: string; inputPer1k: number; outputPer1k: number }[];
  }[],
};

vi.mock("@/modules/agent-network/AIProvidersProvider", () => ({
  useAIProviders: () => ai,
}));
vi.mock("@utils/api", () => ({ default: () => ({ data: [] }) }));

const { OnboardingAgentConfigure } = await import(
  "@/modules/onboarding/agent-network/OnboardingAgentConfigure"
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
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("OnboardingAgentConfigure", () => {
  it("shows a request Anthropic answers when Anthropic is connected", () => {
    ai.providers = [
      {
        providerId: "anthropic_api",
        models: [{ id: "claude-sonnet-5", inputPer1k: 0, outputPer1k: 0 }],
      },
    ];
    render(<OnboardingAgentConfigure onBack={vi.fn()} onNext={vi.fn()} />);

    // Radix tabs switch on mouse down.
    fireEvent.mouseDown(screen.getByRole("tab", { name: "cURL" }), {
      button: 0,
    });
    const shown = screen.getByRole("tabpanel").textContent;
    expect(shown).toContain(
      "curl https://calm-heron.proxy.company.com/v1/messages",
    );
    expect(shown).toContain(`"model": "claude-sonnet-5"`);
    expect(shown, "no OpenAI request left behind").not.toContain("gpt-5.5");
  });
});
