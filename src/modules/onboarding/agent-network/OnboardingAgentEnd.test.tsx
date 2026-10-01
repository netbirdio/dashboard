import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { APIAgentNetworkAccessLog } from "@/modules/agent-network/agentAccessLogApi";

let logs: APIAgentNetworkAccessLog[] = [];
const mutate = vi.fn();
const reads: { url: string; revalidate: boolean }[] = [];

vi.mock("@utils/api", () => ({
  default: (url: string, _ignoreError: boolean, revalidate: boolean) => {
    reads.push({ url, revalidate });
    return { data: { data: logs }, mutate };
  },
}));

const { OnboardingAgentEnd } = await import(
  "@/modules/onboarding/agent-network/OnboardingAgentEnd"
);

const NOW = new Date("2026-10-01T12:00:00Z");

const entry = (
  overrides: Partial<APIAgentNetworkAccessLog> = {},
): APIAgentNetworkAccessLog => ({
  id: "log1",
  service_id: "svc1",
  timestamp: "2026-10-01T11:59:30Z",
  status_code: 200,
  duration_ms: 420,
  input_tokens: 234,
  output_tokens: 1000,
  total_tokens: 1234,
  cost_usd: 0.01,
  model: "claude-sonnet-5",
  decision: "allow",
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  logs = [];
  mutate.mockReset();
  reads.length = 0;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// renderEnd renders the step; the returned rerender renders it again from a
// new element, so React does not skip it.
const renderEnd = () => {
  const props = { onBack: vi.fn(), onFinish: vi.fn() };
  const element = () => (
    <OnboardingAgentEnd deviceName={"maya-laptop"} {...props} />
  );
  const view = render(element());
  return { ...props, rerender: () => view.rerender(element()) };
};

const buttons = () =>
  screen.getAllByRole("button").map((b) => b.textContent?.trim());

// waitPolls lets the step's timer run for the given time.
const waitPolls = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("OnboardingAgentEnd", () => {
  it("asks for a test request from the device and waits for it", () => {
    const { onBack, onFinish } = renderEnd();

    expect(screen.getByRole("heading").textContent).toBe("Send a test request");
    expect(screen.getByText("maya-laptop")).toBeTruthy();
    expect(screen.getByText("Waiting for your first request")).toBeTruthy();
    expect(buttons(), "back to the config, or skip the test").toEqual([
      "Go Back",
      "Skip",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Go Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("reads the newest request since shortly before the step opened, every few seconds", () => {
    const { rerender } = renderEnd();

    const url = new URL(reads[0].url, "https://api.example");
    expect(url.pathname).toBe("/agent-network/access-logs");
    expect(url.searchParams.get("page_size")).toBe("1");
    expect(
      url.searchParams.get("start_date"),
      "a request sent from the previous step still counts",
    ).toBe("2026-10-01T11:45:00.000Z");
    expect(reads[0].revalidate, "the timer drives the reads").toBe(false);

    waitPolls(3000);
    expect(mutate).toHaveBeenCalledTimes(1);
    waitPolls(3000);
    expect(mutate).toHaveBeenCalledTimes(2);
    rerender();
    expect(
      new Set(reads.map((r) => r.url)).size,
      "the window does not move with each render",
    ).toBe(1);
  });

  it("finishes once a request passes, and stops watching", () => {
    logs = [entry()];
    const { onFinish } = renderEnd();

    expect(screen.getByRole("heading").textContent).toBe("You're all set!");
    expect(screen.getByTestId("agent-network-test-passed").textContent).toBe(
      "Your request, for claude-sonnet-5, came back with status 200 and used 1,234 tokens.",
    );
    expect(buttons()).toEqual(["Go Back", "Go to Access Logs"]);

    fireEvent.click(screen.getByRole("button", { name: "Go to Access Logs" }));
    expect(onFinish).toHaveBeenCalledTimes(1);

    waitPolls(10_000);
    expect(mutate, "a passed request stays on screen").not.toHaveBeenCalled();
  });

  it("reports a denied request and keeps watching", () => {
    logs = [
      entry({
        decision: "deny",
        deny_reason: "model_not_routable",
        model: "gpt-4",
        status_code: 403,
      }),
    ];
    renderEnd();

    expect(screen.getByTestId("agent-network-test-denied").textContent).toBe(
      "Your last request, for gpt-4, was denied: Model not available.",
    );
    expect(screen.getByText("Waiting for your next request")).toBeTruthy();
    expect(buttons()).toEqual(["Go Back", "Skip"]);

    waitPolls(3000);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("reports a request the provider answered with an error and keeps watching", () => {
    logs = [entry({ status_code: 401, total_tokens: 0 })];
    renderEnd();

    expect(screen.getByTestId("agent-network-test-failed").textContent).toBe(
      "Your last request, for claude-sonnet-5, reached the provider and came back with status 401.",
    );
    expect(screen.getByRole("heading").textContent).toBe("Send a test request");

    waitPolls(3000);
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});
